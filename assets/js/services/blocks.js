import { lists, regions, register, settings } from '../model/page'
import { rowInfo, setRowInfo } from '../model/rows'
import { busy, editing, hoveredRow, lastDeleted, touch } from '../state/signals'
import { clearStatus, setStatus } from '../state/status'
import { describeError } from './api'
import { record } from './history'
import { animate } from './motion'
import { fetchCopy, takePreview, toElement } from './previews'
import { layoutChanged, rendered } from './site'

/**
 * Adding, moving, duplicating and deleting rows. Each changes the page straight away, animated and
 * undoable, and is only saved with everything else, so nothing is published until Save.
 */

export function moveRow(list, row, to) {
	const from = list.indexOf(row)
	if (to === from || to < 0 || to >= list.rows().length) {
		return
	}
	record({
		label: `Move ${list.rowLabel(row)}`,
		undo: () => place(list, row, from),
		redo: () => place(list, row, to),
	})
	return place(list, row, to)
}

export async function duplicateRow(list, row) {
	if (!list.canDuplicate(row)) {
		return
	}
	const copy = copyRow(row)
	const index = list.indexOf(row) + 1
	record({
		label: `Duplicate ${list.rowLabel(row)}`,
		undo: () => take(list, copy),
		redo: () => place(list, copy, index),
	})
	await place(list, copy, index)
	rendered(copy, 'duplicate')
}

export function deleteRow(list, row) {
	if (!list.canRemove()) {
		return
	}
	const label = list.rowLabel(row)
	const index = list.indexOf(row)
	const change = {
		label: `Delete ${label}`,
		undo: () => place(list, row, index),
		redo: () => take(list, row),
	}
	record(change)
	lastDeleted.value = { label: `${label} deleted`, change }
	return take(list, row)
}

/**
 * Add a new row of `layout` at `index`, or a copy of a saved row (`copy`, see services/clipboard.js).
 * A placeholder shows straight away while the server renders it (often already done: the block
 * picker fetches previews ahead).
 */
export async function addRow(list, index, layout = '', copy = null) {
	if (busy.value || !list.canAdd()) {
		return
	}
	const label = list.layout(layout)?.label || list.item
	busy.value = `Adding ${label}…`
	const placeholder = createPlaceholder(list, label)
	await animate(() => list.el.insertBefore(placeholder, list.rows()[index] || null), {
		rows: list.rows(),
		added: () => [placeholder],
	})

	try {
		const row = await createRow(list, layout, copy)
		await animate(() => placeholder.replaceWith(row), { rows: [placeholder], added: () => [row] })
		const at = list.indexOf(row)
		record({
			label: `Add ${label}`,
			undo: () => take(list, row),
			redo: () => place(list, row, at),
		})
		clearStatus()
		rendered(row, 'add')
		changed(row)
	} catch (error) {
		placeholder.remove()
		const { message, link } = describeError(error)
		setStatus('error', message, link)
	} finally {
		busy.value = ''
	}
}

/**
 * A new row of `layout`, rendered by the server and ready to put on the page, with its fields known.
 */
export async function createRow(list, layout, copy = null) {
	const { preview, index } = copy ? await fetchCopy(list, copy) : await takePreview(list, layout)
	const row = toElement(preview.html)
	setRowInfo(row, { index, origin: copy ? { source: copy.source } : { layout }, layout })
	const added = register(row, preview, { isNew: true })
	if (editing.value) {
		added.regions.forEach(region => region.activate())
	}
	return row
}

/** Put a row at an index in its list (moving it, or putting it back). */
async function place(list, row, index) {
	await animate(
		() => {
			const others = list.rows().filter(other => other !== row)
			list.el.insertBefore(row, others[index] || null)
		},
		{ rows: [...list.rows(), row] }
	)
	changed(row)
}

/** Take a row off the page. Its fields and lists stay known, for undo. */
async function take(list, row) {
	await animate(() => row.remove(), { rows: list.rows() })
	changed()
}

/**
 * A copy of a row, with copies of the fields and lists inside it. Its fields keep the original's
 * names until it's saved in its own position.
 */
export function copyRow(row) {
	const copy = row.cloneNode(true)
	const originals = [row, ...row.querySelectorAll('*')]
	const copies = [copy, ...copy.querySelectorAll('*')]
	const counterpart = new Map(originals.map((el, i) => [el, copies[i]]))

	originals.forEach(el => {
		if (rowInfo(el)) {
			setRowInfo(counterpart.get(el), { ...rowInfo(el) })
		}
	})
	lists
		.filter(list => row.contains(list.el))
		.forEach(list => lists.push(list.copyTo(counterpart.get(list.el))))
	regions
		.filter(region => region.elements.some(el => row.contains(el)))
		.forEach(region => {
			const elements = region.elements.filter(el => row.contains(el)).map(el => counterpart.get(el))
			regions.push(region.copyTo(elements))
		})
	settings
		.filter(setting => row.contains(setting.row))
		.forEach(setting => settings.push(setting.copyTo(counterpart.get(setting.row))))

	return copy
}

function createPlaceholder(list, label) {
	const placeholder = document.createElement('div')
	placeholder.setAttribute('data-sd-placeholder', `Adding ${label}…`)
	// In a grid of cards, one card's space rather than the full width.
	if (list.isHorizontal()) {
		placeholder.setAttribute('data-sd-placeholder-inline', '')
		placeholder.style.minHeight = `${list.rows()[0].offsetHeight}px`
	}
	return placeholder
}

/**
 * After any change to rows: refresh empty placeholders and counts, and show where the change is.
 */
function changed(row = null) {
	hoveredRow.value = null
	lists.forEach(list => list.markEmpty(editing.value))
	touch()
	layoutChanged()
	if (row?.isConnected) {
		row.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
		flash(row)
	}
}

export function flash(row) {
	row.removeAttribute('data-sd-flash')
	// Restart the animation if it's already running.
	void row.offsetWidth
	row.setAttribute('data-sd-flash', '')
	setTimeout(() => row.removeAttribute('data-sd-flash'), 1600)
}
