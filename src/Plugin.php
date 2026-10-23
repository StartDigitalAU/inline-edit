<?php

namespace TheStartLabs\InlineEdit;

use TheStartLabs\InlineEdit\Drafts\DraftStore;
use TheStartLabs\InlineEdit\Fields\Resolver;
use TheStartLabs\InlineEdit\Fields\VirtualRows;
use TheStartLabs\InlineEdit\Page\Assets;
use TheStartLabs\InlineEdit\Page\Registry;
use TheStartLabs\InlineEdit\Page\TwigFunctions;
use TheStartLabs\InlineEdit\Posts\PostUpdater;
use TheStartLabs\InlineEdit\Preview\SharedPreview;
use TheStartLabs\InlineEdit\Preview\ShareLinks;
use TheStartLabs\InlineEdit\Rest\DraftController;
use TheStartLabs\InlineEdit\Rest\PresenceController;
use TheStartLabs\InlineEdit\Rest\PreviewController;
use TheStartLabs\InlineEdit\Rest\Routes;
use TheStartLabs\InlineEdit\Rest\SaveController;
use TheStartLabs\InlineEdit\Rest\SettingsController;
use TheStartLabs\InlineEdit\Rest\ShareController;
use TheStartLabs\InlineEdit\Rows\RowFactory;
use TheStartLabs\InlineEdit\Rows\TemplateSigner;
use TheStartLabs\InlineEdit\Saving\ChangeWriter;

/**
 * Front-end editing for Timber and ACF sites.
 *
 * Templates mark what's editable with two Twig functions, which print a data attribute for users who
 * can edit it and nothing for anyone else:
 *
 * - `editable(post, field)` marks one field's element (see Page\TwigFunctions).
 * - `editable_rows(post, field, template)` marks the element holding a flexible content or repeater
 *   field's rows, so blocks can be added, moved, duplicated and deleted on the page.
 *
 * Nothing is written until the editor's Save, which sends block and text changes together
 * (see Rest\SaveController). Until then, changes are kept as a draft on the server (Drafts\DraftStore),
 * which can be shown to others with a preview link (Preview\SharedPreview).
 *
 * Hooks:
 * - `sd_inline_edit_enabled` (filter) return false to turn front-end editing off for a request.
 * - `sd_inline_edit_style_formats` (filter) the rich text "Formats" dropdown, as TinyMCE style_formats.
 * - `sd_inline_edit_text_colors` (filter) rich text's colours, as [['color' => '#ff0000', 'name' => 'Red'], ...].
 * - `sd_inline_edit_image_focus` (filter) an image's focus point as [x, y] percentages.
 * - `sd_inline_edit_save_image_focus` (action) store a focus point set on the page (see Images\FocusPoints).
 * - `sd_inline_edit_layout_thumbnail` (filter) a block layout's picture in the block picker.
 * - `sd_inline_edit_assets_url` (filter) the URL of this package's dist/ folder.
 * - `sd_inline_edit_saved` (action) after a save, with `$post_id` (or 'options') and the field names.
 */
final class Plugin
{
	public const REST_NAMESPACE = 'sd-inline-edit/v1';

	private static ?Plugin $instance = null;

	public static function boot(): Plugin
	{
		return self::$instance ??= new self();
	}

	private function __construct()
	{
		$access = new Access();
		$virtual = new VirtualRows();
		$rows = new RowFactory();
		$resolver = new Resolver($virtual, $rows);
		$signer = new TemplateSigner();
		$registry = new Registry($resolver, $signer);
		$writer = new ChangeWriter($resolver);
		$drafts = new DraftStore();
		$links = new ShareLinks();

		$twig = new TwigFunctions($access, $registry);
		$assets = new Assets($registry, $drafts, $links);
		$preview = new SharedPreview($resolver, $writer, $drafts, $links);
		$routes = new Routes(
			new SaveController($resolver, $writer, new PostUpdater()),
			new PreviewController($resolver, $virtual, $rows, $signer, $registry, $access),
			new SettingsController($resolver, $virtual, $rows),
			new PresenceController($resolver),
			new DraftController($resolver, $drafts),
			new ShareController($resolver, $links),
		);

		add_filter('timber/twig/functions', [$twig, 'register']);
		add_action('template_redirect', [$preview, 'apply'], 0);
		add_action('wp_footer', [$assets, 'enqueue'], 1);
		add_action('rest_api_init', [$routes, 'register']);
	}
}
