<?php

namespace TheStartLabs\InlineEdit\Rest;

use TheStartLabs\InlineEdit\Fields\Resolver;
use TheStartLabs\InlineEdit\Fields\VirtualRows;
use TheStartLabs\InlineEdit\Rows\RowFactory;
use WP_Error;
use WP_REST_Request;

/**
 * Searching what a post, page link, relationship or taxonomy setting can hold, with ACF's own
 * search for the field, so its settings (post types, taxonomies, filters) apply as in the admin.
 */
final class ChoicesController
{
	private const SEARCHES = [
		'post_object' => 'post_object',
		'page_link' => 'post_object',
		'relationship' => 'relationship',
		'taxonomy' => 'taxonomy',
	];

	public function __construct(
		private Resolver $resolver,
		private VirtualRows $virtual,
		private RowFactory $rows,
	) {}

	public function handle(WP_REST_Request $request): mixed
	{
		$row = RowRequest::from($request, $this->resolver, $this->rows, $this->virtual);
		$field = is_wp_error($row) ? $row : $this->resolver->field($row->post->ID, $row->prefix . $request['name'], Resolver::SETTING_TYPES);
		$this->virtual->clear();
		if (is_wp_error($field)) {
			return $field;
		}

		$type = self::SEARCHES[$field->type] ?? null;
		$search = $type ? acf_get_field_type($type) : null;
		if (!$search || !method_exists($search, 'get_ajax_query')) {
			return new WP_Error('sd_inline_edit_invalid', __('This field can’t be searched.'), ['status' => 400]);
		}

		$found = $search->get_ajax_query([
			'field_key' => $field->acf['key'],
			'post_id' => $row->post->ID,
			's' => (string) $request['search'],
		]);

		return rest_ensure_response(['choices' => $this->flatten($found['results'] ?? [])]);
	}

	/**
	 * ACF groups results (by post type, or by parent term); the editor shows one list.
	 */
	private function flatten(array $results): array
	{
		$choices = [];
		foreach ($results as $result) {
			if (!empty($result['children'])) {
				$choices = [...$choices, ...$this->flatten($result['children'])];
			} elseif (isset($result['id'])) {
				$choices[] = ['id' => (int) $result['id'], 'text' => html_entity_decode(wp_strip_all_tags((string) $result['text']), ENT_QUOTES | ENT_HTML5, 'UTF-8')];
			}
		}

		return $choices;
	}
}
