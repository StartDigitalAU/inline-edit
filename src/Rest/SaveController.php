<?php

namespace TheStart\InlineEdit\Rest;

use TheStart\InlineEdit\Fields\Field;
use TheStart\InlineEdit\Fields\Resolver;
use TheStart\InlineEdit\Fingerprint;
use TheStart\InlineEdit\Images\FocusPoints;
use TheStart\InlineEdit\Posts\PostUpdater;
use TheStart\InlineEdit\Posts\Transaction;
use TheStart\InlineEdit\Versioned;
use WP_Error;
use WP_REST_Request;

/**
 * Saves everything the editor changed in one go: new orders of rows (blocks added, moved, duplicated
 * or deleted), then field values.
 *
 * Each change names its field or list as it will be after the save (`field`) and as the page loaded
 * it (`original`, null for something in a new row), with the fingerprint it had then (`base`):
 *
 * 1. Nothing changed since the page loaded may be overwritten, so every `original` is checked first.
 * 2. Rows are reordered, outermost lists first, which also gives new rows their stored fields.
 * 3. Field values are checked and written under their new names.
 * 4. New image focus points are handed to the site (see Images\FocusPoints).
 *
 * Steps 2 and 3 run in one database transaction, so a value that fails validation leaves nothing
 * half saved.
 */
final class SaveController
{
	/** Fields on the page and in blocks' settings panels. */
	private const FIELD_TYPES = [...Resolver::FIELD_TYPES, ...Resolver::SETTING_TYPES];

	public function __construct(
		private Resolver $resolver,
		private PostUpdater $updater,
	) {}

	public function handle(WP_REST_Request $request): mixed
	{
		$lists = $request['lists'];
		$changes = $request['changes'];
		$images = $request['images'];
		if (!$lists && !$changes && !$images) {
			return new WP_Error('sd_inline_edit_empty', __('There’s nothing to save.'), ['status' => 400]);
		}

		$posts = $this->posts($lists, $changes);
		$locked = $this->updater->lockedBy($posts);
		if ($locked) {
			return $locked;
		}

		$errors = new SaveErrors();
		$this->checkUnchanged($lists, $changes, $errors);
		foreach ($images as $image) {
			$problem = FocusPoints::problem($image['attachment']);
			if ($problem) {
				$errors->add($image['id'], $problem);
			}
		}
		if ($errors->any()) {
			return $errors->response();
		}

		$transaction = new Transaction($posts);
		$this->reorder($lists, $errors);
		$fields = $errors->any() ? [] : $this->prepare($changes, $errors);
		if ($errors->any()) {
			$transaction->rollback();

			return $errors->response();
		}

		foreach ($fields as ['field' => $field, 'value' => $value]) {
			$field->write($value);
		}
		$transaction->commit();

		foreach ($images as $image) {
			FocusPoints::save($image['attachment'], $image['x'], $image['y']);
		}

		$this->updater->saved($posts, $this->titles($fields), $this->names($lists, $fields));

		return rest_ensure_response([
			'saved' => array_map(fn($item) => ['id' => $item['id']] + $item['field']->saved(), $fields),
		]);
	}

	/**
	 * Every post or options page the save touches.
	 */
	private function posts(array $lists, array $changes): array
	{
		$targets = array_map(fn($item) => $this->resolver->target($item['post']), [...$lists, ...$changes]);

		return array_values(array_unique(array_filter($targets, fn($target) => $target !== null), SORT_REGULAR));
	}

	/**
	 * Check each change's field or list as the page loaded it: still editable, and not changed since.
	 * Changes in new rows only need their post to be editable.
	 */
	private function checkUnchanged(array $lists, array $changes, SaveErrors $errors): void
	{
		$checks = [
			[$lists, fn($post, $name) => $this->resolver->list($post, $name)],
			[$changes, fn($post, $name) => $this->resolver->field($post, $name, self::FIELD_TYPES)],
		];

		foreach ($checks as [$items, $resolve]) {
			foreach ($items as $item) {
				$post = $this->resolver->target($item['post']);
				$loaded = isset($item['original']) ? $resolve($post, $item['original']) : $this->resolver->post($post);
				$error = $this->problem($loaded, $item['base'] ?? null);
				if ($error) {
					$errors->add($item['id'], $error);
				}
			}
		}
	}

	private function problem(mixed $loaded, ?string $base): ?WP_Error
	{
		if (is_wp_error($loaded)) {
			return $loaded;
		}
		if ($loaded instanceof Versioned && !Fingerprint::unchanged($loaded, $base)) {
			return new WP_Error(
				'sd_inline_edit_conflict',
				__('This was changed by someone else after you opened the page. Reload to see the latest version.'),
				['status' => 409],
			);
		}

		return null;
	}

	private function reorder(array $lists, SaveErrors $errors): void
	{
		foreach ($lists as $item) {
			$list = $this->resolver->list($this->resolver->target($item['post']), $item['field']);
			$result = is_wp_error($list) ? $list : $list->reorder($item['rows']);
			if (is_wp_error($result)) {
				$errors->add($item['id'], $result);

				return;
			}
		}
	}

	/**
	 * Each change's field (under its new name) and cleaned value.
	 *
	 * @return array<int, array{id: string, field: Field, value: mixed}>
	 */
	private function prepare(array $changes, SaveErrors $errors): array
	{
		$prepared = [];
		foreach ($changes as $item) {
			$field = $this->resolver->field($this->resolver->target($item['post']), $item['field'], self::FIELD_TYPES);
			$value = is_wp_error($field) ? $field : $field->prepare($item['value']);
			if (is_wp_error($value)) {
				$errors->add($item['id'], $value);
				continue;
			}
			$prepared[] = ['id' => $item['id'], 'field' => $field, 'value' => $value];
		}

		return $prepared;
	}

	/**
	 * New titles by post ID, which are saved with the post itself.
	 */
	private function titles(array $fields): array
	{
		$titles = [];
		foreach ($fields as ['field' => $field, 'value' => $value]) {
			if ($field->isTitle()) {
				$titles[$field->postId] = $value;
			}
		}

		return $titles;
	}

	/**
	 * The names of everything saved, by post ID, for the `sd_inline_edit_saved` action.
	 */
	private function names(array $lists, array $fields): array
	{
		$names = [];
		foreach ($lists as $item) {
			$names[$this->resolver->target($item['post'])][] = $item['field'];
		}
		foreach ($fields as ['field' => $field]) {
			$names[$field->postId][] = $field->name;
		}

		return $names;
	}
}
