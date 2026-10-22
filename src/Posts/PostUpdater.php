<?php

namespace TheStart\InlineEdit\Posts;

use WP_Error;

/**
 * What saving a post from the admin does, done for a front-end save too.
 */
final class PostUpdater
{
	/**
	 * Refuse to save over someone who has one of the posts open in the admin.
	 */
	public function lockedBy(array $posts): ?WP_Error
	{
		require_once ABSPATH . 'wp-admin/includes/post.php';

		foreach ($posts as $post_id) {
			$user_id = is_int($post_id) ? wp_check_post_lock($post_id) : false;
			if (!$user_id) {
				continue;
			}

			$user = get_userdata($user_id);

			return new WP_Error(
				'sd_inline_edit_post_locked',
				sprintf(
					/* translators: %s: user's display name */
					__('%s is editing this page in the admin. Try again when they’ve finished.'),
					$user ? $user->display_name : __('Someone'),
				),
				['status' => 409],
			);
		}

		return null;
	}

	/**
	 * After a save: new titles, modified dates, revisions and `save_post`, then `sd_inline_edit_saved`.
	 *
	 * @param array<int, int|string> $posts
	 * @param array<int, string>     $titles New titles by post ID.
	 * @param array<int|string, string[]> $names Saved field and list names by post ID.
	 */
	public function saved(array $posts, array $titles, array $names): void
	{
		foreach ($posts as $post_id) {
			if (is_int($post_id)) {
				$this->update($post_id, $titles[$post_id] ?? null);
			}
			do_action('sd_inline_edit_saved', $post_id, $names[$post_id] ?? []);
		}
	}

	/**
	 * Update the post: its title if that changed, its modified date, a revision holding the new ACF
	 * values, and `save_post` for anything that listens for it (page caches, search indexes).
	 */
	private function update(int $post_id, ?string $title): void
	{
		$post = ['ID' => $post_id];
		if ($title !== null) {
			$post['post_title'] = $title;
		}

		// WordPress only makes a revision when a core field changed, but the edit may be ACF only.
		$force_revision = fn($changed, $last_revision, $revised) => (int) $revised->ID === $post_id ? true : $changed;
		add_filter('wp_save_post_revision_post_has_changed', $force_revision, 20, 3);
		$result = wp_update_post(wp_slash($post), true);
		remove_filter('wp_save_post_revision_post_has_changed', $force_revision, 20);

		if (is_wp_error($result)) {
			return;
		}

		// As the admin does, so "last edited by" stays accurate.
		update_post_meta($post_id, '_edit_last', get_current_user_id());

		if (function_exists('acf_save_post_revision')) {
			acf_save_post_revision($post_id);
		}
	}
}
