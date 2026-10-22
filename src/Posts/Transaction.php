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
