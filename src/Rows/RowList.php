<?php

namespace TheStartLabs\InlineEdit\Rows;

use TheStartLabs\InlineEdit\Fingerprint;
use TheStartLabs\InlineEdit\Versioned;
use WP_Error;

/**
 * A flexible content or repeater field's rows on a post: their structure, and changing it.
 */
final class RowList implements Versioned
{
	public function __construct(
		public readonly int $postId,
		public readonly string $name,
		public readonly array $acf,
		private RowFactory $rows,
	) {}

	public function isFlexible(): bool
	{
		return $this->acf['type'] === 'flexible_content';
	}

	/**
	 * The stored structure: layout names for flexible content, one empty entry per row for a repeater.
	 * Only adding, removing or reordering rows changes it, so it's the list's change detection.
	 */
	public function structure(): array
	{
		$meta = acf_get_metadata($this->postId, $this->name);

		if ($this->isFlexible()) {
			return is_array($meta) ? array_values(array_map('strval', $meta)) : [];
		}

		return array_fill(0, max(0, (int) $meta), '');
	}

	public function fingerprint(): string
	{
		return Fingerprint::of($this->structure());
	}

	/**
	 * Everything the editor script needs about this list. `$template` renders one row, for previews.
	 */
	public function describe(string $template, string $signature): array
	{
		$layouts = array_map(
			fn($layout) => [
				'name' => $layout['name'],
				'label' => $layout['label'],
				'max' => (int) ($layout['max'] ?? 0),
				'thumbnail' => LayoutThumbnails::url($layout, $this->acf),
				'fields' => $this->summary($layout['sub_fields'] ?? []),
			],
			$this->isFlexible() ? array_values($this->acf['layouts']) : [],
		);

		return [
			'post' => (string) $this->postId,
			'field' => $this->name,
			'key' => $this->acf['key'],
			'kind' => $this->isFlexible() ? 'flexible' : 'repeater',
			'label' => $this->acf['label'],
			'item' => $this->itemName(),
			'layouts' => $layouts,
			// A repeater's rows all have the same fields.
			'fields' => $this->isFlexible() ? [] : $this->summary($this->acf['sub_fields'] ?? []),
			'rows' => $this->structure(),
			// Hidden blocks (see HiddenRows) aren't on the page, so the editor knows where they go.
			'hidden' => HiddenRows::of($this),
			'canHide' => HiddenRows::supported($this->acf),
			'min' => (int) ($this->acf['min'] ?? 0),
			'max' => (int) ($this->acf['max'] ?? 0),
			'base' => $this->fingerprint(),
			'template' => $template,
			'signature' => $signature,
		];
	}

	/**
	 * Each sub field's label and type, so the editor knows what a row holds.
	 */
	private function summary(array $sub_fields): array
	{
		return array_map(fn($sub) => ['label' => $sub['label'], 'type' => $sub['type']], $sub_fields);
	}

	/**
	 * What one row is called: "Add Card" names one a "Card". Without a button label, "Block" for
	 * flexible content and the field's label for a repeater.
	 */
	private function itemName(): string
	{
		$item = trim(preg_replace('/^add\s+(an?\s+)?/i', '', (string) ($this->acf['button_label'] ?? '')));
		if ($item !== '') {
			return $item;
		}

		return $this->isFlexible() ? __('Block') : (string) $this->acf['label'];
	}

	/**
	 * Write a new order of rows. Each entry is ['from' => index of an existing row],
	 * ['layout' => layout of a new row] ('' for a repeater) or ['copy' => a row's raw values], and
	 * can say whether it's `hidden` (an existing row keeps its own setting unless it says).
	 */
	public function reorder(array $order): true|WP_Error
	{
		// Hidden rows included, or they'd be dropped (see HiddenRows).
		$current = HiddenRows::including(fn() => acf_get_value($this->postId, $this->acf));
		$current = is_array($current) ? array_values($current) : [];
		$wasHidden = HiddenRows::of($this);

		$rows = [];
		foreach ($order as $item) {
			$row = $this->row($item, $current);
			if (is_wp_error($row)) {
				return $row;
			}
			$rows[] = $row;
		}

		$limits = $this->checkLimits($rows, $current);
		if (is_wp_error($limits)) {
			return $limits;
		}

		$hidden = $this->hiddenPositions($order, $wasHidden);
		acf_update_value(HiddenRows::prepare($this, $rows, $hidden, $order), $this->postId, $this->acf);
		HiddenRows::write($this, $rows, $hidden);

		return true;
	}

	/**
	 * The new positions of rows that should be hidden.
	 */
	private function hiddenPositions(array $order, array $wasHidden): array
	{
		$hidden = [];
		foreach (array_values($order) as $i => $item) {
			$keep = isset($item['from']) && in_array($item['from'], $wasHidden, true);
			if ($item['hidden'] ?? $keep) {
				$hidden[] = $i;
			}
		}

		return $hidden;
	}

	private function row(array $item, array $current): array|WP_Error
	{
		if (isset($item['copy'])) {
			return $item['copy'];
		}
		if (isset($item['from']) === isset($item['layout'])) {
			return $this->invalid(__('These blocks can’t be changed here.'));
		}

		if (isset($item['layout'])) {
			return $this->rows->create($this->acf, $item['layout']);
		}

		return $current[$item['from']] ?? $this->invalid(__('A block no longer exists. Reload to see the latest version.'));
	}

	/**
	 * The field's min and max, and each layout's max. Only checked when a change moves further past
	 * a limit, so a list that's already over one can still be tidied up.
	 */
	private function checkLimits(array $rows, array $current): true|WP_Error
	{
		$count = count($rows);
		$min = (int) ($this->acf['min'] ?? 0);
		$max = (int) ($this->acf['max'] ?? 0);

		if ($min && $count < $min && $count < count($current)) {
			/* translators: 1: field label, 2: minimum number of rows */
			return $this->invalid(sprintf(__('%1$s needs at least %2$d.'), $this->acf['label'], $min));
		}
		if ($max && $count > $max && $count > count($current)) {
			/* translators: 1: field label, 2: maximum number of rows */
			return $this->invalid(sprintf(__('%1$s can have at most %2$d.'), $this->acf['label'], $max));
		}

		if ($this->isFlexible()) {
			$after = array_count_values(array_column($rows, 'acf_fc_layout'));
			$before = array_count_values(array_column($current, 'acf_fc_layout'));
			foreach ($this->acf['layouts'] as $layout) {
				$limit = (int) ($layout['max'] ?? 0);
				$used = $after[$layout['name']] ?? 0;
				if ($limit && $used > $limit && $used > ($before[$layout['name']] ?? 0)) {
					/* translators: 1: maximum number, 2: block name */
					return $this->invalid(sprintf(__('A page can have at most %1$d %2$s.'), $limit, $layout['label']));
				}
			}
		}

		return true;
	}

	private function invalid(string $message): WP_Error
	{
		return new WP_Error('sd_inline_edit_invalid', $message, ['status' => 400]);
	}
}
