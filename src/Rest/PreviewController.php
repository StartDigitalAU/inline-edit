<?php

namespace TheStart\InlineEdit\Rest;

use TheStart\InlineEdit\Access;
use TheStart\InlineEdit\Fields\Resolver;
use TheStart\InlineEdit\Fields\VirtualRows;
use TheStart\InlineEdit\Page\Registry;
use TheStart\InlineEdit\Rows\RowFactory;
use TheStart\InlineEdit\Rows\TemplateSigner;
use Timber\Timber;
use WP_Error;
use WP_REST_Request;

/**
 * Renders a new, unsaved row with its list's row template, so the editor can show it on the page.
 * Nothing is saved. The row's fields come back editable under a temporary row index, which the
 * editor swaps for the row's real position when it saves.
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
		$invalid = new WP_Error('sd_inline_edit_invalid', __('That block can’t be added here.'), ['status' => 400]);

		$post = $this->resolver->post($this->resolver->target($request['post']));
		if (is_wp_error($post)) {
			return $post;
		}

		if (!class_exists(Timber::class) || !$this->signer->verify($request['key'], $request['template'], $request['signature'])) {
			return $invalid;
		}

		$list = $this->listField($request['key'], $request['field']);
		if (!$list || !$this->addParents($request['parents'])) {
			return $invalid;
		}

		$prefix = "{$request['field']}_{$request['index']}_";
		$fields = $this->rows->fields($list, $request['layout']);
		$row = $this->rows->formatted($list, $request['layout'], $prefix, $post->ID);
		if (is_wp_error($fields) || is_wp_error($row)) {
			return is_wp_error($fields) ? $fields : $row;
		}
		$this->virtual->add($prefix, $fields);

		$html = $this->render($request['template'], [
			'post' => Timber::get_post($post->ID),
			'row' => $row,
			'block' => $row,
			'field_prefix' => $prefix,
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
	 * The list's ACF field, named as it is on the page (which may be inside a row that's also new).
	 */
	private function listField(string $key, string $name): ?array
	{
		$field = acf_get_field($key);
		if (!$field || !in_array($field['type'], Resolver::LIST_TYPES, true)) {
			return null;
		}
		$field['name'] = $name;

		return $field;
	}

	/**
	 * Unsaved rows the new row sits in, outermost first, so its fields resolve as theirs would.
	 */
	private function addParents(array $parents): bool
	{
		foreach ($parents as $parent) {
			$field = $this->listField($parent['key'], 'parent');
			$fields = $field ? $this->rows->fields($field, $parent['layout']) : null;
			if (!is_array($fields)) {
				return false;
			}
			$this->virtual->add($parent['prefix'], $fields);
		}

		return true;
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
