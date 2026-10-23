<?php

namespace TheStartLabs\InlineEdit\Rows;

use TheStartLabs\InlineEdit\Fields\Resolver;
use WP_Error;

/**
 * The saved block a pasted one is copied from (see the editor's Copy and Paste). The editor only
 * says where it is; it's read here, so pasting can't put anything in that couldn't be saved.
 */
final class RowSource
{
	public function __construct(private Resolver $resolver) {}

	/**
	 * The row's values in ACF's raw format, checked: the user can edit its page, and it's in the
	 * same field as the list it's going into.
	 *
	 * @param array{post: string, field: string, index: int} $source
	 */
	public function raw(array $source, array $target): array|WP_Error
	{
		$invalid = new WP_Error('sd_inline_edit_invalid', __('The copied block can’t be pasted here.'), ['status' => 400]);

		$list = $this->resolver->list($this->resolver->target($source['post'] ?? ''), (string) ($source['field'] ?? ''));
		if (is_wp_error($list)) {
			return $list;
		}
		if ($list->acf['key'] !== $target['key']) {
			return $invalid;
		}

		$rows = HiddenRows::including(fn() => acf_get_value($list->postId, $list->acf));
		$row = is_array($rows) ? array_values($rows)[(int) ($source['index'] ?? -1)] ?? null : null;

		return is_array($row) ? $row : new WP_Error('sd_inline_edit_invalid', __('The copied block no longer exists.'), ['status' => 404]);
	}
}
