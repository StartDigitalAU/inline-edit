import { config } from '../config'
import { lists, regions, register, rowsAround } from '../model/page'
import { rowInfo, setRowInfo, temporaryIndex } from '../model/rows'
import { busy, editing, hoveredRow, touch, undo } from '../state/signals'
import { clearStatus, setStatus } from '../state/status'
import { describeError, post } from './api'
import { clearDrafts } from './drafts'

/**
 * Adding, moving, duplicating and deleting rows. Each changes the page straight away and is only
 * saved with everything else, so nothing is published until Save.
 */

export function moveRow(list, row, offset) {
	const rows = list.rows()
	const target = rows[rows.indexOf(row) + offset]
	if (!target) {
		return
	}
	if (offset < 0) {
		target.before(row)
	} else {
		target.after(row)
	}
	changed(row)
}

export function duplicateRow(list, row) {
	if (!list.canDuplicate(row)) {
		return
	}
	const copy = copyRow(row)
	row.after(copy)
	changed(copy)
}

export function deleteRow(list, row) {
	if (!list.canRemove()) {
		return
	}
	const label = list.rowLabel(row)
	const next = row.nextElementSibling
	row.remove()
	changed()

	undo.value = {
		label: `${label} deleted`,
		restore() {
			list.el.insertBefore(row, next?.parentElement === list.el ? next : null)
			undo.value = null
			changed(row)
		},
	}
}

/**
 * Add a new row of `layout` at `index`, rendered by the server from the list's row template.
 */
export async function addRow(list, index, layout = '') {
	if (busy.value || !list.canAdd()) {
		return
	}
	const label = list.layout(layout)?.label || list.item
	busy.value = `Adding ${label}…`
	setStatus('saving', busy.value)

	try {
		const temporary = temporaryIndex()
		const preview = await post(config.previewEndpoint, {
			post: list.post,
			field: list.field,
			key: list.key,
			template: list.template,
			signature: list.signature,
			layout,
			index: temporary,
			parents: unsavedParents(list),
		})

		const row = toElement(preview.html)
		const rows = list.rows()
		list.el.insertBefore(row, rows[index] || null)
		setRowInfo(row, { index: temporary, origin: { layout }, layout })

		const added = register(row, preview, { isNew: true })
		if (editing.value) {
			added.regions.forEach(region => region.activate())
		}
		clearStatus()
		changed(row)
	} catch (error) {
		const { message, link } = describeError(error)
		setStatus('error', message, link)
	} finally {
		busy.value = ''
	}
}

/**
 * Rows the list sits in that aren't saved yet, which the server needs to make sense of its name.
 */
function unsavedParents(list) {
	return rowsAround(list.el)
		.filter(({ row }) => 'layout' in rowInfo(row).origin)
		.map(({ list: parent, row }) => ({
			key: parent.key,
			prefix: `${parent.field}_${rowInfo(row).index}_`,
			layout: rowInfo(row).layout,
		}))
}

/**
 * A copy of a row, with copies of the fields and lists inside it. Its fields keep the original's
 * names until it's saved in its own position.
 */
function copyRow(row) {
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

	return copy
}

function toElement(html) {
	const template = document.createElement('template')
	template.innerHTML = html.trim()
	if (template.content.children.length !== 1) {
		throw new Error('The row template has to print exactly one element.')
	}
	return template.content.firstElementChild
}

/**
 * After any change to rows: refresh empty placeholders and counts, and show where the change is.
 */
function changed(row = null) {
	hoveredRow.value = null
	lists.forEach(list => list.markEmpty(editing.value))
	// Block changes can't be restored after a reload, so earlier text drafts would be misleading.
	clearDrafts()
	touch()
	if (row) {
		flash(row)
	}
}

function flash(row) {
	row.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
	row.removeAttribute('data-sd-flash')
	// Restart the animation if it's already running.
	void row.offsetWidth
	row.setAttribute('data-sd-flash', '')
	setTimeout(() => row.removeAttribute('data-sd-flash'), 1600)
}
