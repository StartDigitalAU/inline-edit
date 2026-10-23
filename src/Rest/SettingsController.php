<?php

namespace TheStartLabs\InlineEdit\Rest;

use TheStartLabs\InlineEdit\Fields\FieldTree;
use TheStartLabs\InlineEdit\Fields\Resolver;
use TheStartLabs\InlineEdit\Fields\SettingControl;
use TheStartLabs\InlineEdit\Fields\VirtualRows;
use TheStartLabs\InlineEdit\Rows\RowFactory;
use TheStartLabs\InlineEdit\Rows\RowSource;
use WP_REST_Request;

/**
 * A row's settings: the fields with nothing to click on the page (toggles, selects, numbers, links,
 * galleries, posts…), including those in groups, each with its section (the layout's tab, or its
 * group), for the block's settings panel.
 */
final class SettingsController
{
	public function __construct(
		private Resolver $resolver,
		private VirtualRows $virtual,
		private RowFactory $rows,
		private RowSource $sources,
	) {}

	public function handle(WP_REST_Request $request): mixed
	{
		$row = RowRequest::from($request, $this->resolver, $this->rows, $this->virtual, $this->sources);
		if (is_wp_error($row)) {
			$this->virtual->clear();

			return $row;
		}

		$settings = [];
		foreach (FieldTree::walk($row->fields, Resolver::SETTING_TYPES) as ['name' => $name, 'section' => $section]) {
			$field = $this->resolver->field($row->post->ID, $row->prefix . $name, Resolver::SETTING_TYPES);
			// A pasted block's settings are the copied block's until it's saved.
			if (!is_wp_error($field) && $row->isCopy()) {
				$field = $field->withRaw($row->copied($name));
			}
			if (!is_wp_error($field)) {
				$settings[] = SettingControl::describe($field) + ['name' => $name, 'section' => $section];
			}
		}
		$this->virtual->clear();

		return rest_ensure_response(['settings' => $settings]);
	}
}
