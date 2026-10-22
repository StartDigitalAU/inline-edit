import { editing, hoveredRow, settingsFor, touch } from '../state/signals'
import { forget, lists, regions, register, settingsOf } from '../model/page'
import { rowInfo, setRowInfo } from '../model/rows'
import { setStatus } from '../state/status'
import { describeError } from './api'
import { animate } from './motion'
import { isStored, renderRow, toElement } from './previews'

/**
 * Show a row with its current settings, rendered again by the server with the list's row template.
 * Nothing is saved. What's been changed inside the row so far comes across: typed text, swapped
 * images, and lists of cards as they are (moved, added or deleted).
 */

// One at a time, each starting from the row as the last one left it: a re-render replaces the row's
// element and fields, which the next one has to see.
let queue = Promise.resolve()

/**
 * `currentRow()` gives the row when its turn comes (the element changes with every re-render).
 */
export function rerenderRow(list, currentRow) {
	const run = queue.then(() => rerender(list, currentRow()))
	queue = run.catch(() => {})
	return run
}

async function rerender(list, row) {
	if (!row.isConnected) {
		return
	}

	let preview, fresh
	try {
		const values = Object.fromEntries(settingsOf(row).map(setting => [setting.name, setting.serialize()]))
		preview = await renderRow(list, row, values)
		fresh = toElement(preview.html)
	} catch (error) {
		const { message, link } = describeError(error)
		setStatus('error', message, link)
		return
	}
	if (!row.isConnected) {
		return
	}

	setRowInfo(fresh, rowInfo(row))
	const carried = carryLists(row, fresh, preview)
	const changes = changedFields(row, carried)

	settingsOf(row).forEach(setting => (setting.row = fresh))
	forget(row)
	await animate(() => row.replaceWith(fresh), { rows: [row], added: () => [fresh] })

	const added = register(fresh, preview, { isNew: !isStored(list, fresh), except: carried })
	if (editing.value) {
		added.regions.forEach(region => region.activate())
	}
	lists.forEach(list => list.markEmpty(editing.value))
	for (const { field, apply } of changes) {
		const region = added.regions.find(candidate => candidate.field === field)
		if (region) {
			apply(region)
			region.refresh()
		}
	}

	if (hoveredRow.value?.row === row) {
		hoveredRow.value = { list, row: fresh }
	}
	if (settingsFor.value?.row === row) {
		settingsFor.value = { list, row: fresh }
	}
	touch()
}

/**
 * Lists of rows inside the row (e.g. its cards) keep their rows as they are, so changes to them aren't
 * lost: the rows move into the freshly rendered list element, which keeps its own markup (a setting
 * may have changed its classes, like a grid's columns).
 */
function carryLists(row, fresh, preview) {
	const inside = lists.filter(list => list.isConnected && row.contains(list.el) && list.el !== row)
	const outermost = inside.filter(list => !inside.some(other => other !== list && other.el.contains(list.el)))
	const carried = []

	for (const list of outermost) {
		const slot = [...fresh.querySelectorAll('[data-sd-rows]')].find(
			el => preview.lists[el.getAttribute('data-sd-rows')]?.field === list.field
		)
		if (slot) {
			slot.replaceChildren(...list.rows())
			list.el = slot
			carried.push(slot)
		}
	}
	return carried
}

/**
 * Unsaved changes to the row's own fields, to apply to the fresh ones.
 */
function changedFields(row, carried) {
	return regions
		.filter(region => region.dirty && region.elements.some(el => row.contains(el)))
		.filter(region => !region.elements.some(el => carried.some(list => list.contains(el))))
		.map(region => {
			if (region.kind === 'image') {
				const { value, image } = region.imageSnapshot()
				return { field: region.field, apply: fresh => fresh.showImage(value, image) }
			}
			const text = region.read()
			return { field: region.field, apply: fresh => fresh.write(text) }
		})
}
