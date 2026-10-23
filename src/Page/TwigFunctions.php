<?php

namespace TheStartLabs\InlineEdit\Page;

use TheStartLabs\InlineEdit\Access;
use TheStartLabs\InlineEdit\Rows\HiddenRows;

/**
 * The Twig functions templates use to mark what's editable. Each prints a data attribute for users
 * who can edit that thing, and nothing for anyone else.
 *
 * `editable(post, field)` marks one field's element, which must contain only that field's output (or
 * be the <img> of an image field):
 *
 *   <h1 {{ editable(post, 'title') }}>{{ post.title }}</h1>
 *   <div {{ editable(post, field_prefix ~ 'content') }}>{{ block.content }}</div>
 *   <span {{ editable('options', 'company_details_phone') }}>{{ options.company_details.phone }}</span>
 *
 * `editable_rows(post, field, template)` marks the element holding a flexible content or repeater
 * field's rows. Every direct child must be one row, in order, rendered by `template`, which gets
 * `row` (also as `block`), `field_prefix` and `post`. The editor renders the same template to show a
 * new row before it's saved; without one, rows can be moved, duplicated and deleted but not added.
 *
 *   <div {{ editable_rows(post, 'page_builder', 'partials/block.twig') }}>
 *     {% for row in post.meta('page_builder') %}
 *       {% include 'partials/block.twig' with { row, field_prefix: 'page_builder_' ~ loop.index0 ~ '_' } %}
 *     {% endfor %}
 *   </div>
 */
final class TwigFunctions
{
	public function __construct(
		private Access $access,
		private Registry $registry,
	) {}

	public function register(array $functions): array
	{
		foreach (['editable' => 'editable', 'editable_rows' => 'editableRows'] as $name => $method) {
			$functions[$name] = [
				'callable' => [$this, $method],
				'options' => ['is_safe' => ['html']],
			];
		}
		$functions['rows_of'] = ['callable' => [$this, 'rowsOf']];

		return $functions;
	}

	/**
	 * A flexible content field's rows to loop over, each as `{ row, prefix }`: the row's values, and
	 * the prefix of its fields' names (`page_builder_2_`).
	 *
	 * Use this rather than counting with `loop.index0`: hidden blocks aren't in the
	 * loop but still have their place, so counting would give the rows after one the wrong names.
	 *
	 *   {% for item in rows_of(post, 'page_builder') %}
	 *     {% include 'partials/block.twig' with { row: item.row, field_prefix: item.prefix } %}
	 *   {% endfor %}
	 */
	public function rowsOf(mixed $target, string $field): array
	{
		$post_id = is_object($target) && isset($target->ID) ? (int) $target->ID : (int) $target;
		$rows = $post_id && function_exists('get_field') ? get_field($field, $post_id) : null;
		if (!is_array($rows)) {
			return [];
		}

		$rows = array_values($rows);
		$stored = acf_get_metadata($post_id, $field);
		$count = is_array($stored) ? count($stored) : count($rows);
		$hidden = HiddenRows::indexes($post_id, $field);

		// Skip hidden rows' places only when they really were left out: if hiding isn't on (ACF
		// Extended switched off, or its toggle removed from the field), flagged rows still show.
		$shown = count($rows) === $count - count($hidden) ? array_values(array_diff(range(0, $count - 1), $hidden)) : array_keys($rows);

		return array_map(fn($row, $i) => ['row' => $row, 'prefix' => "{$field}_{$shown[$i]}_"], $rows, array_keys($rows));
	}

	public function editable(mixed $target, mixed $field): string
	{
		if (!$this->access->enabled() || !is_string($field) || $field === '') {
			return '';
		}

		$index = $this->registry->field($target, $field);

		return $index === null ? '' : sprintf('data-sd-edit="%d"', $index);
	}

	public function editableRows(mixed $target, mixed $field, mixed $template = ''): string
	{
		if (!$this->access->enabled() || !is_string($field) || $field === '') {
			return '';
		}

		$index = $this->registry->list($target, $field, is_string($template) ? $template : '');

		return $index === null ? '' : sprintf('data-sd-rows="%d"', $index);
	}
}
