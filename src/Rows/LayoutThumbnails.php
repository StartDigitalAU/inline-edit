<?php

namespace TheStart\InlineEdit\Rows;

/**
 * A picture of each block layout for the editor's block picker, from (in order):
 *
 * 1. ACF Extended's layout thumbnail, if one's set in the field group.
 * 2. An image in the theme's `thumbnails/` folder named after the layout, e.g.
 *    `thumbnails/text_with_image.jpg` (or .webp, .png). `npm run thumbnails` in this package makes
 *    them from a page with one of each block.
 * 3. The `sd_inline_edit_layout_thumbnail` filter, which can change or add any of them.
 */
final class LayoutThumbnails
{
	private const EXTENSIONS = ['webp', 'jpg', 'png'];

	public static function url(array $layout, array $list): string
	{
		$url = self::fromAcfExtended($layout) ?: self::fromTheme($layout['name']);

		return (string) apply_filters('sd_inline_edit_layout_thumbnail', $url, $layout['name'], $list);
	}

	private static function fromAcfExtended(array $layout): string
	{
		$thumbnail = $layout['acfe_flexible_thumbnail'] ?? false;
		if (is_numeric($thumbnail)) {
			return (string) wp_get_attachment_image_url((int) $thumbnail, 'medium_large');
		}

		return is_string($thumbnail) ? $thumbnail : '';
	}

	private static function fromTheme(string $name): string
	{
		foreach (self::EXTENSIONS as $extension) {
			$file = "thumbnails/{$name}.{$extension}";
			if (file_exists(get_theme_file_path($file))) {
				return add_query_arg('ver', filemtime(get_theme_file_path($file)), get_theme_file_uri($file));
			}
		}

		return '';
	}
}
