<?php

namespace TheStart\InlineEdit\Fields;

use WP_Error;

/**
 * Cleans a submitted value for its field type, with the same rules the admin applies.
 */
final class Sanitizer
{
	public static function clean(Field $field, string $value): string|int|WP_Error
	{
		if (!wp_check_invalid_utf8($value)) {
			return new WP_Error('sd_inline_edit_invalid', __('This value isn’t valid.'), ['status' => 400]);
		}

		// Control characters other than tab and newline have no place in page text.
		$value = str_replace("\r\n", "\n", $value);
		$value = preg_replace('/[\x00-\x08\x0B-\x1F\x7F]/', '', $value);

		return match ($field->type) {
			'image' => self::image($field, trim($value)),
			'wysiwyg' => self::html(trim($value)),
			'textarea' => self::text(trim($value)),
			default => self::text(trim(preg_replace('/\s*\n\s*/', ' ', $value))),
		};
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
