<?php

namespace TheStart\InlineEdit\Preview;

use TheStart\InlineEdit\Drafts\DraftStore;
use TheStart\InlineEdit\Fields\Resolver;
use TheStart\InlineEdit\Posts\Transaction;
use TheStart\InlineEdit\Saving\ChangeSet;
use TheStart\InlineEdit\Saving\ChangeWriter;
use TheStart\InlineEdit\Saving\SaveErrors;
use WP_Post;

/**
 * Shows a page with someone's unsaved changes, for anyone with a share link (see ShareLinks).
 *
 * The draft is applied inside a database transaction, with the same checks as a save made by the
 * person who shared it, the page renders from those values, and the transaction is rolled back when
 * the request ends, so nothing is ever saved. That needs a database that can roll back and no
 * persistent object cache (see Transaction::canRollBack()); otherwise the saved page shows.
 */
final class SharedPreview
{
	private ?Transaction $transaction = null;
	private string $notice = '';

	public function __construct(
		private Resolver $resolver,
		private ChangeWriter $writer,
		private DraftStore $drafts,
		private ShareLinks $links,
	) {}

	public function apply(): void
	{
		// Tokens are letters and digits (mixed case, so not sanitize_key(), which lowercases).
		$token = isset($_GET[ShareLinks::PARAM]) ? preg_replace('/[^A-Za-z0-9]/', '', (string) wp_unslash($_GET[ShareLinks::PARAM])) : '';
		$post = get_queried_object();
		if ($token === '' || !($post instanceof WP_Post)) {
			return;
		}

		$this->privatePage();
		$owner = $this->links->owner($post->ID, $token);
		$draft = $owner ? $this->drafts->get($post->ID, $owner) : null;

		if (!$owner) {
			$this->notice = __('This preview link has expired. This is the page as it’s published.');
		} elseif (!$draft || !Transaction::canRollBack()) {
			$this->notice = __('There are no unsaved changes to show. This is the page as it’s published.');
		} else {
			$this->applyDraft($post, $owner, ChangeSet::fromDraft($draft));
		}

		add_action('wp_footer', [$this, 'banner']);
	}

	/**
	 * Apply the draft as its owner, so the same permissions and checks as a save apply.
	 */
	private function applyDraft(WP_Post $post, int $owner, ChangeSet $set): void
	{
		$viewer = get_current_user_id();
		wp_set_current_user($owner);

		$this->transaction = new Transaction($set->posts($this->resolver));
		$errors = new SaveErrors();
		$this->writer->check($set, $errors);
		$fields = $errors->any() ? [] : $this->writer->write($set, $errors);
		if (!$errors->any()) {
			$this->writeTitles($fields);
		}

		wp_set_current_user($viewer);

		if ($errors->any()) {
			$this->transaction->rollback();
			$this->transaction = null;
			$this->notice = __('The page has changed since this preview was shared. This is the page as it’s published.');

			return;
		}

		$this->notice = sprintf(
			/* translators: %s: name of the person who shared the preview */
			__('Preview of unsaved changes by %s. Nothing here is published yet.'),
			get_userdata($owner)?->display_name ?: __('someone'),
		);
		add_action('shutdown', [$this, 'rollBack'], PHP_INT_MAX);
	}

	/**
	 * Titles are normally saved with the post (and its hooks); here they only need to show.
	 */
	private function writeTitles(array $fields): void
	{
		global $wpdb;
		foreach ($fields as ['field' => $field, 'value' => $value]) {
			if ($field->isTitle()) {
				$wpdb->update($wpdb->posts, ['post_title' => $value], ['ID' => $field->postId]);
				clean_post_cache($field->postId);
			}
		}
	}

	public function rollBack(): void
	{
		$this->transaction?->rollback();
		$this->transaction = null;
	}

	/**
	 * Not cached, indexed, or editable: it's one person's unsaved work.
	 */
	private function privatePage(): void
	{
		if (!defined('DONOTCACHEPAGE')) {
			define('DONOTCACHEPAGE', true);
		}
		nocache_headers();
		header('X-Robots-Tag: noindex, nofollow');
		add_filter('sd_inline_edit_enabled', '__return_false');
	}

	public function banner(): void
	{
		printf(
			'<div role="status" style="position:fixed;z-index:2147483000;left:50%%;bottom:20px;transform:translateX(-50%%);max-width:calc(100vw - 32px);padding:10px 16px;border-radius:999px;background:#0a0a0a;color:#ededed;font:500 13px/1.4 system-ui,-apple-system,sans-serif;box-shadow:0 0 0 1px rgb(255 255 255/.1),0 8px 24px rgb(0 0 0/.35)">%s</div>',
			esc_html($this->notice),
		);
	}
}
