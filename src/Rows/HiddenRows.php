<?php

namespace TheStartLabs\InlineEdit\Rows;

/**
 * Blocks hidden from visitors without being deleted, which stay saved but aren't shown.
 *
 * Two ways to hide them, depending on the ACF version:
 *
 * - **ACF 6.5 and later** ("Disable layout"): the hidden rows' indexes are kept in the list's
 *   `_{list}_layout_meta`, with any renamed layouts' labels. ACF rewrites that from flags on the rows
 *   on every save, so rows the editor saves carry them (see prepare()).
 * - **Before ACF 6.5**, ACF Extended's "toggle" action: a row's flag is kept in
 *   `{list}_{i}_acfe_flexible_toggle`, which the editor writes itself after rows move.
 *
 * Either way, hidden rows are left out whenever values load outside the admin, which includes the
 * editor's own requests. So the editor reads lists with hiding off (or a save would drop the hidden
 * rows).
 */
final class HiddenRows
{
	public static function supported(array $acf): bool
	{
		return self::native($acf) || self::toggle($acf);
	}

	/** ACF's own "Disable layout" (6.5 and later). */
	private static function native(array $acf): bool
	{
		return $acf['type'] === 'flexible_content' && defined('ACF_VERSION') && version_compare(ACF_VERSION, '6.5', '>=');
	}

	/** ACF Extended's toggle, before ACF 6.5. */
	private static function toggle(array $acf): bool
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
		// ACF caches loaded values and layout meta, with the hidden rows left out.
		self::flush();
		add_filter('acfe/flexible/toggle_hide', '__return_false', PHP_INT_MAX);
		add_filter('acf/pre_load_metadata', [self::class, 'noLayoutMeta'], PHP_INT_MAX, 4);
		try {
			return $read();
		} finally {
			remove_filter('acfe/flexible/toggle_hide', '__return_false', PHP_INT_MAX);
			remove_filter('acf/pre_load_metadata', [self::class, 'noLayoutMeta'], PHP_INT_MAX);
			self::flush();
		}
	}

	/**
	 * While reading with hidden rows included: no layout meta, so ACF disables nothing.
	 *
	 * @internal
	 */
	public static function noLayoutMeta(mixed $value, mixed $post_id, mixed $name, mixed $hidden): mixed
	{
		return !$hidden && is_string($name) && str_starts_with($name, '_') && str_ends_with($name, '_layout_meta')
			? '__return_null'
			: $value;
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
	 * page to a visitor, so can't check what the user may edit). Either way of hiding counts.
	 *
	 * @return int[]
	 */
	public static function indexes(int|string $post_id, string $list): array
	{
		$stored = acf_get_metadata($post_id, $list);
		$count = is_array($stored) ? count($stored) : 0;
		$disabled = array_map('intval', (array) (self::layoutMeta($post_id, $list)['disabled'] ?? []));

		return array_values(array_filter(
			range(0, $count - 1),
			fn($i) => $count > 0 && (in_array($i, $disabled, true) || (bool) acf_get_metadata($post_id, self::key($list, $i))),
		));
	}

	/**
	 * Rows about to be saved in a new order, flagged the way ACF 6.5 keeps hidden and renamed layouts.
	 * `$hidden` holds the positions to hide, and `$order` says where each row came from.
	 */
	public static function prepare(RowList $list, array $rows, array $hidden, array $order): array
	{
		if (!self::native($list->acf)) {
			return $rows;
		}

		$renamed = (array) (self::layoutMeta($list->postId, $list->name)['renamed'] ?? []);
		$order = array_values($order);

		foreach (array_keys($rows) as $i) {
			if (in_array($i, $hidden, true)) {
				$rows[$i]['acf_fc_layout_disabled'] = 1;
			}
			$from = $order[$i]['from'] ?? null;
			if ($from !== null && ($renamed[$from] ?? '') !== '') {
				$rows[$i]['acf_fc_layout_custom_label'] = $renamed[$from];
			}
		}

		return $rows;
	}

	/**
	 * Store whether each row is hidden, by its new position, after the rows are saved. `$hidden`
	 * holds the positions to hide. (ACF 6.5 already did, from the rows' flags; see prepare().)
	 *
	 * @param int[] $hidden
	 */
	public static function write(RowList $list, array $rows, array $hidden): void
	{
		if (self::native($list->acf)) {
			self::flush();
			return;
		}
		if (!self::toggle($list->acf)) {
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

	/** ACF 6.5's layout meta for a list: `['disabled' => [indexes], 'renamed' => [index => label]]`. */
	private static function layoutMeta(int|string $post_id, string $list): array
	{
		$meta = acf_get_metadata($post_id, "{$list}_layout_meta", true);

		return is_array($meta) ? $meta : [];
	}

	/** Forget the values and layout meta ACF has cached this request. */
	private static function flush(): void
	{
		acf_get_store('values')->reset();
		$type = function_exists('acf_get_field_type') ? acf_get_field_type('flexible_content') : null;
		if ($type && property_exists($type, 'layout_meta')) {
			$type->layout_meta = [];
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
