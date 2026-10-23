# thestartlabs/inline-edit

Front-end editing for Timber and ACF sites. Logged-in editors press **Edit page** (or `E`) and change the page right where it is.

- **Text, rich text, links and images:**
  - A formatting bar with the site's own formats and text colours (the same as the admin editor's), plus link search.
  - Buttons and other links: their text, where they go (with page search) and whether they open in a new tab.
  - The media library.
  - Drag an image file onto an image to upload it.
  - Set an image's focus point on the page.
- **Blocks:**
  - Add, move (with the arrows or by dragging), duplicate, hide and delete page builder blocks and repeater rows such as cards.
  - Copy a block and paste it on another page (`⌘C` / `⌘V`, or the block toolbar and picker).
  - A block picker with thumbnails.
  - A settings panel for the fields with nothing to click on the page: toggles, selects, numbers, links, colours, galleries, files and post, page and category pickers, in sections following the field group's tabs and groups.
- **Undo and redo** for every change. Everything animates into place.
- **Phone and tablet previews** of the page as it is right now, unsaved changes included.
- **Nothing is published until Save:**
  - Unsaved changes are kept as a draft on the server, so they survive closing the tab or switching computers.
  - A preview link shows them to anyone, without publishing.
- **New pages:**
  - Start one from the editor and build it as a draft.
  - Draft pages can be edited on the page too.
  - **Publish** puts it live.
- **Other editors:** the editor holds WordPress's post lock while you work, and says who else is editing.

For anyone who can't edit the page, including all logged-out visitors, nothing is printed and nothing loads.

## Install

```bash
composer require thestartlabs/inline-edit
```

Composer's autoloader boots the package. Your theme must load `vendor/autoload.php` and use Timber 2 and ACF Pro. Saving and previews need PHP 8.1+.

## Mark what's editable

Templates mark fields with `editable()`. The element must contain only that field's output, or be the `<img>` of an image field:

```twig
<h1 {{ editable(post, 'title') }}>{{ post.title }}</h1>
<div {{ editable(post, field_prefix ~ 'content') }}>{{ block.content }}</div>
<span {{ editable('options', 'company_details_phone') }}>{{ options.company_details.phone }}</span>
```

It works with the post title and ACF text, textarea, WYSIWYG, image and link fields, including sub fields (use the full meta name, e.g. `page_builder_0_content`), on posts and options pages. For a link field, mark its `<a>`, which must contain only the link's text:

```twig
{% if block.button or editable(post, field_prefix ~ 'button') %}
	<a class="button" href="{{ block.button.url ?? '#' }}" {{ editable(post, field_prefix ~ 'button') }}>{{ block.button.title }}</a>
{% endif %}
```

Keep an editable element's content on the same line as its tag (a formatter breaking it onto its own lines adds whitespace the element then isn't empty of). To let editors fill in an empty field, still print the element for them. `editable()` returns `''` for everyone else:

```twig
{% if block.eyebrow or editable(post, field_prefix ~ 'eyebrow') %}
	<span {{ editable(post, field_prefix ~ 'eyebrow') }}>{{ block.eyebrow }}</span>
{% endif %}
```

## Mark blocks

`editable_rows()` marks the element holding a flexible content or repeater field's rows. Every direct child must be one row, in order, rendered by the template you name. The editor renders that same template to show a new row, or a row with changed settings, before it's saved:

```twig
<div {{ editable_rows(post, 'page_builder', 'partials/block.twig') }}>
	{% for item in rows_of(post, 'page_builder') %}
		{% include 'partials/block.twig' with { row: item.row, field_prefix: item.prefix } %}
	{% endfor %}
</div>
```

`rows_of()` gives each row its real field prefix. Don't count with `loop.index0`: blocks hidden with ACF Extended aren't in the loop but keep their place, so counting would give every block after one the wrong field names.

The row template gets `row` (also as `block`), `field_prefix` (the row's own prefix, e.g. `page_builder_2_`) and `post`. Repeaters inside blocks work the same way, e.g. `editable_rows(post, field_prefix ~ 'cards', 'partials/card.twig')`. Without a template, rows can still be moved, duplicated and deleted, but not added, and settings can't be changed.

A block's true/false, select, radio, button group, number, range, URL, email, link, colour, gallery, file, post object, page link, relationship and taxonomy fields show in its settings panel automatically (links that are already editable on the page aren't repeated there). Fields inside groups are included too, and the panel is split into sections by the field group's tabs and groups. Post and term pickers search with ACF's own query, so the field's post type and taxonomy limits apply.

