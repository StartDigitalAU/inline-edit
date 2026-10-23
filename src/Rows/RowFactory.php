<?php

namespace TheStartLabs\InlineEdit\Rows;

use WP_Error;

/**
 * Builds new rows for flexible content and repeater fields.
 */
final class RowFactory
{
	/**
	 * A row's sub fields: a flexible content layout's, or a repeater's.
	 */
	public function fields(array $list, string $layout): array|WP_Error
	{
		if ($list['type'] !== 'flexible_content') {
			return $list['sub_fields'] ?? [];
		}

		foreach ($list['layouts'] as $candidate) {
			if ($candidate['name'] === $layout) {
				return $candidate['sub_fields'] ?? [];
			}
		}

		return new WP_Error('sd_inline_edit_invalid', __('That block type doesn’t exist.'), ['status' => 400]);
	}

	/**
	 * A new row in ACF's raw format (values by field key), with every sub field set so ACF writes each
	 * one's reference and the row's fields can be found by name once it's saved.
	 */
	public function create(array $list, string $layout): array|WP_Error
	{
		$fields = $this->fields($list, $layout);
		if (is_wp_error($fields)) {
			return $fields;
		}

		$row = $list['type'] === 'flexible_content' ? ['acf_fc_layout' => $layout] : [];
		foreach ($fields as $sub) {
			$row[$sub['key']] = $this->emptyValue($sub);
		}

		return $row;
	}

	/**
	 * A row as templates see it: values by field name, formatted as ACF would, from raw values by key.
	 */
	public function format(array $list, string $layout, array $raw, string $prefix, int $post_id): array
	{
		$fields = $this->fields($list, $layout);
		$row = $list['type'] === 'flexible_content' ? ['acf_fc_layout' => $layout] : [];

		foreach (is_wp_error($fields) ? [] : $fields as $sub) {
			$name = $sub['name'];
			$sub['name'] = $prefix . $name;
			$row[$name] = acf_format_value($raw[$sub['key']] ?? null, $post_id, $sub);
		}

		return $row;
	}

	/**
	 * A field's starting value: its default, or the minimum number of empty rows.
	 */
	private function emptyValue(array $field): mixed
	{
		return match ($field['type']) {
			'repeater' => array_fill(0, max(0, (int) ($field['min'] ?? 0)), $this->create($field, '')),
			'flexible_content' => [],
			'group' => array_combine(
				array_column($field['sub_fields'] ?? [], 'key'),
				array_map(fn($child) => $this->emptyValue($child), $field['sub_fields'] ?? []),
			),
			default => $field['default_value'] ?? '',
		};
	}
}
