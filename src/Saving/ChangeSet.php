<?php

namespace TheStart\InlineEdit\Saving;

use TheStart\InlineEdit\Fields\Resolver;

/**
 * What the editor wants saved: new orders of rows (`lists`), field values (`changes`, settings
 * included) and image focus points (`images`), in the shape the save endpoint takes (see
 * Rest\Routes). Comes from a save request, or from a draft for a shared preview.
 */
final class ChangeSet
{
	public function __construct(
		public readonly array $lists = [],
		public readonly array $changes = [],
		public readonly array $images = [],
	) {}

	/**
	 * A stored draft (see Drafts\DraftStore), which keeps extra details for restoring it in the editor.
	 */
	public static function fromDraft(array $draft): self
	{
		$pick = fn(array $items, array $keys) => array_map(
			fn($item) => array_intersect_key((array) $item, array_flip($keys)),
			array_values(array_filter($items, 'is_array')),
		);
		$change = ['id', 'post', 'field', 'original', 'base', 'value'];

		return new self(
			$pick($draft['lists'] ?? [], ['id', 'post', 'field', 'original', 'base', 'rows']),
			[...$pick($draft['fields'] ?? [], $change), ...$pick($draft['settings'] ?? [], $change)],
			$pick($draft['images'] ?? [], ['id', 'attachment', 'x', 'y']),
		);
	}

	public function isEmpty(): bool
	{
		return !$this->lists && !$this->changes && !$this->images;
	}

	/**
	 * Every post or options page the changes touch.
	 */
	public function posts(Resolver $resolver): array
	{
		$targets = array_map(fn($item) => $resolver->target($item['post'] ?? null), [...$this->lists, ...$this->changes]);

		return array_values(array_unique(array_filter($targets, fn($target) => $target !== null), SORT_REGULAR));
	}
}
