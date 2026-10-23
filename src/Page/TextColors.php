<?php

namespace TheStartLabs\InlineEdit\Page;

/**
 * The text colours rich text can use, matching the admin editor's colour picker: the palette TinyMCE
 * is set up with (its `textcolor_map`), or TinyMCE's own default palette. Sites can change them with
 * the `sd_inline_edit_text_colors` filter, as [['color' => '#ff0000', 'name' => 'Red'], ...].
 */
final class TextColors
{
	// TinyMCE's default palette, which the admin editor shows unless it's set up with another.
	private const TINYMCE_DEFAULT = [
		'000000', 'Black', '993300', 'Burnt orange', '333300', 'Dark olive', '003300', 'Dark green',
		'003366', 'Dark azure', '000080', 'Navy Blue', '333399', 'Indigo', '333333', 'Very dark gray',
		'800000', 'Maroon', 'FF6600', 'Orange', '808000', 'Olive', '008000', 'Green',
		'008080', 'Teal', '0000FF', 'Blue', '666699', 'Grayish blue', '808080', 'Gray',
		'FF0000', 'Red', 'FF9900', 'Amber', '99CC00', 'Yellow green', '339966', 'Sea green',
		'33CCCC', 'Turquoise', '3366FF', 'Royal blue', '800080', 'Purple', '999999', 'Medium gray',
		'FF00FF', 'Magenta', 'FFCC00', 'Gold', 'FFFF00', 'Yellow', '00FF00', 'Lime',
		'00FFFF', 'Aqua', '00CCFF', 'Sky blue', '993366', 'Red violet', 'FFFFFF', 'White',
		'FF99CC', 'Pink', 'FFCC99', 'Peach', 'FFFF99', 'Light yellow', 'CCFFCC', 'Pale green',
		'CCFFFF', 'Pale cyan', '99CCFF', 'Light sky blue', 'CC99FF', 'Plum',
	];

	/**
	 * @return array<int, array{color: string, name: string}>
	 */
	public static function all(): array
	{
		$colors = apply_filters('sd_inline_edit_text_colors', self::pairs(self::tinymcePalette()));

		return array_values(
			array_filter(
				array_map(
					fn($color) => [
						'color' => (string) sanitize_hex_color((string) ($color['color'] ?? '')),
						'name' => (string) ($color['name'] ?? ''),
					],
					is_array($colors) ? $colors : [],
				),
				fn($color) => $color['color'] !== '',
			),
		);
	}

	/**
	 * The palette the admin editor is set up with, through the same filter TinyMCE settings use.
	 */
	private static function tinymcePalette(): array
	{
		$settings = apply_filters('tiny_mce_before_init', [], 'content');
		$map = is_array($settings) ? $settings['textcolor_map'] ?? null : null;
		$map = is_string($map) ? json_decode($map, true) : $map;

		return is_array($map) && $map ? $map : self::TINYMCE_DEFAULT;
	}

	/**
	 * TinyMCE lists colours as ['FF0000', 'Red', '00FF00', 'Green', ...].
	 */
	private static function pairs(array $map): array
	{
		return array_map(
			fn($pair) => ['color' => '#' . strtolower(ltrim((string) $pair[0], '#')), 'name' => (string) ($pair[1] ?? '')],
			array_chunk(array_values($map), 2),
		);
	}
}
