# thestart/inline-edit

Front-end editing for Timber and ACF sites. Logged-in editors press **Edit page** (or `E`) and change the page right where it is:

- Text, rich text and images, with a formatting bar, link search and the media library.
- Blocks: add, move, duplicate and delete page builder blocks, and repeater rows such as cards.

Nothing is published until **Save**. Block changes and text changes are saved together, and **Discard** throws all of them away. For anyone who can't edit the page, including all logged-out visitors, nothing is printed and nothing loads.

## Install

```bash
composer require thestart/inline-edit
```

Composer's autoloader boots the package. Your theme must load `vendor/autoload.php` and use Timber 2 and ACF Pro.

## Mark what's editable

Templates mark fields with `editable()`. The element must contain only that field's output, or be the `<img>` of an image field:

```twig
<h1 {{ editable(post, 'title') }}>{{ post.title }}</h1>
<div {{ editable(post, field_prefix ~ 'content') }}>{{ block.content }}</div>
<span {{ editable('options', 'company_details_phone') }}>{{ options.company_details.phone }}</span>
```

It works with the post title and ACF text, textarea, WYSIWYG and image fields, including sub fields (use the full meta name, e.g. `page_builder_0_content`), on posts and options pages. To let editors fill in an empty field, still print the element for them. `editable()` returns `''` for everyone else:

```twig
{% if block.eyebrow or editable(post, field_prefix ~ 'eyebrow') %}
	<span {{ editable(post, field_prefix ~ 'eyebrow') }}>{{ block.eyebrow }}</span>
{% endif %}
```

## Mark blocks

`editable_rows()` marks the element holding a flexible content or repeater field's rows. Every direct child must be one row, in order, rendered by the template you name. The editor renders that same template to show a new row before it's saved:

```twig
<div {{ editable_rows(post, 'page_builder', 'partials/block.twig') }}>
	{% for row in post.meta('page_builder') %}
		{% include 'partials/block.twig' with { row: row, field_prefix: 'page_builder_' ~ loop.index0 ~ '_' } %}
	{% endfor %}
</div>
```

The row template gets `row` (also as `block`), `field_prefix` (the row's own prefix, e.g. `page_builder_2_`) and `post`. Repeaters inside blocks work the same way, e.g. `editable_rows(post, field_prefix ~ 'cards', 'partials/card.twig')`. Without a template, rows can still be moved, duplicated and deleted, but not added.

## Saving

Saving uses the same rules as the admin:

- The user's `edit_post` capability, or the options page capability.
- A REST nonce.
- ACF validation.
- `wp_kses_post` for users without `unfiltered_html`.

Plain text fields are always saved as text. A text field that already holds HTML can only be edited in the admin.

A save is refused if someone else changed the same field or blocks after the page loaded, or has the post open in the admin. Block and field changes are written in one database transaction, so a value that fails validation leaves nothing half saved. Each save makes a revision (including ACF values) and fires `save_post`.

## Hooks

| Hook | Type | Use |
| --- | --- | --- |
| `sd_inline_edit_enabled` | filter | Return `false` to turn editing off for a request. |
| `sd_inline_edit_style_formats` | filter | The rich text **Formats** dropdown, as TinyMCE `style_formats`. |
| `sd_inline_edit_image_position` | filter | A swapped image's CSS `object-position`, e.g. from a focus point. |
| `sd_inline_edit_assets_url` | filter | The URL of `dist/`, if it can't be worked out from the path. |
| `sd_inline_edit_saved` | action | After a save, with the post ID (or `'options'`) and the saved names. |

## Working on the package

The editor UI is a Preact app styled with Tailwind, in a shadow root so the page's styles and the editor's never mix. `dist/` is committed, so sites don't need Node.

```bash
npm install
npm run dev    # rebuild on change
npm run build  # before committing
```

- **`src/` (PHP):**
  - `Plugin` wires everything up.
  - `Fields\Resolver` turns names into `Field` and `Rows\RowList` objects the user may edit.
  - `Page\*` covers the Twig functions and loading the editor.
  - `Rest\*` holds the save and preview endpoints.
- **`assets/js/`:**
  - `model/` holds the fields and row lists on the page.
  - `services/` does the work: saving, blocks, formatting, drafts.
  - `state/` holds the signals.
  - `events/` holds the page and keyboard listeners.
  - `ui/` holds one component per piece of the interface.
