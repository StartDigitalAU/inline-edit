<?php

namespace TheStart\InlineEdit\Fields;

/**
 * How a setting field (a toggle, select, number, link…) appears in a block's settings panel, and its
 * value as the panel shows it.
 */
final class SettingControl
{
	public static function describe(Field $field): array
	{
		$acf = $field->acf;

		return [
			'field' => $field->name,
			'label' => (string) $acf['label'],
			'type' => $field->type,
			'instructions' => wp_strip_all_tags((string) ($acf['instructions'] ?? '')),
			'value' => self::value($field),
			'base' => $field->fingerprint(),
			'choices' => self::choices($acf),
			'allowNull' => !empty($acf['allow_null']),
			'min' => self::number($acf['min'] ?? null),
			'max' => self::number($acf['max'] ?? null),
			'step' => self::number($acf['step'] ?? null),
			'placeholder' => (string) ($acf['placeholder'] ?? ''),
			'prepend' => (string) ($acf['prepend'] ?? ''),
			'append' => (string) ($acf['append'] ?? ''),
		];
	}

	/**
	 * The stored value (or the field's default for a row that isn't saved yet), in the shape the
	 * panel uses: a boolean, number, string, or { url, title, target } link.
	 */
	public static function value(Field $field): mixed
	{
		$raw = $field->raw();
		$raw = $raw === null || $raw === '' ? $field->acf['default_value'] ?? $raw : $raw;

		return match ($field->type) {
			'true_false' => (bool) $raw,
			'number', 'range' => is_numeric($raw) ? $raw + 0 : null,
			'link' => is_array($raw) && !empty($raw['url'])
				? [
					'url' => (string) $raw['url'],
					'title' => (string) ($raw['title'] ?? ''),
					'target' => (string) ($raw['target'] ?? ''),
				]
				: null,
			// A select's default can be a list, though only single selects are offered.
			default => (string) (is_array($raw) ? reset($raw) : $raw ?? ''),
		};
	}

	/**
	 * Choices as [value, label] pairs, in order.
	 */
	private static function choices(array $acf): array
	{
		$choices = is_array($acf['choices'] ?? null) ? $acf['choices'] : [];

		return array_map(fn($value, $label) => [(string) $value, (string) $label], array_keys($choices), $choices);
	}

	private static function number(mixed $value): ?float
	{
		return is_numeric($value) ? (float) $value : null;
	}
}
