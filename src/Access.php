<?php

namespace TheStart\InlineEdit;

/**
 * Whether editing is available on this request.
 */
final class Access
{
	private ?bool $enabled = null;

	/** Rendering a preview of a new row inside a REST request, where editing is otherwise off. */
	private bool $previewing = false;

	/**
	 * Checked once per request, and cheap for logged-out visitors.
	 */
	public function enabled(): bool
	{
		if ($this->previewing) {
			return true;
		}

		return $this->enabled ??=
			is_user_logged_in() &&
			!is_admin() &&
			!wp_doing_ajax() &&
			!wp_is_serving_rest_request() &&
			!is_feed() &&
			!is_embed() &&
			!is_preview() &&
			!is_customize_preview() &&
			current_user_can('edit_posts') &&
			(bool) apply_filters('sd_inline_edit_enabled', true);
	}

	/**
	 * Run a render with editing on, for a preview.
	 *
	 * @template T
	 * @param callable(): T $render
	 * @return T
	 */
	public function previewing(callable $render): mixed
	{
		$this->previewing = true;
		try {
			return $render();
		} finally {
			$this->previewing = false;
		}
	}
}
