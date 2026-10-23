<?php

namespace TheStartLabs\InlineEdit\Page;

/**
 * The rich text "Formats" dropdown. Sites pass their TinyMCE style_formats through the
 * `sd_inline_edit_style_formats` filter, so the admin and front-end editors offer the same formats.
 */
final class StyleFormats
{
	/**
	 * @return array<int, array{title: string, selector: string, className: string}>
	 */
	public static function all(): array
	{
		$formats = apply_filters('sd_inline_edit_style_formats', []);

		return array_values(
			array_filter(
				array_map(
					fn($format) => [
						'title' => (string) ($format['title'] ?? ''),
						'selector' => (string) ($format['selector'] ?? ''),
						'className' => (string) ($format['attributes']['class'] ?? ''),
					],
					is_array($formats) ? $formats : [],
				),
				// Only class-based formats on a selector, which is all the editor knows how to apply.
				fn($format) => $format['title'] !== '' &&
					$format['selector'] !== '' &&
					preg_match('/^[A-Za-z0-9_-]+$/D', $format['className']),
			),
		);
	}
}
