<?php

namespace TheStart\InlineEdit\Page;

use TheStart\InlineEdit\Fields\Resolver;
use TheStart\InlineEdit\Images\FocusPoints;
use TheStart\InlineEdit\Plugin;
use WP_Post;

/**
 * Loads the editor for users who can edit something on the page, and nothing for anyone else.
 */
final class Assets
{
	private const FONTS = 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap';

	public function __construct(private Registry $registry) {}

	public function enqueue(): void
	{
		if ($this->registry->isEmpty()) {
			return;
		}

		wp_enqueue_style('sd-inline-edit-font', self::FONTS, [], null);
		wp_enqueue_style('sd-inline-edit', $this->url('page.css'), [], $this->version('page.css'));
		wp_enqueue_script('sd-inline-edit', $this->url('inline-edit.js'), [], $this->version('inline-edit.js'), [
			'in_footer' => true,
			'strategy' => 'defer',
		]);

		if ($this->mayPickImages()) {
			wp_enqueue_media();
		}

		// JSON_HEX_TAG keeps field content from closing the script tag.
		wp_add_inline_script(
			'sd-inline-edit',
			'window.sdInlineEdit = ' . wp_json_encode($this->config(), JSON_HEX_TAG | JSON_HEX_AMP) . ';',
			'before',
		);
	}

	private function config(): array
	{
		return [
			'endpoint' => rest_url(Plugin::REST_NAMESPACE . '/save'),
			'previewEndpoint' => rest_url(Plugin::REST_NAMESPACE . '/preview'),
			'settingsEndpoint' => rest_url(Plugin::REST_NAMESPACE . '/settings'),
			'presenceEndpoint' => rest_url(Plugin::REST_NAMESPACE . '/presence'),
			'restRoot' => rest_url(),
			'nonce' => wp_create_nonce('wp_rest'),
			'nonceEndpoint' => admin_url('admin-ajax.php?action=rest-nonce'),
			'loginUrl' => wp_login_url(),
			// The editor's own UI styles, loaded inside its shadow root.
			'stylesheet' => add_query_arg('ver', $this->version('editor.css'), $this->url('editor.css')),
			'regions' => $this->registry->fields(),
			'lists' => $this->registry->lists(),
			'page' => $this->page(),
			'styleFormats' => StyleFormats::all(),
			'mediaEndpoint' => rest_url('wp/v2/media'),
			'focusPoints' => FocusPoints::supported(),
			// Field types edited in a block's settings panel.
			'settingTypes' => Resolver::SETTING_TYPES,
		];
	}

	/**
	 * An image field on the page, or a list that can add rows (which may have images).
	 */
	private function mayPickImages(): bool
	{
		return in_array('image', array_column($this->registry->fields(), 'kind'), true) ||
			(bool) array_filter(array_column($this->registry->lists(), 'template'));
	}

	/**
	 * The page being viewed, for the editor's menu, if the user can edit it.
	 */
	private function page(): ?array
	{
		$post = get_queried_object();
		if (!($post instanceof WP_Post) || !current_user_can('edit_post', $post->ID)) {
			return null;
		}

		$revisions = wp_revisions_enabled($post)
			? wp_get_post_revisions($post->ID, ['posts_per_page' => 1, 'fields' => 'ids'])
			: [];
		$editor = get_userdata((int) get_post_meta($post->ID, '_edit_last', true));

		return [
			'id' => (string) $post->ID,
			'title' => html_entity_decode(wp_strip_all_tags(get_the_title($post)), ENT_QUOTES | ENT_HTML5, 'UTF-8'),
			'editUrl' => get_edit_post_link($post->ID, 'raw'),
			'revisionsUrl' => $revisions ? admin_url('revision.php?revision=' . (int) reset($revisions)) : null,
			'modified' => get_post_modified_time('c', true, $post),
			'modifiedBy' => $editor ? $editor->display_name : null,
		];
	}

	private function version(string $file): string
	{
		return (string) (filemtime($this->distPath() . "/{$file}") ?: '');
	}

	/**
	 * The package can sit in a theme's vendor folder or anywhere else under the site root.
	 */
	private function url(string $file): string
	{
		$dir = $this->distPath();
		$url = '';

		foreach ([[WP_CONTENT_DIR, content_url()], [ABSPATH, site_url()]] as [$path, $root_url]) {
			$path = untrailingslashit(wp_normalize_path($path));
			if (str_starts_with($dir, "{$path}/")) {
				$url = untrailingslashit($root_url) . substr($dir, strlen($path));
				break;
			}
		}

		return untrailingslashit((string) apply_filters('sd_inline_edit_assets_url', $url)) . "/{$file}";
	}

	private function distPath(): string
	{
		return wp_normalize_path(dirname(__DIR__, 2) . '/dist');
	}
}
