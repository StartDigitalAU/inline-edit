<?php

namespace TheStart\InlineEdit\Rest;

use TheStart\InlineEdit\Fields\Resolver;
use TheStart\InlineEdit\Posts\Transaction;
use TheStart\InlineEdit\Preview\ShareLinks;
use WP_Error;
use WP_REST_Request;

/**
 * Makes (or, with `revoke`, stops) a link that shows the current user's unsaved changes to a page.
 */
final class ShareController
{
	public function __construct(
		private Resolver $resolver,
		private ShareLinks $links,
	) {}

	public function handle(WP_REST_Request $request): mixed
	{
		$post = $this->resolver->post($this->resolver->target($request['post']));
		if (is_wp_error($post)) {
			return $post;
		}

		if ($request['revoke']) {
			$this->links->revoke($post->ID);

			return rest_ensure_response(['url' => null]);
		}

		if (!Transaction::canRollBack()) {
			return new WP_Error(
				'sd_inline_edit_share',
				__('Preview links aren’t available on this site’s database setup.'),
				['status' => 400],
			);
		}

		return rest_ensure_response($this->links->create($post->ID));
	}
}
