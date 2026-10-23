<?php

namespace TheStartLabs\InlineEdit\Fields;

/**
 * Rows that only exist in the editor so far. Their fields have no ACF reference in the database yet,
 * so they're found from the row's layout instead, by the temporary prefix the editor gave the row.
 */
final class VirtualRows
{
	/** @var array<int, array{prefix: string, fields: array}> */
	private array $rows = [];

	public function add(string $prefix, array $fields): void
	{
		$this->rows[] = ['prefix' => $prefix, 'fields' => $fields];
	}

	/**
	 * The sub field a name points at in one of these rows, or null.
	 */
	public function find(string $name): ?array
	{
		foreach ($this->rows as $row) {
			if (!str_starts_with($name, $row['prefix'])) {
				continue;
			}
			$found = FieldTree::find($row['fields'], substr($name, strlen($row['prefix'])));
			if ($found) {
				return $found;
			}
		}

		return null;
	}

	public function clear(): void
	{
		$this->rows = [];
	}
}
