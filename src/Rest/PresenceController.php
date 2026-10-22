<?php

namespace TheStart\InlineEdit\Rest;

use TheStart\InlineEdit\Fields\Resolver;
use WP_REST_Request;

/**
 * Who's editing a page. While someone edits on the front end, the editor holds WordPress's post lock
 * (refreshed every half a minute), so the admin warns anyone opening the page there. If someone else
 * already holds it, the editor says who rather than taking it.
 */
final class PresenceController
{
	public function __construct(private Resolver $resolver) {}

	public function handle(WP_REST_Request $request): mixed
	{
		require_once ABSPATH . 'wp-admin/includes/post.php';

		$post = $this->resolver->post($this->resolver->target($request['post']));
		if (is_wp_error($post)) {
			return $post;
		}

		if ($request['release']) {
			$this->release($post->ID);

			return rest_ensure_response(['editor' => null]);
		}

		$other = wp_check_post_lock($post->ID);
		if ($other) {
			return rest_ensure_response(['editor' => $this->describe($other)]);
		}

		wp_set_post_lock($post->ID);

		return rest_ensure_response(['editor' => null]);
	}

	/**
	 * Let go of the lock if it's ours, by making it old enough to have run out (as the admin does).
	 */
	private function release(int $post_id): void
	{
		$lock = explode(':', (string) get_post_meta($post_id, '_edit_lock', true));
		if ((int) ($lock[1] ?? 0) === get_current_user_id()) {
			update_post_meta($post_id, '_edit_lock', time() - HOUR_IN_SECONDS . ':' . get_current_user_id());
		}
	}

	private function describe(int $user_id): array
	{
		$user = get_userdata($user_id);

		return [
			'name' => $user ? $user->display_name : __('Someone'),
			'avatar' => (string) get_avatar_url($user_id, ['size' => 48]),
		];
	}
}
