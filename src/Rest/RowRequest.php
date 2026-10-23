<?php

namespace TheStartLabs\InlineEdit\Rest;

use TheStartLabs\InlineEdit\Fields\FieldTree;
use TheStartLabs\InlineEdit\Fields\Resolver;
use TheStartLabs\InlineEdit\Fields\VirtualRows;
use TheStartLabs\InlineEdit\Rows\RowFactory;
use TheStartLabs\InlineEdit\Rows\RowSource;
use WP_Error;
use WP_Post;
use WP_REST_Request;

/**
 * A request about one row on the page, as the editor names it: its list (by field key and name on
 * the page), layout, index, whether it's saved yet, and any unsaved rows it sits in.
 *
 * Rows that aren't saved have no ACF references yet, so their fields (and their parents') are
 * registered as virtual rows while the request is handled.
 */
final class RowRequest
{
	private function __construct(
		public readonly WP_Post $post,
		public readonly array $list,
		public readonly string $layout,
		public readonly string $prefix,
		public readonly array $fields,
		public readonly bool $stored,
		private ?array $copy = null,
	) {}

	public static function from(
		WP_REST_Request $request,
		Resolver $resolver,
		RowFactory $rows,
		VirtualRows $virtual,
		?RowSource $sources = null,
	): self|WP_Error {
		$invalid = new WP_Error('sd_inline_edit_invalid', __('That block can’t be changed here.'), ['status' => 400]);

		$post = $resolver->post($resolver->target($request['post']));
		if (is_wp_error($post)) {
			return $post;
		}

		$list = self::listField($request['key'], $request['field']);
		if (!$list) {
			return $invalid;
		}

		foreach ($request['parents'] as $parent) {
			$parent_list = self::listField($parent['key'], 'parent');
			$parent_fields = $parent_list ? $rows->fields($parent_list, $parent['layout']) : null;
			if (!is_array($parent_fields)) {
				return $invalid;
			}
			$virtual->add($parent['prefix'], $parent_fields);
		}

		$fields = $rows->fields($list, $request['layout']);
		if (is_wp_error($fields)) {
			return $fields;
		}

		$prefix = "{$request['field']}_{$request['index']}_";
		$stored = (bool) $request['stored'];
		if (!$stored) {
			$virtual->add($prefix, $fields);
		}

		// A pasted row, which shows the values of the saved row it's copied from.
		$copy = null;
		if ($sources && is_array($request['source'])) {
			$copy = $sources->raw($request['source'], $list);
			if (is_wp_error($copy)) {
				return $copy;
			}
		}

		return new self($post, $list, $request['layout'], $prefix, $fields, $stored, $copy);
	}

	public function isCopy(): bool
	{
		return $this->copy !== null;
	}

	/**
	 * A field's value in the block a pasted row is copied from, by its name relative to the row.
	 */
	public function copied(string $name): mixed
	{
		return $this->copy === null ? null : FieldTree::rawAt($this->fields, $this->copy, $name);
	}

	/**
	 * The row's values in ACF's raw format: as saved, or a new row's defaults.
	 */
	public function rawValues(RowFactory $rows): array|WP_Error
	{
		if ($this->copy !== null) {
			return $this->copy;
		}
		if (!$this->stored) {
			return $rows->create($this->list, $this->layout);
		}

		$raw = [];
		foreach ($this->fields as $sub) {
			$sub['name'] = $this->prefix . $sub['name'];
			$raw[$sub['key']] = acf_get_value($this->post->ID, $sub);
		}

		return $raw;
	}

	/**
	 * The list's ACF field, named as it is on the page (which may be inside a row that's also new).
	 */
	private static function listField(string $key, string $name): ?array
	{
		$field = acf_get_field($key);
		if (!$field || !in_array($field['type'], Resolver::LIST_TYPES, true)) {
			return null;
		}
		$field['name'] = $name;

		return $field;
	}
}
