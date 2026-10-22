<?php

namespace TheStart\InlineEdit;

use TheStart\InlineEdit\Fields\Resolver;
use TheStart\InlineEdit\Fields\VirtualRows;
use TheStart\InlineEdit\Page\Assets;
use TheStart\InlineEdit\Page\Registry;
use TheStart\InlineEdit\Page\TwigFunctions;
use TheStart\InlineEdit\Posts\PostUpdater;
use TheStart\InlineEdit\Rest\PreviewController;
use TheStart\InlineEdit\Rest\Routes;
use TheStart\InlineEdit\Rest\SaveController;
use TheStart\InlineEdit\Rest\SettingsController;
use TheStart\InlineEdit\Rows\RowFactory;
use TheStart\InlineEdit\Rows\TemplateSigner;

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
 * (see Rest\SaveController).
 *
 * Hooks:
 * - `sd_inline_edit_enabled` (filter) return false to turn front-end editing off for a request.
 * - `sd_inline_edit_style_formats` (filter) the rich text "Formats" dropdown, as TinyMCE style_formats.
 * - `sd_inline_edit_image_position` (filter) an image's CSS object-position, e.g. from a focus point.
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

		$twig = new TwigFunctions($access, $registry);
		$assets = new Assets($registry);
		$routes = new Routes(
			new SaveController($resolver, new PostUpdater()),
			new PreviewController($resolver, $virtual, $rows, $signer, $registry, $access),
			new SettingsController($resolver, $virtual, $rows),
		);

		add_filter('timber/twig/functions', [$twig, 'register']);
		add_action('wp_footer', [$assets, 'enqueue'], 1);
		add_action('rest_api_init', [$routes, 'register']);
	}
}
