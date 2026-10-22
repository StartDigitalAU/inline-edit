<?php

namespace TheStart\InlineEdit\Page;

use TheStart\InlineEdit\Fields\Resolver;
use TheStart\InlineEdit\Rows\TemplateSigner;

/**
 * The fields and row lists printed on the page, in the order the editor script receives them.
 * Templates refer to each by its index (`data-sd-edit="3"`, `data-sd-rows="0"`).
 */
final class Registry
{
	/** @var array<int, array> */
	private array $fields = [];

	/** @var array<string, int|false> "post:field" => index into $fields, or false if not editable. */
	private array $fieldIndex = [];

	/** @var array<int, array> */
	private array $lists = [];

	/** @var array<string, int|false> */
	private array $listIndex = [];

	public function __construct(
		private Resolver $resolver,
		private TemplateSigner $signer,
	) {}

	/**
	 * The index of a field on the page, or null if the current user can't edit it.
	 */
	public function field(mixed $target, string $name): ?int
	{
		$post_id = $this->resolver->target($target);
		$key = "{$post_id}:{$name}";

		if (!array_key_exists($key, $this->fieldIndex)) {
			$field = $this->resolver->field($post_id, $name);
			$this->fieldIndex[$key] = is_wp_error($field) ? false : $this->push($this->fields, $field->describe());
		}

		return $this->fieldIndex[$key] === false ? null : $this->fieldIndex[$key];
	}

	/**
	 * The index of a row list on the page, or null if the current user can't change it.
	 */
	public function list(mixed $target, string $name, string $template): ?int
	{
		$post_id = $this->resolver->target($target);
		$key = "{$post_id}:{$name}";

		if (!array_key_exists($key, $this->listIndex)) {
			$list = $this->resolver->list($post_id, $name);
			if (is_wp_error($list)) {
				$this->listIndex[$key] = false;
			} else {
				$template = $this->signer->isValid($template) ? $template : '';
				$signature = $template === '' ? '' : $this->signer->sign($list->acf['key'], $template);
				$this->listIndex[$key] = $this->push($this->lists, $list->describe($template, $signature));
			}
		}

		return $this->listIndex[$key] === false ? null : $this->listIndex[$key];
	}

	public function fields(): array
	{
		return $this->fields;
	}

	public function lists(): array
	{
		return $this->lists;
	}

	public function isEmpty(): bool
	{
		return !$this->fields && !$this->lists;
	}

	/**
	 * Start over, so a preview returns only what its own template printed.
	 */
	public function reset(): void
	{
		$this->fields = $this->fieldIndex = $this->lists = $this->listIndex = [];
	}

	private function push(array &$items, array $item): int
	{
		$items[] = $item;

		return count($items) - 1;
	}
}
