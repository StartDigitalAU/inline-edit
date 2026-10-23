<?php

namespace TheStartLabs\InlineEdit\Rest;

use TheStartLabs\InlineEdit\Fields\Resolver;
use TheStartLabs\InlineEdit\Fields\SettingControl;
use TheStartLabs\InlineEdit\Fields\VirtualRows;
use TheStartLabs\InlineEdit\Rows\RowFactory;
use WP_REST_Request;

/**
 * A row's settings: the fields with nothing to click on the page (toggles, selects, numbers, links…),
 * for the block's settings panel.
 */
final class SettingsController
{
	public function __construct(
		private Resolver $resolver,
		private VirtualRows $virtual,
		private RowFactory $rows,
	) {}

	public function handle(WP_REST_Request $request): mixed
	{
		$row = RowRequest::from($request, $this->resolver, $this->rows, $this->virtual);
		if (is_wp_error($row)) {
			$this->virtual->clear();

			return $row;
		}

		$settings = [];
		foreach ($row->fields as $sub) {
			$field = $this->resolver->field($row->post->ID, $row->prefix . $sub['name'], Resolver::SETTING_TYPES);
			if (!is_wp_error($field)) {
				$settings[] = SettingControl::describe($field) + ['name' => $sub['name']];
			}
		}
		$this->virtual->clear();

		return rest_ensure_response(['settings' => $settings]);
	}
}
