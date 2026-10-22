<?php

namespace TheStart\InlineEdit\Rest;

use TheStart\InlineEdit\Plugin;
use WP_REST_Server;

/**
 * The editor's REST endpoints and the shape of what they accept. Each checks per-field permissions
 * itself; the permission callback only turns away users who can't edit anything.
 */
final class Routes
{
	// Generous limits that no real edit reaches, so a request can't make the server do unbounded work.
	private const MAX_ITEMS = 200;
	private const MAX_LENGTH = 500000;

	public function __construct(
		private SaveController $save,
		private PreviewController $preview,
		private SettingsController $settings,
	) {}

	public function register(): void
	{
		$canEdit = fn() => is_user_logged_in() && current_user_can('edit_posts');

		register_rest_route(Plugin::REST_NAMESPACE, '/save', [
			'methods' => WP_REST_Server::CREATABLE,
			'callback' => [$this->save, 'handle'],
			'permission_callback' => $canEdit,
			'args' => [
				'changes' => $this->listOf([
					'id' => $this->id(),
					'post' => $this->post(),
					'field' => $this->name(true),
					'original' => $this->original(),
					'base' => $this->fingerprint(),
					'value' => ['type' => 'string', 'required' => true, 'maxLength' => self::MAX_LENGTH],
				]),
				// New focus points for images.
				'images' => $this->listOf([
					'id' => $this->id(),
					'attachment' => ['type' => 'integer', 'required' => true, 'minimum' => 1],
					'x' => ['type' => 'number', 'required' => true, 'minimum' => 0, 'maximum' => 100],
					'y' => ['type' => 'number', 'required' => true, 'minimum' => 0, 'maximum' => 100],
				]),
				// New orders of rows, outermost lists first.
				'lists' => $this->listOf([
					'id' => $this->id(),
					'post' => $this->post(),
					'field' => $this->name(true),
					'original' => $this->original(),
					'base' => $this->fingerprint(),
					'rows' => [
						'type' => 'array',
						'required' => true,
						'maxItems' => self::MAX_ITEMS,
						'items' => $this->object([
							// An existing row's index in the list as the page loaded it...
							'from' => ['type' => 'integer', 'minimum' => 0],
							// ...or a new row of a layout ('' for a repeater).
							'layout' => $this->layout(),
						]),
					],
				]),
			],
		]);

		register_rest_route(Plugin::REST_NAMESPACE, '/preview', [
			'methods' => WP_REST_Server::CREATABLE,
			'callback' => [$this->preview, 'handle'],
			'permission_callback' => $canEdit,
			'args' => $this->row() + [
				'template' => ['type' => 'string', 'required' => true, 'maxLength' => 190],
				'signature' => $this->fingerprint(true),
				// Settings changed in the editor, by sub field name.
				'values' => [
					'type' => 'object',
					'default' => [],
					'additionalProperties' => ['type' => 'string', 'maxLength' => 2000],
				],
			],
		]);

		register_rest_route(Plugin::REST_NAMESPACE, '/settings', [
			'methods' => WP_REST_Server::CREATABLE,
			'callback' => [$this->settings, 'handle'],
			'permission_callback' => $canEdit,
			'args' => $this->row(),
		]);
	}

	/**
	 * One row, as the editor names it (see RowRequest).
	 */
	private function row(): array
	{
		return [
			'post' => $this->post(),
			'field' => $this->name(true),
			'key' => $this->fieldKey(),
			'layout' => $this->layout(),
			'index' => ['type' => 'integer', 'required' => true, 'minimum' => 0],
			// Whether the row is saved (or only exists in the editor so far).
			'stored' => ['type' => 'boolean', 'default' => false],
			// Unsaved rows this one sits in, so a card can be added to a block that's also new.
			'parents' => $this->listOf(
				[
					'key' => $this->fieldKey(),
					'prefix' => ['type' => 'string', 'required' => true, 'pattern' => '^[A-Za-z0-9_-]{1,190}_$'],
					'layout' => $this->layout(),
				],
				20,
			),
		];
	}

	private function listOf(array $properties, int $max = self::MAX_ITEMS): array
	{
		return ['type' => 'array', 'default' => [], 'maxItems' => $max, 'items' => $this->object($properties)];
	}

	private function object(array $properties): array
	{
		return ['type' => 'object', 'additionalProperties' => false, 'properties' => $properties];
	}

	private function id(): array
	{
		return ['type' => 'string', 'required' => true, 'pattern' => '^[A-Za-z0-9_-]{1,40}$'];
	}

	private function post(): array
	{
		return ['type' => 'string', 'required' => true, 'pattern' => '^(options|[1-9][0-9]{0,19})$'];
	}

	private function name(bool $required = false): array
	{
		return ['type' => 'string', 'required' => $required, 'pattern' => '^[A-Za-z0-9_-]{1,190}$'];
	}

	/** The name a field or list had when the page loaded, or null for one in a row that's new. */
	private function original(): array
	{
		return ['type' => ['string', 'null'], 'pattern' => '^[A-Za-z0-9_-]{1,190}$'];
	}

	private function fingerprint(bool $required = false): array
	{
		return ['type' => 'string', 'required' => $required, 'pattern' => '^[a-f0-9]{64}$'];
	}

	private function fieldKey(): array
	{
		return ['type' => 'string', 'required' => true, 'pattern' => '^field_[A-Za-z0-9]{1,60}$'];
	}

	private function layout(): array
	{
		return ['type' => 'string', 'default' => '', 'pattern' => '^[A-Za-z0-9_-]{0,190}$'];
	}
}
