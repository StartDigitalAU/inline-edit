/**
 * Events for the site's own scripts, so they can set up what the editor puts on the page (carousels,
 * scroll animations) and keep up with blocks moving. See "Site scripts" in the README.
 */

/**
 * `el` was just put on the page from new markup: a block added, duplicated, re-rendered with changed
 * settings, shown again, or a list swapped in after a save. Bubbles, so listen on `document`.
 */
export function rendered(el, reason) {
	if (el?.isConnected) {
		el.dispatchEvent(new CustomEvent('inline-edit:render', { bubbles: true, detail: { reason } }))
	}
}

/** Blocks were added, moved, removed or re-rendered, so things below them may have moved. */
export function layoutChanged() {
	document.dispatchEvent(new CustomEvent('inline-edit:change'))
}

/**
 * Edit mode is turning on (before any field is made editable, so the site can undo what its scripts
 * did to the page) or has turned off (after fields show their saved markup again).
 */
export function editingChanged(on) {
	document.dispatchEvent(new CustomEvent(on ? 'inline-edit:start' : 'inline-edit:stop'))
}
