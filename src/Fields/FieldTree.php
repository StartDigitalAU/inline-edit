<?php

namespace TheStartLabs\InlineEdit\Fields;

/**
 * Finding fields inside a row's fields by their names relative to the row: inside groups, whose
 * values ACF stores under the group's name and the field's (`cta_title`), and inside repeaters and
 * flexible content, under their row number too (`cards_0_title`).
 */
final class FieldTree
{
	/**
	 * The field a name points at among `$fields` (descending into groups), or null.
	 */
	public static function find(array $fields, string $name): ?array
	{
		foreach ($fields as $field) {
			if ($field['name'] === $name) {
				return $field;
			}
			$inside = self::inside($field, $name);
			$found = $inside ? self::find($inside['fields'], $inside['rest']) : null;
			if ($found) {
				return $found;
			}
		}

		return null;
	}

	/**
	 * A field's raw value within a row's raw values (by field key), or null.
	 */
	public static function rawAt(array $fields, array $raw, string $name): mixed
	{
		foreach ($fields as $field) {
			if ($field['name'] === $name) {
				return $raw[$field['key']] ?? null;
			}
			$inside = self::inside($field, $name);
			if (!$inside) {
				continue;
			}
			$value = $raw[$field['key']] ?? null;
			if (isset($inside['row'])) {
				$value = is_array($value) ? array_values($value)[$inside['row']] ?? null : null;
			}
			if (is_array($value)) {
				$found = self::rawAt($inside['fields'], $value, $inside['rest']);
				if ($found !== null) {
					return $found;
				}
			}
		}

		return null;
	}

	/**
	 * Where a name goes inside a field: a group's fields, or a repeater's or flexible content's
	 * row (with its number), and the rest of the name.
	 *
	 * @return array{fields: array, rest: string, row?: int}|null
	 */
	private static function inside(array $field, string $name): ?array
	{
		$prefix = $field['name'] . '_';
		if ($field['name'] === '' || !str_starts_with($name, $prefix)) {
			return null;
		}
		$rest = substr($name, strlen($prefix));

		if ($field['type'] === 'group') {
			return ['fields' => $field['sub_fields'] ?? [], 'rest' => $rest];
		}
		if (in_array($field['type'], ['repeater', 'flexible_content'], true) && preg_match('/^(\d+)_(.+)$/D', $rest, $match)) {
			// A flexible content row's layout isn't known from its name, so any layout's fields.
			$fields = $field['type'] === 'repeater'
				? $field['sub_fields'] ?? []
				: array_merge(...array_map(fn($layout) => $layout['sub_fields'] ?? [], array_values($field['layouts'] ?? [])) ?: [[]]);

			return ['fields' => $fields, 'rest' => $match[2], 'row' => (int) $match[1]];
		}

		return null;
	}

	/**
	 * The field keys leading to a field among `$fields` (a group's key, then the field's), which is
	 * where its value sits in a row of raw values.
	 *
	 * @return string[]|null
	 */
	public static function path(array $fields, string $name): ?array
	{
		foreach ($fields as $field) {
			if ($field['name'] === $name) {
				return [$field['key']];
			}
			if ($field['type'] === 'group' && str_starts_with($name, $field['name'] . '_')) {
				$rest = self::path($field['sub_fields'] ?? [], substr($name, strlen($field['name']) + 1));
				if ($rest) {
					return [$field['key'], ...$rest];
				}
			}
		}

		return null;
	}

	/**
	 * Every field of the given types, with its name relative to the row (`cta_title`) and the
	 * section it's in: the tab it comes after, or its group.
	 *
	 * @return array<int, array{field: array, name: string, section: string}>
	 */
	public static function walk(array $fields, array $types, string $prefix = '', string $section = ''): array
	{
		$found = [];
		foreach ($fields as $field) {
			if ($field['type'] === 'tab') {
				$section = (string) $field['label'];
			} elseif ($field['type'] === 'group') {
				$found = [...$found, ...self::walk($field['sub_fields'] ?? [], $types, "{$prefix}{$field['name']}_", (string) $field['label'])];
			} elseif (in_array($field['type'], $types, true)) {
				$found[] = ['field' => $field, 'name' => $prefix . $field['name'], 'section' => $section];
			}
		}

		return $found;
	}
}
