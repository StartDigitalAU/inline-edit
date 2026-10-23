<?php

namespace TheStartLabs\InlineEdit;

/**
 * Something the page sends a fingerprint of, so a save can tell whether it changed since.
 */
interface Versioned
{
	public function fingerprint(): string;
}
