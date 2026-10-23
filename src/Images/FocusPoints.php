<?php

namespace TheStartLabs\InlineEdit\Images;

use WP_Error;

/**
 * Image focus points: the part of an image that stays in view when it's cropped (its CSS
 * object-position). The editor lets people drag them on the page; where they're stored is up to the
 * site, through two hooks:
 *
 * - `sd_inline_edit_image_focus` (filter) an attachment's focus as [x, y] percentages.
 * - `sd_inline_edit_save_image_focus` (action) store a new focus: ($attachment_id, $x, $y).
 *
 * The editor only offers focus points when something handles the action.
 */
final class FocusPoints
{
	public static function supported(): bool
	{
		return has_action('sd_inline_edit_save_image_focus');
	}

	/**
	 * @return array{0: float, 1: float}
	 */
	public static function of(int $attachment_id): array
	{
		$focus = apply_filters('sd_inline_edit_image_focus', [50, 50], $attachment_id);

		return is_array($focus) && count($focus) === 2 ? [(float) $focus[0], (float) $focus[1]] : [50.0, 50.0];
	}

	public static function cssPosition(int $attachment_id): string
	{
		[$x, $y] = self::of($attachment_id);

		return "{$x}% {$y}%";
	}

	/**
	 * Why a new focus point can't be saved, or null if it can.
	 */
	public static function problem(int $attachment_id): ?WP_Error
	{
		if (!self::supported()) {
			return new WP_Error('sd_inline_edit_focus', __('Focus points can’t be saved on this site.'), ['status' => 400]);
		}
		if (!wp_attachment_is_image($attachment_id)) {
			return new WP_Error('sd_inline_edit_invalid', __('That image no longer exists.'), ['status' => 404]);
		}
		// Like the media library's own focus point tool: anyone who can add media can set it.
		if (!current_user_can('upload_files')) {
			return new WP_Error('sd_inline_edit_forbidden', __('You need permission to upload files to change images.'), [
				'status' => 403,
			]);
		}

		return null;
	}

	public static function save(int $attachment_id, float $x, float $y): void
	{
		$clamp = fn($value) => round(max(0, min(100, $value)), 1);
		do_action('sd_inline_edit_save_image_focus', $attachment_id, $clamp($x), $clamp($y));
	}
}
