<?php

namespace TheStartLabs\InlineEdit\Rest;

use TheStartLabs\InlineEdit\Fields\Resolver;
use TheStartLabs\InlineEdit\Posts\DraftPages;
use WP_Error;
use WP_REST_Request;

/**
 * Publishing a page from the front end, and starting a new one (as a draft, to build on the page).
 */
final class PageController
{
	public function __construct(private Resolver $resolver) {}

	public function publish(WP_REST_Request $request): mixed
	{
		$post = $this->resolver->post($this->resolver->target($request['post']));
		if (is_wp_error($post)) {
			return $post;
		}
		if (!DraftPages::canPublish($post)) {
			return new WP_Error('sd_inline_edit_forbidden', __('You can’t publish this page.'), ['status' => 403]);
		}

		// As the admin does: published now, unless it was scheduled for later.
		$changes = ['ID' => $post->ID, 'post_status' => $post->post_status === 'future' ? 'future' : 'publish'];
		if ($post->post_status !== 'future') {
			$changes['post_date'] = current_time('mysql');
			$changes['post_date_gmt'] = current_time('mysql', true);
		}
		$result = wp_update_post($changes, true);

		return is_wp_error($result) ? $result : rest_ensure_response(['url' => get_permalink($post->ID), 'status' => get_post_status($post->ID)]);
	}

	public function create(WP_REST_Request $request): mixed
	{
		if (!DraftPages::canCreatePages()) {
			return new WP_Error('sd_inline_edit_forbidden', __('You can’t create pages.'), ['status' => 403]);
		}

		$title = trim(sanitize_text_field($request['title']));
		$post_id = wp_insert_post(
			['post_type' => 'page', 'post_status' => 'draft', 'post_title' => $title !== '' ? $title : __('Untitled')],
			true,
		);

		return is_wp_error($post_id) ? $post_id : rest_ensure_response(['url' => get_permalink($post_id)]);
	}
}
