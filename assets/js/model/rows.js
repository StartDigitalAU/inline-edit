/**
 * Where each row element came from, kept beside the element:
 *
 * - `index`: the row's index when it was rendered, which its fields' names were built with
 *   (`page_builder_2_content`). New rows get a temporary index.
 * - `origin`: what's saved for it, `{ from: index }` for a stored row or `{ layout }` for a new one.
 * - `layout`: its flexible content layout ('' in a repeater).
 * - `hidden` / `wasHidden`: hidden from visitors (ACF Extended's toggle), now and when it loaded.
 *   A hidden row is on the page as a placeholder (see hiddenPlaceholder()).
 */
const info = new WeakMap()

export function rowInfo(row) {
	return info.get(row)
}

export function setRowInfo(row, details) {
	info.set(row, details)
}

/**
 * What stands in for a hidden block: a slim bar, only shown while editing.
 */
export function hiddenPlaceholder(label) {
	const el = document.createElement('div')
	el.setAttribute('data-sd-hidden-row', `Hidden · ${label}`)
	return el
}

let lastTemporaryIndex = 1000000

/** An index for a new row's field names that can't clash with a stored row's. */
export function temporaryIndex() {
	return ++lastTemporaryIndex
}
