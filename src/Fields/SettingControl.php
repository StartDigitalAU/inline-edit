<?php

namespace TheStartLabs\InlineEdit\Fields;

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
			// Posts, terms and galleries can hold several.
			'multiple' => self::isMultiple($field),
			'mimeTypes' => (string) ($acf['mime_types'] ?? ''),
		];
	}

	public static function isMultiple(Field $field): bool
	{
		return match ($field->type) {
			'gallery', 'relationship' => true,
			'taxonomy' => in_array($field->acf['field_type'] ?? 'checkbox', ['checkbox', 'multi_select'], true),
			'post_object', 'page_link' => !empty($field->acf['multiple']),
			default => false,
		};
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
			'gallery' => array_values(array_filter(array_map([self::class, 'image'], (array) ($raw ?: [])))),
			'file' => self::file($raw),
			'post_object', 'page_link', 'relationship' => self::items($field, $raw, [self::class, 'post']),
			'taxonomy' => self::items($field, $raw, [self::class, 'term']),
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
	 * Posts or terms as { id, text }: a list if the field takes several, otherwise one (or null).
	 */
	private static function items(Field $field, mixed $raw, callable $describe): mixed
	{
		$items = array_values(array_filter(array_map($describe, array_filter((array) ($raw ?: [])))));

		return self::isMultiple($field) ? $items : $items[0] ?? null;
	}

	/** An image in a gallery: its ID, a thumbnail, and its alt text. */
	public static function image(mixed $id): ?array
	{
		$id = (int) (is_array($id) ? $id['ID'] ?? 0 : $id);
		$url = $id ? wp_get_attachment_image_url($id, 'thumbnail') : false;

		return $url ? ['id' => $id, 'url' => $url, 'alt' => (string) get_post_meta($id, '_wp_attachment_image_alt', true)] : null;
	}

	private static function file(mixed $raw): ?array
	{
		$id = (int) (is_array($raw) ? $raw['ID'] ?? 0 : $raw);
		$url = $id ? wp_get_attachment_url($id) : false;

		return $url ? ['id' => $id, 'filename' => wp_basename($url), 'url' => $url] : null;
	}

	public static function post(mixed $id): ?array
	{
		$post = get_post(is_object($id) ? $id->ID : (int) $id);

		return $post ? ['id' => $post->ID, 'text' => html_entity_decode(get_the_title($post) ?: __('(no title)'), ENT_QUOTES | ENT_HTML5, 'UTF-8')] : null;
	}

	public static function term(mixed $id): ?array
	{
		$term = get_term(is_object($id) ? $id->term_id : (int) $id);

		return $term && !is_wp_error($term) ? ['id' => $term->term_id, 'text' => html_entity_decode($term->name, ENT_QUOTES | ENT_HTML5, 'UTF-8')] : null;
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
