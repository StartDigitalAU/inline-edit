<?php

namespace TheStart\InlineEdit\Fields;

use TheStart\InlineEdit\Rows\RowFactory;
use TheStart\InlineEdit\Rows\RowList;
use WP_Error;
use WP_Post;

/**
 * Turns what a template or request names (a post and a field's meta name) into a Field or RowList the
 * current user may edit. Used for rendering and saving alike, so the server never trusts the page.
 */
final class Resolver
{
	public const FIELD_TYPES = ['text', 'textarea', 'wysiwyg', 'image'];
	public const LIST_TYPES = ['flexible_content', 'repeater'];

	private const NAME = '/^[A-Za-z0-9_-]{1,190}$/D';

	public function __construct(
		private VirtualRows $virtual,
		private RowFactory $rows,
	) {}

	/**
	 * A post ID or 'options' from whatever a template or request passed in.
	 */
	public function target(mixed $target): int|string|null
	{
		if ($target === 'options' || $target === 'option') {
			return 'options';
		}
		if (is_object($target) && isset($target->ID)) {
			$target = $target->ID;
		}
		if (is_int($target) || (is_string($target) && preg_match('/^[1-9][0-9]{0,19}$/D', $target))) {
			return (int) $target > 0 ? (int) $target : null;
		}

		return null;
	}

	public function field(int|string|null $target, string $name): Field|WP_Error
	{
		$invalid = new WP_Error('sd_inline_edit_field', __('This field can’t be edited here.'), ['status' => 400]);
		if ($target === null || !preg_match(self::NAME, $name)) {
			return $invalid;
		}

		if ($target === 'options') {
			$acf = $this->acf($name, 'options', self::FIELD_TYPES);
			if (!$acf) {
				return $invalid;
			}

			$page = $this->options_page($acf);
			if (!$page) {
				return new WP_Error('sd_inline_edit_forbidden', __('You can’t edit this field.'), ['status' => 403]);
			}

			return new Field('options', $name, $acf['type'], $acf, admin_url('admin.php?page=' . rawurlencode($page)));
		}

		$post = $this->post($target);
		if (is_wp_error($post)) {
			return $post;
		}
		$edit_url = (string) get_edit_post_link($post->ID, 'raw');

		if ($name === 'title') {
			return post_type_supports($post->post_type, 'title')
				? new Field($post->ID, 'title', 'title', null, $edit_url)
				: $invalid;
		}

		$acf = $this->acf($name, $post->ID, self::FIELD_TYPES);

		return $acf ? new Field($post->ID, $name, $acf['type'], $acf, $edit_url) : $invalid;
	}

	public function list(int|string|null $target, string $name): RowList|WP_Error
	{
		$invalid = new WP_Error('sd_inline_edit_field', __('These blocks can’t be changed here.'), ['status' => 400]);
		if (!is_int($target) || !preg_match(self::NAME, $name)) {
			return $invalid;
		}

		$post = $this->post($target);
		if (is_wp_error($post)) {
			return $post;
		}

		$acf = $this->acf($name, $post->ID, self::LIST_TYPES);
		if (!$acf || !empty($acf['readonly']) || !empty($acf['disabled'])) {
			return $invalid;
		}

		return new RowList($post->ID, $name, $acf, $this->rows);
	}

	/**
	 * A post the current user may edit from the front end.
	 */
	public function post(int|string|null $target): WP_Post|WP_Error
	{
		$post = is_int($target) ? get_post($target) : null;
		if (
			!$post ||
			!is_post_type_viewable($post->post_type) ||
			in_array($post->post_status, ['trash', 'inherit', 'auto-draft'], true)
		) {
			return new WP_Error('sd_inline_edit_not_found', __('This content no longer exists.'), ['status' => 404]);
		}

		if (!current_user_can('edit_post', $post->ID)) {
			return new WP_Error('sd_inline_edit_forbidden', __('You can’t edit this page.'), ['status' => 403]);
		}

		return $post;
	}

	/**
	 * The ACF field stored under a meta name, if it's one of the given types.
	 *
	 * ACF saves a `_{name}` reference beside every value, pointing at the field key, which is how
	 * sub field names like `page_builder_0_content` map back to their field settings. Fields of rows
	 * that aren't saved yet come from their layouts, and a top-level field that has never been saved
	 * is found from the post's field groups.
	 */
	private function acf(string $name, int|string $acf_post_id, array $types): ?array
	{
		if (!function_exists('acf_get_reference') || $name[0] === '_') {
			return null;
		}

		$key = acf_get_reference($name, $acf_post_id);
		$field = is_string($key) && str_starts_with($key, 'field_') ? acf_get_field($key) : null;
		$field = $field ?: $this->virtual->find($name);

		if (!$field && is_int($acf_post_id)) {
			$field = acf_maybe_get_field($name, $acf_post_id);
			// Only a top-level field matches its own name; anything else needs its reference.
			$field = $field && $field['name'] === $name ? $field : null;
		}

		if (!$field || !in_array($field['type'], $types, true)) {
			return null;
		}

		// The reference has to belong to this name, so a stray reference can't point it at another field.
		if ($name !== $field['name'] && !str_ends_with($name, '_' . $field['name'])) {
			return null;
		}

		// ACF reads and writes sub field values under the full prefixed name.
		$field['name'] = $name;

		return $field;
	}

	/**
	 * Slug of an options page that shows this field and that the current user can open, or null.
	 */
	private function options_page(array $field): ?string
	{
		$top = $field;
		while (!empty($top['parent']) && ($parent = acf_get_field($top['parent']))) {
			$top = $parent;
		}

		$group = empty($top['parent']) ? false : acf_get_field_group($top['parent']);
		if (!$group || empty($group['location']) || !function_exists('acf_get_options_page')) {
			return null;
		}

		foreach ($group['location'] as $rules) {
			foreach ($rules as $rule) {
				if ($rule['param'] !== 'options_page' || $rule['operator'] !== '==') {
					continue;
				}

				$page = acf_get_options_page($rule['value']);
				if ($page && current_user_can($page['capability'])) {
					return $page['menu_slug'];
				}
			}
		}

		return null;
	}
}
