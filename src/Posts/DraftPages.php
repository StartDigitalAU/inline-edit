<?php

namespace TheStartLabs\InlineEdit\Posts;

use WP_Post;

/**
 * Editing pages that aren't published yet, so new pages can be built on the page too.
 *
 * WordPress shows an editor their unpublished pages as previews, where ACF normally reads values
 * from the post's latest revision. While editing, it reads the post's own values instead, which are
 * what the editor saves.
 */
final class DraftPages
{
	private const UNPUBLISHED = ['draft', 'pending', 'future'];

	/**
	 * The unpublished post being viewed, if the current user can edit it.
	 */
	public static function current(): ?WP_Post
	{
		$post = get_queried_object();

		return $post instanceof WP_Post &&
			in_array($post->post_status, self::UNPUBLISHED, true) &&
			current_user_can('edit_post', $post->ID)
			? $post
			: null;
	}

	/**
	 * acf/validate_post_id: on a draft being edited, its own values rather than a revision's.
	 */
	public static function ownValues(mixed $post_id, mixed $original): mixed
	{
		$draft = is_preview() ? self::current() : null;

		return $draft && (int) $original === $draft->ID ? $draft->ID : $post_id;
	}

	public static function canPublish(WP_Post $post): bool
	{
		$type = get_post_type_object($post->post_type);

		return $type && current_user_can($type->cap->publish_posts) && current_user_can('edit_post', $post->ID);
	}

	public static function canCreatePages(): bool
	{
		$type = get_post_type_object('page');

		return $type && current_user_can($type->cap->create_posts);
	}
}
