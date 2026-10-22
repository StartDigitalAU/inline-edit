<?php

namespace TheStart\InlineEdit\Fields;

use TheStart\InlineEdit\Fingerprint;
use TheStart\InlineEdit\Images\FocusPoints;
use TheStart\InlineEdit\Versioned;
use WP_Error;

/**
 * One editable value: a post's title, or an ACF text, textarea, WYSIWYG or image field on a post or
 * options page. Knows how to read, describe, clean and write itself.
 */
final class Field implements Versioned
{
	public function __construct(
		public readonly int|string $postId,
		public readonly string $name,
		public readonly string $type,
		public readonly ?array $acf,
		public readonly string $editUrl,
	) {}

	public function isTitle(): bool
	{
		return $this->type === 'title';
	}

	/** Edited in a block's settings panel rather than on the page. */
	public function isSetting(): bool
	{
		return in_array($this->type, Resolver::SETTING_TYPES, true);
	}

	public function label(): string
	{
		return $this->isTitle() ? __('Title') : (string) $this->acf['label'];
	}

	/**
	 * The value as stored.
	 */
	public function raw(): mixed
	{
		return $this->isTitle()
			? get_post_field('post_title', $this->postId, 'raw')
			: acf_get_value($this->postId, $this->acf);
	}

	public function fingerprint(): string
	{
		return Fingerprint::of($this->raw());
	}

	/**
	 * How the editor treats this field, and the text it edits.
	 *
	 * @return array{kind: string, source: string, reason: string} kind is 'line', 'multi', 'rich',
	 *   'image' or 'locked'; a locked field's reason is 'html', 'readonly' or 'media'.
	 */
	public function state(): array
	{
		$raw = $this->raw();
		$locked = fn(string $reason) => ['kind' => 'locked', 'source' => '', 'reason' => $reason];

		if ($this->acf && (!empty($this->acf['readonly']) || !empty($this->acf['disabled']))) {
			return $locked('readonly');
		}

		if ($this->isSetting()) {
			return ['kind' => 'setting', 'source' => '', 'reason' => ''];
		}

		if ($this->type === 'image') {
			return current_user_can('upload_files')
				? ['kind' => 'image', 'source' => is_numeric($raw) ? (string) (int) $raw : '', 'reason' => '']
				: $locked('media');
		}

		if (!is_string($raw) && $raw !== null) {
			return $locked('html');
		}

		$raw = (string) $raw;

		if ($this->type === 'wysiwyg') {
			// Templates show the value through wpautop, so edit it the same way. Shortcodes and embeds
			// stay as their source text while editing, rather than being saved as rendered HTML.
			return ['kind' => 'rich', 'source' => shortcode_unautop(wpautop($raw)), 'reason' => ''];
		}

		// Plain fields are edited as text. One that holds HTML would lose it, so leave it to the admin.
		if (preg_match('/<[A-Za-z!\/?]/', $raw)) {
			return $locked('html');
		}

		return [
			'kind' => $this->type === 'textarea' ? 'multi' : 'line',
			'source' => html_entity_decode($raw, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
			'reason' => '',
		];
	}

	public function isLocked(): bool
	{
		return $this->state()['kind'] === 'locked';
	}

	/**
	 * The value as templates print it. For images, what the editor needs to update the <img>.
	 */
	public function rendered(): string|array
	{
		$raw = $this->raw();

		if ($this->isTitle()) {
			return (string) apply_filters('the_title', $raw, $this->postId);
		}

		if ($this->type === 'image') {
			$id = (int) $raw;

			return [
				'src' => $id ? (string) wp_get_attachment_url($id) : '',
				'alt' => $id ? (string) get_post_meta($id, '_wp_attachment_image_alt', true) : '',
				'position' => $id ? FocusPoints::cssPosition($id) : '',
			];
		}

		return (string) acf_format_value($raw, $this->postId, $this->acf);
	}

	/**
	 * Everything the editor script needs to edit this field.
	 */
	public function describe(): array
	{
		$state = $this->state();

		return [
			'post' => (string) $this->postId,
			'field' => $this->name,
			'kind' => $state['kind'],
			'label' => $this->label(),
			'source' => $state['source'],
			'reason' => $state['reason'],
			'base' => $this->fingerprint(),
			'editUrl' => $this->editUrl,
			// Where the image's focus point is, as [x, y] percentages.
			'focus' => $this->type === 'image' && is_numeric($this->raw()) ? FocusPoints::of((int) $this->raw()) : null,
			// Image fields set to "Uploaded to post" only offer that post's media.
			'uploadedTo' => $this->type === 'image' && ($this->acf['library'] ?? '') === 'uploadedTo' ? $this->postId : null,
		];
	}

	/**
	 * What the editor sends back after a save, so the page shows the stored value.
	 */
	public function saved(): array
	{
		if ($this->isSetting()) {
			return ['kind' => 'setting', 'value' => SettingControl::value($this), 'base' => $this->fingerprint()];
		}

		$state = $this->state();

		return [
			'kind' => $state['kind'],
			'source' => $state['source'],
			'base' => $this->fingerprint(),
			'rendered' => $this->rendered(),
		];
	}

	/**
	 * Clean a submitted value for this field, and check it the way the admin would.
	 */
	public function prepare(string $value): mixed
	{
		if ($this->isLocked()) {
			return new WP_Error('sd_inline_edit_locked', __('This field can only be edited in the admin.'), ['status' => 400]);
		}

		$value = Sanitizer::clean($this, $value);
		if (is_wp_error($value) || !$this->acf) {
			return $value;
		}

		acf_reset_validation_errors();
		if (!acf_validate_value($value, $this->acf, 'sd_inline_edit')) {
			$message = acf_get_validation_errors()[0]['message'] ?? __('This value isn’t valid.');

			return new WP_Error('sd_inline_edit_invalid', wp_strip_all_tags($message), ['status' => 400]);
		}

		return $value;
	}

	/**
	 * Store an ACF value. Titles are written with the post (see Posts\PostUpdater).
	 */
	public function write(mixed $value): void
	{
		if (!$this->isTitle()) {
			acf_update_value($value, $this->postId, $this->acf);
		}
	}
}
