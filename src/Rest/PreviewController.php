<?php

namespace TheStartLabs\InlineEdit\Rest;

use TheStartLabs\InlineEdit\Access;
use TheStartLabs\InlineEdit\Fields\Resolver;
use TheStartLabs\InlineEdit\Fields\Sanitizer;
use TheStartLabs\InlineEdit\Fields\VirtualRows;
use TheStartLabs\InlineEdit\Page\Registry;
use TheStartLabs\InlineEdit\Rows\RowFactory;
use TheStartLabs\InlineEdit\Rows\TemplateSigner;
use Timber\Timber;
use WP_Error;
use WP_REST_Request;

/**
 * Renders one row with its list's row template, so the editor can show it on the page without
 * saving: a new row, or an existing one with changed settings (`values`). The row's fields come back
 * editable, named as the editor knows them.
 */
final class PreviewController
{
	public function __construct(
		private Resolver $resolver,
		private VirtualRows $virtual,
		private RowFactory $rows,
		private TemplateSigner $signer,
		private Registry $registry,
		private Access $access,
	) {}

	public function handle(WP_REST_Request $request): mixed
	{
		if (!class_exists(Timber::class) || !$this->signer->verify($request['key'], $request['template'], $request['signature'])) {
			return new WP_Error('sd_inline_edit_invalid', __('That block can’t be shown here.'), ['status' => 400]);
		}

		$row = RowRequest::from($request, $this->resolver, $this->rows, $this->virtual);
		$raw = is_wp_error($row) ? $row : $row->rawValues($this->rows);
		if (is_wp_error($raw)) {
			$this->virtual->clear();

			return $raw;
		}

		$raw = $this->withSettings($row, $raw, (array) $request['values']);
		$values = $this->rows->format($row->list, $row->layout, $raw, $row->prefix, $row->post->ID);
		$html = $this->render($request['template'], [
			'post' => Timber::get_post($row->post->ID),
			'row' => $values,
			'block' => $values,
			'field_prefix' => $row->prefix,
			'index' => (int) $request['index'],
		]);
		$this->virtual->clear();

		if (trim($html) === '') {
			return new WP_Error('sd_inline_edit_preview', __('This block couldn’t be shown.'), ['status' => 500]);
		}

		return rest_ensure_response([
			'html' => $html,
			'regions' => $this->registry->fields(),
			'lists' => $this->registry->lists(),
		]);
	}

	/**
	 * Settings changed in the editor but not saved yet, cleaned as they would be on save.
	 */
	private function withSettings(RowRequest $row, array $raw, array $values): array
	{
		foreach ($row->fields as $sub) {
			if (!array_key_exists($sub['name'], $values) || !is_string($values[$sub['name']])) {
				continue;
			}
			$field = $this->resolver->field($row->post->ID, $row->prefix . $sub['name'], Resolver::SETTING_TYPES);
			$value = is_wp_error($field) ? $field : Sanitizer::clean($field, $values[$sub['name']]);
			if (!is_wp_error($value)) {
				$raw[$sub['key']] = $value;
			}
		}

		return $raw;
	}

	/**
	 * Render with editing on, collecting only the fields and lists this template prints.
	 */
	private function render(string $template, array $context): string
	{
		$this->registry->reset();

		return (string) $this->access->previewing(fn() => Timber::compile($template, $context));
	}
}
