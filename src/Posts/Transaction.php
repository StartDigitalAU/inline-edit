<?php

namespace TheStart\InlineEdit\Posts;

/**
 * A database transaction around a save, so a change that fails validation leaves nothing half saved.
 * (Tables that don't support transactions, such as MyISAM, just write as they go.)
 */
final class Transaction
{
	/**
	 * @param array<int, int|string> $posts Post IDs (and 'options') whose cached values to drop on rollback.
	 */
	public function __construct(private array $posts)
	{
		$this->query('START TRANSACTION');
	}

	/**
	 * Whether a transaction can safely hold changes that are never committed (see
	 * Preview\SharedPreview): the content tables support transactions (InnoDB), and there's no
	 * persistent object cache that could keep uncommitted values after the rollback.
	 */
	public static function canRollBack(): bool
	{
		global $wpdb;
		if (wp_using_ext_object_cache()) {
			return false;
		}

		$cached = get_transient('sd_inline_edit_transactions');
		if ($cached === false) {
			$tables = [$wpdb->posts, $wpdb->postmeta, $wpdb->options];
			$engines = $wpdb->get_col(
				$wpdb->prepare(
					'SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (%s, %s, %s)',
					...$tables,
				),
			);
			$cached = count($engines) === 3 && !array_diff(array_map('strtolower', $engines), ['innodb']) ? 'yes' : 'no';
			set_transient('sd_inline_edit_transactions', $cached, DAY_IN_SECONDS);
		}

		return $cached === 'yes';
	}

	public function commit(): void
	{
		$this->query('COMMIT');
	}

	public function rollback(): void
	{
		$this->query('ROLLBACK');

		// Nothing should go on reading values that were never committed.
		foreach ($this->posts as $post_id) {
			if (is_int($post_id)) {
				clean_post_cache($post_id);
			}
		}
		if (function_exists('acf_get_store') && acf_get_store('values')) {
			acf_get_store('values')->reset();
		}
	}

	private function query(string $sql): void
	{
		global $wpdb;
		$wpdb->query($sql);
	}
}
