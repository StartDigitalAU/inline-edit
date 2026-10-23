<?php

namespace TheStartLabs\InlineEdit\Rest;

use TheStartLabs\InlineEdit\Access;
use TheStartLabs\InlineEdit\Fields\FieldTree;
use TheStartLabs\InlineEdit\Fields\Resolver;
use TheStartLabs\InlineEdit\Fields\Sanitizer;
use TheStartLabs\InlineEdit\Fields\VirtualRows;
use TheStartLabs\InlineEdit\Page\Registry;
use TheStartLabs\InlineEdit\Rows\RowFactory;
use TheStartLabs\InlineEdit\Rows\RowSource;
use TheStartLabs\InlineEdit\Rows\TemplateSigner;
use Timber\Timber;
use WP_Error;
use WP_REST_Request;

/**
 * Renders one row with its list's row template, so the editor can show it on the page without
 * saving: a new row, or an existing one with changed settings (`values`). The row's fields come back
 * editable, named as the editor knows them.
 */
final class PreviewController
{
	public function __construct(
		private Resolver $resolver,
		private VirtualRows $virtual,
		private RowFactory $rows,
		private TemplateSigner $signer,
		private Registry $registry,
		private Access $access,
		private RowSource $sources,
	) {}

	public function handle(WP_REST_Request $request): mixed
	{
		if (!class_exists(Timber::class) || !$this->signer->verify($request['key'], $request['template'], $request['signature'])) {
			return new WP_Error('sd_inline_edit_invalid', __('That block can’t be shown here.'), ['status' => 400]);
		}

		$row = RowRequest::from($request, $this->resolver, $this->rows, $this->virtual, $this->sources);
		$raw = is_wp_error($row) ? $row : $row->rawValues($this->rows);
		if (is_wp_error($raw)) {
			$this->virtual->clear();

			return $raw;
		}

		$raw = $this->withSettings($row, $raw, (array) $request['values']);
		$values = $this->rows->format($row->list, $row->layout, $raw, $row->prefix, $row->post->ID);
		$html = $this->render($request['template'], [
			'post' => Timber::get_post($row->post->ID),
			'row' => $values,
			'block' => $values,
			'field_prefix' => $row->prefix,
			'index' => (int) $request['index'],
		]);

		// Before the virtual rows go: a pasted row's fields are found through them.
		$response = [
			'html' => $html,
			'regions' => $this->fromCopy($row, $this->registry->fields(), fn($field) => $field->describe()),
			'lists' => $this->listsFromCopy($row, $this->registry->lists()),
		];
		$this->virtual->clear();

		if (trim($html) === '') {
			return new WP_Error('sd_inline_edit_preview', __('This block couldn’t be shown.'), ['status' => 500]);
		}

		return rest_ensure_response($response);
	}

	/**
	 * A pasted row's fields hold the copied block's values until it's saved, rather than what's
	 * stored under their (temporary) names, which is nothing.
	 */
	private function fromCopy(RowRequest $row, array $regions, callable $describe): array
	{
		if (!$row->isCopy()) {
			return $regions;
		}

		return array_map(function ($region) use ($row, $describe) {
			if (!str_starts_with($region['field'], $row->prefix)) {
				return $region;
			}
			$field = $this->resolver->field($row->post->ID, $region['field']);

			return is_wp_error($field)
				? $region
				: $describe($field->withRaw($row->copied(substr($region['field'], strlen($row->prefix)))));
		}, $regions);
	}

	/**
	 * A pasted row's lists (its cards, say) have the copied block's rows.
	 */
	private function listsFromCopy(RowRequest $row, array $lists): array
	{
		if (!$row->isCopy()) {
			return $lists;
		}

		return array_map(function ($list) use ($row) {
			$rows = str_starts_with($list['field'], $row->prefix) ? $row->copied(substr($list['field'], strlen($row->prefix))) : null;
			if (is_array($rows)) {
				$list['rows'] = array_map(fn($item) => is_array($item) ? (string) ($item['acf_fc_layout'] ?? '') : '', array_values($rows));
			}

			return $list;
		}, $lists);
	}

	/**
	 * Settings changed in the editor but not saved yet, cleaned as they would be on save.
	 */
	private function withSettings(RowRequest $row, array $raw, array $values): array
	{
		foreach ($values as $name => $value) {
			$path = is_string($value) ? FieldTree::path($row->fields, (string) $name) : null;
			$field = $path ? $this->resolver->field($row->post->ID, $row->prefix . $name, Resolver::SETTING_TYPES) : null;
			$value = $field && !is_wp_error($field) ? Sanitizer::clean($field, $value) : null;
			if ($value !== null && !is_wp_error($value)) {
				$raw = $this->setAt($raw, $path, $value);
			}
		}

		return $raw;
	}

	/**
	 * Put a value at a path of field keys (into a group's values, for a field in a group).
	 */
	private function setAt(array $raw, array $path, mixed $value): array
	{
		$key = array_shift($path);
		$raw[$key] = $path ? $this->setAt(is_array($raw[$key] ?? null) ? $raw[$key] : [], $path, $value) : $value;

		return $raw;
	}

	/**
	 * Render with editing on, collecting only the fields and lists this template prints.
	 */
	private function render(string $template, array $context): string
	{
		$this->registry->reset();

		return (string) $this->access->previewing(fn() => Timber::compile($template, $context));
	}
}
