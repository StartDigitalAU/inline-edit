import { lists, rowAt } from '../model/page'
import { outlineOpen } from '../state/signals'
import { flash } from './blocks'

/**
 * The Blocks outline: the page's blocks (and the cards inside them) as a list to find and reorder
 * them by.
 */

const REMEMBERED = 'sdInlineEdit:outline'

/** Lists directly inside a row, e.g. a block's cards. */
export function listsIn(row) {
	return lists.filter(list => list.isConnected && rowAt(list.el)?.row === row)
}

/** A row's own heading, to tell blocks of the same kind apart. */
export function rowSummary(row) {
	const heading = row.querySelector('h1, h2, h3, h4')
	return heading?.textContent.trim().replace(/\s+/g, ' ') || ''
}

/** The row in the middle of the screen, which the outline marks as where you are. */
export { isNewRow } from '../model/rows'

export function rowInView(list) {
	const middle = window.innerHeight / 2
	return (
		list.rows().find(row => {
			const rect = row.getBoundingClientRect()
			return rect.top <= middle && rect.bottom >= middle
		}) || null
	)
}

export function goToRow(row) {
	row.scrollIntoView({ block: 'center', behavior: 'smooth' })
	flash(row)
}

export function toggleOutline(open = !outlineOpen.value) {
	outlineOpen.value = open
	try {
		localStorage.setItem(REMEMBERED, open ? '1' : '')
	} catch {
		// It just won't stay open next time.
	}
}

export function outlineWasOpen() {
	try {
		return localStorage.getItem(REMEMBERED) === '1'
	} catch {
		return false
	}
}
