<?php

namespace TheStart\InlineEdit;

/**
 * Change detection: a value's fingerprint is sent with the page and checked on save, so a save can't
 * overwrite something changed since the page loaded.
 */
final class Fingerprint
{
	public static function of(mixed $raw): string
	{
		return hash('sha256', is_string($raw) ? $raw : maybe_serialize($raw));
	}

	public static function unchanged(Versioned $item, ?string $fingerprint): bool
	{
		return is_string($fingerprint) && hash_equals($item->fingerprint(), $fingerprint);
	}
}
