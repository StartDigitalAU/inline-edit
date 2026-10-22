<?php

namespace TheStart\InlineEdit\Rest;

use WP_Error;

/**
 * Problems with a save, each tied to the change it's about (by the id the editor gave it), so the
 * editor can point at the field or block that needs attention.
 */
final class SaveErrors
{
	private array $errors = [];

	public function add(string $id, WP_Error $error): void
	{
		$this->errors[] = [
			'id' => $id,
			'code' => $error->get_error_code(),
			'message' => $error->get_error_message(),
			'status' => $error->get_error_data()['status'] ?? 400,
		];
	}

	public function any(): bool
	{
		return (bool) $this->errors;
	}

	public function response(): WP_Error
	{
		return new WP_Error('sd_inline_edit_failed', $this->errors[0]['message'], [
			'status' => max(array_column($this->errors, 'status')),
			'errors' => $this->errors,
		]);
	}
}
