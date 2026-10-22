/**
 * Where each row element came from, kept beside the element:
 *
 * - `index`: the row's index when it was rendered, which its fields' names were built with
 *   (`page_builder_2_content`). New rows get a temporary index.
 * - `origin`: what's saved for it, `{ from: index }` for a stored row or `{ layout }` for a new one.
 * - `layout`: its flexible content layout ('' in a repeater).
 */
const info = new WeakMap()

export function rowInfo(row) {
	return info.get(row)
}

export function setRowInfo(row, details) {
	info.set(row, details)
}

let lastTemporaryIndex = 1000000

/** An index for a new row's field names that can't clash with a stored row's. */
export function temporaryIndex() {
	return ++lastTemporaryIndex
}
