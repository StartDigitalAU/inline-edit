<?php

namespace TheStartLabs\InlineEdit\Rows;

/**
 * Blocks hidden with ACF Extended's "toggle" action, which stay saved but aren't shown to visitors.
 *
 * ACF Extended keeps a row's hidden flag in `{list}_{i}_acfe_flexible_toggle`, and leaves hidden rows
 * out whenever values load outside the admin, which includes the editor's own requests. So the
 * editor reads lists with hiding off (or a save would drop the hidden rows), and writes the flags
 * itself after rows move.
 *
 * Only ACF Extended's own toggle (before ACF 6.5, which brings its own way of disabling layouts) is
 * supported; elsewhere, nothing can be hidden from the page.
 */
final class HiddenRows
{
	public static function supported(array $acf): bool
	{
		return $acf['type'] === 'flexible_content' &&
			function_exists('acfe_is_acf') &&
			!acfe_is_acf('6.5') &&
			in_array('toggle', (array) ($acf['acfe_flexible_add_actions'] ?? []), true);
	}

	/**
	 * Run `$read` with every row included, hidden ones too.
	 *
	 * @template T
	 * @param callable(): T $read
	 * @return T
	 */
	public static function including(callable $read): mixed
	{
		add_filter('acfe/flexible/toggle_hide', '__return_false', PHP_INT_MAX);
		try {
			return $read();
		} finally {
			remove_filter('acfe/flexible/toggle_hide', '__return_false', PHP_INT_MAX);
		}
	}

	/**
	 * Indexes of a list's hidden rows.
	 *
	 * @return int[]
	 */
	public static function of(RowList $list): array
	{
		return self::supported($list->acf) ? self::indexes($list->postId, $list->name) : [];
	}

	/**
	 * Indexes of hidden rows, straight from what's stored (for templates, which may be showing the
	 * page to a visitor, so can't check what the user may edit).
	 *
	 * @return int[]
	 */
	public static function indexes(int $post_id, string $list): array
	{
		$stored = acf_get_metadata($post_id, $list);
		$count = is_array($stored) ? count($stored) : 0;

		return array_values(array_filter(
			range(0, $count - 1),
			fn($i) => $count > 0 && (bool) acf_get_metadata($post_id, self::key($list, $i)),
		));
	}

	/**
	 * Store whether each row is hidden, by its new position. `$hidden` holds the positions to hide.
	 *
	 * @param int[] $hidden
	 */
	public static function write(RowList $list, array $rows, array $hidden): void
	{
		if (!self::supported($list->acf)) {
			return;
		}

		foreach (array_values($rows) as $i => $row) {
			$key = self::key($list->name, $i);
			if (in_array($i, $hidden, true)) {
				acf_update_metadata($list->postId, $key, '1');
				acf_update_metadata($list->postId, $key, self::fieldKey($list->acf, $row['acf_fc_layout'] ?? ''), true);
			} else {
				acf_delete_metadata($list->postId, $key);
				acf_delete_metadata($list->postId, $key, true);
			}
		}
	}

	private static function key(string $list, int $index): string
	{
		return "{$list}_{$index}_acfe_flexible_toggle";
	}

	/** The virtual field ACF Extended gives each layout for its toggle. */
	private static function fieldKey(array $acf, string $layout_name): string
	{
		foreach ($acf['layouts'] as $layout) {
			if ($layout['name'] === $layout_name) {
				return "field_{$layout['key']}_toggle";
			}
		}

		return '';
	}
}
