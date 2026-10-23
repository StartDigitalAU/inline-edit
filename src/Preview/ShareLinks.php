<?php

namespace TheStartLabs\InlineEdit\Preview;

/**
 * Links that show someone's unsaved changes to a page (see SharedPreview). Each is a random token
 * stored on the page with whose draft it shows and when it stops working.
 */
final class ShareLinks
{
	private const KEY = '_sd_inline_edit_shares';
	private const LIFETIME = 7 * DAY_IN_SECONDS;
	public const PARAM = 'sd_preview';

	/**
	 * A link to the current user's draft of a page, reusing theirs if it's still good.
	 *
	 * @return array{url: string, expires: string}
	 */
	public function create(int $post_id): array
	{
		$shares = $this->current($post_id);
		$user_id = get_current_user_id();
		$token = array_search($user_id, array_column($shares, 'user', 'token'), true);

		if (!$token) {
			$token = wp_generate_password(32, false);
			$shares[] = ['token' => $token, 'user' => $user_id, 'expires' => time() + self::LIFETIME];
			update_post_meta($post_id, self::KEY, $shares);
		}

		$expires = array_column($shares, 'expires', 'token')[$token];

		return ['url' => $this->url($post_id, $token), 'expires' => gmdate('c', $expires)];
	}

	/**
	 * Stop the current user's links to a page working.
	 */
	public function revoke(int $post_id): void
	{
		$user_id = get_current_user_id();
		$shares = array_values(array_filter($this->current($post_id), fn($share) => $share['user'] !== $user_id));
		update_post_meta($post_id, self::KEY, $shares);
	}

	/**
	 * The user whose draft a token shows, or null if it isn't (or is no longer) a link to this page.
	 */
	public function owner(int $post_id, string $token): ?int
	{
		foreach ($this->current($post_id) as $share) {
			if (hash_equals($share['token'], $token)) {
				return (int) $share['user'];
			}
		}

		return null;
	}

	public function hasLink(int $post_id): bool
	{
		return in_array(get_current_user_id(), array_column($this->current($post_id), 'user'), true);
	}

	private function current(int $post_id): array
	{
		$shares = get_post_meta($post_id, self::KEY, true);

		return array_values(
			array_filter(
				is_array($shares) ? $shares : [],
				fn($share) => is_array($share) && isset($share['token'], $share['user'], $share['expires']) && $share['expires'] > time(),
			),
		);
	}

	private function url(int $post_id, string $token): string
	{
		return add_query_arg(self::PARAM, $token, get_permalink($post_id));
	}
}
