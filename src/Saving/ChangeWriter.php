<?php

namespace TheStart\InlineEdit\Saving;

use TheStart\InlineEdit\Fields\Field;
use TheStart\InlineEdit\Fields\Resolver;
use TheStart\InlineEdit\Fingerprint;
use TheStart\InlineEdit\Images\FocusPoints;
use TheStart\InlineEdit\Versioned;
use WP_Error;

/**
 * Checks and writes a ChangeSet. Each change names its field or list as it will be after the save
 * (`field`) and as the page loaded it (`original`, null for something in a new row), with the
 * fingerprint it had then (`base`):
 *
 * 1. check(): nothing changed since the page loaded may be overwritten, so every `original` is checked.
 * 2. write(): rows are reordered, outermost lists first (which gives new rows their stored fields),
 *    then field values are cleaned, validated and written under their new names.
 *
 * Callers wrap write() in a transaction (see Posts\Transaction), as it writes as it goes.
 */
final class ChangeWriter
{
	/** Fields on the page and in blocks' settings panels. */
	private const FIELD_TYPES = [...Resolver::FIELD_TYPES, ...Resolver::SETTING_TYPES];

	public function __construct(private Resolver $resolver) {}

	public function check(ChangeSet $set, SaveErrors $errors): void
	{
		$checks = [
			[$set->lists, fn($post, $name) => $this->resolver->list($post, $name)],
			[$set->changes, fn($post, $name) => $this->resolver->field($post, $name, self::FIELD_TYPES)],
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

		foreach ($set->images as $image) {
			$error = FocusPoints::problem((int) $image['attachment']);
			if ($error) {
				$errors->add($image['id'], $error);
			}
		}
	}

	/**
	 * Write the rows and field values (not focus points, which aren't in the database transaction:
	 * see saveFocusPoints()).
	 *
	 * @return array<int, array{id: string, field: Field, value: mixed}> What was written.
	 */
	public function write(ChangeSet $set, SaveErrors $errors): array
	{
		foreach ($set->lists as $item) {
			$list = $this->resolver->list($this->resolver->target($item['post']), $item['field']);
			$result = is_wp_error($list) ? $list : $list->reorder($item['rows']);
			if (is_wp_error($result)) {
				$errors->add($item['id'], $result);

				return [];
			}
		}

		$fields = [];
		foreach ($set->changes as $item) {
			$field = $this->resolver->field($this->resolver->target($item['post']), $item['field'], self::FIELD_TYPES);
			$value = is_wp_error($field) ? $field : $field->prepare((string) $item['value']);
			if (is_wp_error($value)) {
				$errors->add($item['id'], $value);
				continue;
			}
			$fields[] = ['id' => $item['id'], 'field' => $field, 'value' => $value];
		}

		if (!$errors->any()) {
			foreach ($fields as ['field' => $field, 'value' => $value]) {
				$field->write($value);
			}
		}

		return $fields;
	}

	public function saveFocusPoints(ChangeSet $set): void
	{
		foreach ($set->images as $image) {
			FocusPoints::save((int) $image['attachment'], (float) $image['x'], (float) $image['y']);
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
}
