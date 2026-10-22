import { signal } from '@preact/signals'

/**
 * Undo and redo for changes to blocks, images and settings. Typing has the browser's own undo while
 * you're in a field, so it isn't recorded here.
 *
 * A change is `{ label, undo(), redo() }`: it has already been made when it's recorded.
 */

const done = []
const undone = []

/** Labels of what Undo and Redo would do, for the bottom bar's buttons. */
export const history = signal({ undo: '', redo: '' })

export function record(change) {
	done.push(change)
	undone.length = 0
	publish()
}

export async function undo() {
	const change = done.pop()
	if (change) {
		undone.push(change)
		publish()
		await change.undo()
	}
}

export async function redo() {
	const change = undone.pop()
	if (change) {
		done.push(change)
		publish()
		await change.redo()
	}
}

/** After the page's blocks are swapped for saved ones, old changes point at elements that are gone. */
export function clearHistory() {
	done.length = 0
	undone.length = 0
	publish()
}

export function lastChange() {
	return done[done.length - 1] || null
}

function publish() {
	history.value = { undo: lastChange()?.label || '', redo: undone[undone.length - 1]?.label || '' }
}
