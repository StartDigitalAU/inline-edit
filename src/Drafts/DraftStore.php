<?php

namespace TheStart\InlineEdit\Drafts;

use WP_Error;

/**
 * Unsaved changes, kept on the server for each person and page so they survive closing the tab or
 * switching computers. A draft is what the editor would save, plus what it needs to show it again
 * (see assets/js/services/drafts.js); only the editor reads it, and a shared preview applies it
 * through the same checks as a save (see Preview\SharedPreview).
 */
final class DraftStore
{
	private const KEY = 'sd_inline_edit_draft_';
	private const MAX_BYTES = 1000000;

	public function get(int $post_id, ?int $user_id = null): ?array
	{
		$draft = get_user_meta($user_id ?? get_current_user_id(), self::KEY . $post_id, true);

		return is_array($draft) ? $draft : null;
	}

	public function save(int $post_id, array $draft): array|WP_Error
	{
		if (strlen((string) wp_json_encode($draft)) > self::MAX_BYTES) {
			return new WP_Error('sd_inline_edit_draft', __('These changes are too big to keep as a draft.'), ['status' => 413]);
		}

		$draft['savedAt'] = gmdate('c');
		update_user_meta(get_current_user_id(), self::KEY . $post_id, wp_slash($draft));

		return ['savedAt' => $draft['savedAt']];
	}

	public function delete(int $post_id, ?int $user_id = null): void
	{
		delete_user_meta($user_id ?? get_current_user_id(), self::KEY . $post_id);
	}
}
