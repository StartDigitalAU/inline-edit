import { editing, touch } from '../state/signals'
import { register } from '../model/page'
import { hiddenPlaceholder, rowInfo, setRowInfo } from '../model/rows'
import { setStatus } from '../state/status'
import { describeError } from './api'
import { record } from './history'
import { animate } from './motion'
import { isStored, renderRow, toElement } from './previews'
import { layoutChanged, rendered } from './site'

/**
 * Hiding a block from visitors without deleting it (ACF Extended's toggle), and showing it again.
 * A hidden block is a placeholder on the page; its own element is kept for showing it again.
 */

const shownElements = new WeakMap()

export function toggleHidden(list, row) {
	return list.isHidden(row) ? showRow(list, row) : hideRow(list, row)
}

async function hideRow(list, row) {
	const placeholder = hiddenPlaceholder(list.rowLabel(row))
	setRowInfo(placeholder, { ...rowInfo(row), hidden: true })
	shownElements.set(placeholder, row)
	await swap(list, row, placeholder)
	record({
		label: `Hide ${list.rowLabel(row)}`,
		undo: () => swap(list, placeholder, row),
		redo: () => swap(list, row, placeholder),
	})
}

async function showRow(list, placeholder) {
	const isNew = !shownElements.has(placeholder)
	const row = shownElements.get(placeholder) || (await renderHidden(list, placeholder))
	if (!row) {
		return
	}
	setRowInfo(row, { ...rowInfo(placeholder), hidden: false })
	shownElements.set(placeholder, row)
	await swap(list, placeholder, row)
	if (isNew) {
		rendered(row, 'show')
	}
	record({
		label: `Show ${list.rowLabel(row)}`,
		undo: () => swap(list, row, placeholder),
		redo: () => swap(list, placeholder, row),
	})
}

/**
 * A block that was hidden when the page loaded isn't on the page at all, so the server renders it.
 */
async function renderHidden(list, placeholder) {
	try {
		const preview = await renderRow(list, placeholder, {})
		const row = toElement(preview.html)
		const added = register(row, preview, { isNew: !isStored(list, placeholder) })
		if (editing.value) {
			added.regions.forEach(region => region.activate())
		}
		return row
	} catch (error) {
		const { message, link } = describeError(error)
		setStatus('error', message, link)
		return null
	}
}

async function swap(list, from, to) {
	await animate(() => from.replaceWith(to), { rows: [from], added: () => [to] })
	list.markEmpty(editing.value)
	touch()
	layoutChanged()
}
