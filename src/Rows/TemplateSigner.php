<?php

namespace TheStartLabs\InlineEdit\Rows;

/**
 * Signs the row template a page names in `editable_rows()`, so the preview endpoint only renders
 * templates a page asked for, for the list it asked for them for.
 */
final class TemplateSigner
{
	public function isValid(string $template): bool
	{
		return (bool) preg_match('/^[A-Za-z0-9_\/-]+(\.[A-Za-z0-9_-]+)*\.twig$/D', $template) &&
			!str_contains($template, '..');
	}

	public function sign(string $field_key, string $template): string
	{
		return hash_hmac('sha256', "{$field_key}|{$template}", wp_salt('nonce'));
	}

	public function verify(string $field_key, string $template, string $signature): bool
	{
		return $this->isValid($template) && hash_equals($this->sign($field_key, $template), $signature);
	}
}