Galleries can be marked with `editable()` too. Clicking one opens the block's settings at the gallery, where images can be added, dragged into order and removed; the block re-renders with the change before it's saved.

## Copy and paste blocks

Select a block and press `⌘C` (or **Copy** in its toolbar), then on any page press `⌘V` or pick **Paste** in the block picker. The pasted block is the copied block's saved version, all of its fields included, and it's staged like any new block until Save. Blocks paste only into a list with the same field (e.g. any page's `page_builder`), and only for editors who can read the page it came from.

## Hidden blocks

With ACF Extended's **toggle** action on the field, blocks can be hidden from visitors without deleting them, from the block toolbar or the Blocks panel. Hidden blocks show as a slim bar while editing. This uses ACF Extended's own flag, so blocks hidden in the admin show as hidden here and the other way round (before ACF 6.5; ACF 6.5's own disabled layouts aren't supported yet).

## Draft pages

Pages that aren't published yet (draft, pending or scheduled) can be edited on the page by anyone who can edit them, and **Publish** in the bar puts them live. **New page** in the `⋯` menu starts a draft page to build. While editing a draft, ACF reads the page's own values rather than its latest revision's, which is what the editor saves.

## Block thumbnails

The block picker shows a picture of each layout, from (in order):

1. ACF Extended's layout thumbnail.
2. An image in the theme's `thumbnails/` folder named after the layout, e.g. `thumbnails/text_with_image.jpg`.
3. The `sd_inline_edit_layout_thumbnail` filter.

To make the theme's images, build a page with one of each block and run:

```bash
npm run thumbnails -- https://site.test/that-page/ ../path/to/theme
```

## Saving

Saving uses the same rules as the admin:

- The user's `edit_post` capability, or the options page capability.
- A REST nonce.
- ACF validation.
- `wp_kses_post` for users without `unfiltered_html`.

Plain text fields are always saved as text. A text field that already holds HTML can only be edited in the admin.

A save is refused if someone else changed the same field or blocks after the page loaded, or holds the post lock. Block and field changes are written in one database transaction, so a value that fails validation leaves nothing half saved. Each save makes a revision (including ACF values) and fires `save_post`. Saving block changes swaps in the saved blocks without reloading the page.

## Drafts and preview links

Unsaved changes are stored per person and page (user meta) a moment after each change, and cleared on Save or Discard. Coming back to the page offers to restore them. Anything changed on the page by someone else since is left as it is.

**Copy preview link** in the editor's `⋯` menu makes a link (valid for 7 days, revocable) that shows the page with your draft applied.

- **How it works:** the server applies the draft inside a database transaction, using the same checks as a save made by you. It renders the page from those values, then rolls the transaction back, so nothing is ever saved.
- **When it's available:** only when the posts, postmeta and options tables are InnoDB and there's no persistent object cache.
- **Preview pages:** they're never cached or indexed, and never show the editor.

## Hooks

| Hook | Type | Use |
| --- | --- | --- |
| `sd_inline_edit_enabled` | filter | Return `false` to turn editing off for a request. |
| `sd_inline_edit_style_formats` | filter | The rich text **Formats** dropdown, as TinyMCE `style_formats`. |
| `sd_inline_edit_text_colors` | filter | Rich text's colour palette, as `[['color' => '#ff0000', 'name' => 'Red'], ...]`. Defaults to the admin editor's (TinyMCE's `textcolor_map`, or its standard colours). |
| `sd_inline_edit_image_focus` | filter | An image's focus point as `[x, y]` percentages. |
| `sd_inline_edit_save_image_focus` | action | Store a focus point set on the page: `($attachment_id, $x, $y)`. Focus points are only offered when this is handled. |
| `sd_inline_edit_layout_thumbnail` | filter | A layout's picture in the block picker. |
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
  - `Fields\Resolver` turns names into `Fields\Field` and `Rows\RowList` objects the user may edit.
  - `Saving\ChangeWriter` checks and writes a `Saving\ChangeSet`.
  - `Page\*` covers the Twig functions and loading the editor.
  - `Rest\*` holds the endpoints.
  - `Drafts\*` and `Preview\*` hold drafts and preview links.
- **`assets/js/`:**
  - `model/` holds what's on the page: `Region` (a field), `RowList`, `Setting` and `FocusPoint`.
  - `services/` does the work: saving, blocks, history, drafts, settings, uploads.
  - `state/` holds the signals.
  - `events/` holds the page and keyboard listeners.
  - `ui/` holds one component per piece of the interface.
