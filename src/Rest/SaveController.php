<?php

namespace TheStart\InlineEdit\Rest;

use TheStart\InlineEdit\Fields\Resolver;
use TheStart\InlineEdit\Posts\PostUpdater;
use TheStart\InlineEdit\Posts\Transaction;
use TheStart\InlineEdit\Saving\ChangeSet;
use TheStart\InlineEdit\Saving\ChangeWriter;
use TheStart\InlineEdit\Saving\SaveErrors;
use WP_Error;
use WP_REST_Request;

/**
 * Saves everything the editor changed in one go (see Saving\ChangeWriter): refused while someone else
 * has a post open in the admin, written in one database transaction, then the posts updated as an
 * admin save would (revisions, `save_post`).
 */
final class SaveController
{
	public function __construct(
		private Resolver $resolver,
		private ChangeWriter $writer,
		private PostUpdater $updater,
	) {}

	public function handle(WP_REST_Request $request): mixed
	{
		$set = new ChangeSet($request['lists'], $request['changes'], $request['images']);
		if ($set->isEmpty()) {
			return new WP_Error('sd_inline_edit_empty', __('There’s nothing to save.'), ['status' => 400]);
		}

		$posts = $set->posts($this->resolver);
		$locked = $this->updater->lockedBy($posts);
		if ($locked) {
			return $locked;
		}

		$errors = new SaveErrors();
		$this->writer->check($set, $errors);
		if ($errors->any()) {
			return $errors->response();
		}

		$transaction = new Transaction($posts);
		$fields = $this->writer->write($set, $errors);
		if ($errors->any()) {
			$transaction->rollback();

			return $errors->response();
		}
		$transaction->commit();
		$this->writer->saveFocusPoints($set);

		$this->updater->saved($posts, $this->titles($fields), $this->names($set, $fields));

		return rest_ensure_response([
			'saved' => array_map(fn($item) => ['id' => $item['id']] + $item['field']->saved(), $fields),
		]);
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
	private function names(ChangeSet $set, array $fields): array
	{
		$names = [];
		foreach ($set->lists as $item) {
			$names[$this->resolver->target($item['post'])][] = $item['field'];
		}
		foreach ($fields as ['field' => $field]) {
			$names[$field->postId][] = $field->name;
		}

		return $names;
	}
}
