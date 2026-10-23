<?php

namespace TheStartLabs\InlineEdit\Fields;

use WP_Error;

/**
 * Cleans a submitted value for its field type, with the same rules the admin applies.
 */
final class Sanitizer
{
	public static function clean(Field $field, string $value): mixed
	{
		if (!wp_check_invalid_utf8($value)) {
			return new WP_Error('sd_inline_edit_invalid', __('This value isn’t valid.'), ['status' => 400]);
		}

		// Control characters other than tab and newline have no place in page text.
		$value = str_replace("\r\n", "\n", $value);
		$value = preg_replace('/[\x00-\x08\x0B-\x1F\x7F]/', '', $value);

		return match ($field->type) {
			'true_false' => in_array($value, ['1', 'true'], true) ? 1 : 0,
			'select', 'radio', 'button_group' => self::choice($field, $value),
			'number', 'range' => self::number($field, trim($value)),
			'url' => self::url(trim($value)),
			'email' => self::email(trim($value)),
			'color_picker' => self::color(trim($value)),
			'link' => self::link($value),
			'image' => self::image($field, trim($value)),
			'wysiwyg' => self::html(trim($value)),
			'textarea' => self::text(trim($value)),
			default => self::text(trim(preg_replace('/\s*\n\s*/', ' ', $value))),
		};
	}

	private static function choice(Field $field, string $value): string|WP_Error
	{
		$choices = array_map('strval', array_keys((array) ($field->acf['choices'] ?? [])));
		if (in_array($value, $choices, true) || ($value === '' && !empty($field->acf['allow_null']))) {
			return $value;
		}

		return self::invalid(__('Choose one of the options.'));
	}

	private static function number(Field $field, string $value): string|WP_Error
	{
		if ($value === '') {
			return '';
		}
		if (!is_numeric($value)) {
			return self::invalid(__('Enter a number.'));
		}
		$min = $field->acf['min'] ?? '';
		$max = $field->acf['max'] ?? '';
		if ((is_numeric($min) && $value < $min) || (is_numeric($max) && $value > $max)) {
			/* translators: 1: minimum, 2: maximum */
			return self::invalid(sprintf(__('Enter a number from %1$s to %2$s.'), $min, $max));
		}

		return $value;
	}

	private static function url(string $value): string|WP_Error
	{
		$url = esc_url_raw($value);

		return $value === '' || $url !== '' ? $url : self::invalid(__('Enter a valid link.'));
	}

	private static function email(string $value): string|WP_Error
	{
		return $value === '' || is_email($value) ? sanitize_email($value) : self::invalid(__('Enter a valid email address.'));
	}

	private static function color(string $value): string|WP_Error
	{
		return $value === '' || sanitize_hex_color($value) ? $value : self::invalid(__('Choose a colour.'));
	}

	/**
	 * A link arrives as JSON ({ url, title, target }), or empty to clear it.
	 */
	private static function link(string $value): array|string|WP_Error
	{
		$link = json_decode($value, true);
		if ($value === '' || $link === null) {
			return '';
		}
		$url = is_array($link) ? esc_url_raw((string) ($link['url'] ?? '')) : '';
		if ($url === '') {
			return self::invalid(__('Enter a valid link.'));
		}

		return [
			'url' => $url,
			'title' => sanitize_text_field((string) ($link['title'] ?? '')),
			'target' => ($link['target'] ?? '') === '_blank' ? '_blank' : '',
		];
	}

	private static function invalid(string $message): WP_Error
	{
		return new WP_Error('sd_inline_edit_invalid', $message, ['status' => 400]);
	}

	private static function html(string $value): string
	{
		$allowed = function_exists('acf_allow_unfiltered_html')
			? acf_allow_unfiltered_html()
			: current_user_can('unfiltered_html');

		return $allowed ? $value : wp_kses_post($value);
	}

	/**
	 * Templates print plain fields unescaped, so encode anything that would turn the text into markup.
	 * `&` is only encoded where it would otherwise read as an entity, so ordinary text is stored as typed.
	 */
	private static function text(string $value): string
	{
		$value = preg_replace('/&(?=#?[A-Za-z0-9]+;)/', '&amp;', $value);

		return str_replace('<', '&lt;', $value);
	}

	/**
	 * An attachment ID the user may put in this field. Empty clears it.
	 */
	private static function image(Field $field, string $value): int|string|WP_Error
	{
		if ($value === '') {
			return '';
		}

		$invalid = new WP_Error('sd_inline_edit_invalid', __('Choose an image from the media library.'), ['status' => 400]);
		if (!preg_match('/^[1-9][0-9]{0,19}$/D', $value)) {
			return $invalid;
		}

		$attachment = get_post((int) $value);
		if (
			!$attachment ||
			$attachment->post_type !== 'attachment' ||
			!wp_attachment_is_image($attachment) ||
			!current_user_can('read_post', $attachment->ID)
		) {
			return $invalid;
		}

		if (($field->acf['library'] ?? '') === 'uploadedTo' && (int) $attachment->post_parent !== (int) $field->postId) {
			return new WP_Error('sd_inline_edit_invalid', __('This field only takes images uploaded to this page.'), [
				'status' => 400,
			]);
		}

		return $attachment->ID;
	}
}
