<?php

namespace TheStart\InlineEdit\Rest;

use TheStart\InlineEdit\Drafts\DraftStore;
use TheStart\InlineEdit\Fields\Resolver;
use WP_REST_Request;

/**
 * Keeps (or, with a null draft, clears) the current user's unsaved changes to a page.
 */
final class DraftController
{
	public function __construct(
		private Resolver $resolver,
		private DraftStore $drafts,
	) {}

	public function handle(WP_REST_Request $request): mixed
	{
		$post = $this->resolver->post($this->resolver->target($request['post']));
		if (is_wp_error($post)) {
			return $post;
		}

		if (!is_array($request['draft'])) {
			$this->drafts->delete($post->ID);

			return rest_ensure_response(['savedAt' => null]);
		}

		$saved = $this->drafts->save($post->ID, $request['draft']);

		return is_wp_error($saved) ? $saved : rest_ensure_response($saved);
	}
}
