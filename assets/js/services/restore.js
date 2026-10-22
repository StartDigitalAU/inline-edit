import { focusPoints, liveLists, liveRegions, regions, savedName, settingsOf } from '../model/page'
import { FocusPoint } from '../model/FocusPoint'
import { rowInfo } from '../model/rows'
import { editing, touch } from '../state/signals'
import { setStatus } from '../state/status'
import { copyRow, createRow } from './blocks'
import { withoutDrafts } from './drafts'
import { clearHistory } from './history'
import { rerenderRow } from './rerender'
import { loadSettings } from './settings'

/**
 * Bring back a draft (see services/drafts.js) on a freshly loaded page: rows first, outermost lists
 * first (so everything inside them gets the names the draft knows them by), then field values,
 * settings and focus points. Anything changed on the page since the draft was kept is left as it is.
 */
export function restoreDraft(draft) {
	return withoutDrafts(async () => {
		let skipped = 0
		const skip = () => skipped++

		for (const entry of draft.lists || []) {
			const list = liveLists().find(item => item.post === entry.post && savedName(item.field, item.el) === entry.field)
			if (!list || !matches(list, entry)) {
				skip()
				continue
			}
			await reorder(list, entry.rows)
		}

		for (const entry of draft.fields || []) {
			const region = liveRegions().find(
				item => item.post === entry.post && savedName(item.field, item.element) === entry.field
			)
			if (!region || !region.isEditable || !matches(region, entry)) {
				skip()
				continue
			}
			if (region.kind === 'image') {
				region.showImage(entry.value, entry.image)
			} else {
				region.write(entry.value)
				region.refresh()
			}
		}

		await restoreSettings(draft.settings || [], skip)
		restoreFocusPoints(draft.images || [], skip)

		clearHistory()
		touch()
		if (skipped) {
			setStatus('error', 'Some changes couldn’t come back, as the page has changed since.')
		}
	})
}

/** Whether something is as it was when the draft was kept. */
function matches(item, entry) {
	return entry.original === null || (item.original === entry.original && item.base === entry.base)
}

/**
 * Put a list's rows in the draft's order: rows from the page (copied if they appear twice), and new
 * ones rendered again.
 */
async function reorder(list, order) {
	const loaded = new Map(list.rows().map(row => [rowInfo(row).origin.from, row]))
	const used = new Set()
	const rows = []

	for (const item of order) {
		if ('layout' in item) {
			rows.push(await createRow(list, item.layout))
			continue
		}
		const row = loaded.get(item.from)
		if (row) {
			rows.push(used.has(row) ? copyRow(row) : row)
			used.add(row)
		}
	}

	list.rows()
		.filter(row => !rows.includes(row))
		.forEach(row => row.remove())
	rows.forEach(row => list.el.append(row))
	list.markEmpty(editing.value)
}

async function restoreSettings(entries, skip) {
	const changedRows = new Map()

	for (const entry of entries) {
		const target = rowFor(entry)
		const loaded = target && (await loadSettings(target.list, target.row).catch(() => []))
		const setting = loaded?.find(item => savedName(item.field, item.row) === entry.field)
		if (!setting || !matches(setting, entry)) {
			skip()
			continue
		}
		setting.value = entry.shown
		changedRows.set(setting.row, { list: target.list, setting })
	}

	for (const { list, setting } of changedRows.values()) {
		await rerenderRow(list, () => setting.row)
	}
}

/**
 * The row a setting belongs to: the innermost one whose saved name its name starts with.
 */
function rowFor(entry) {
	let found = null
	let longest = 0
	for (const list of liveLists().filter(item => item.post === entry.post)) {
		const listName = savedName(list.field, list.el)
		list.rows().forEach((row, index) => {
			const prefix = `${listName}_${index}_`
			if (entry.field.startsWith(prefix) && prefix.length > longest) {
				found = { list, row }
				longest = prefix.length
			}
		})
	}
	return found
}

function restoreFocusPoints(entries, skip) {
	for (const { attachment, x, y } of entries) {
		const id = String(attachment)
		const region = regions.find(item => item.kind === 'image' && item.value === id && item.isConnected)
		if (!region) {
			skip()
			continue
		}
		if (!focusPoints.has(id)) {
			focusPoints.set(id, new FocusPoint(id, region.focus || [50, 50]))
		}
		focusPoints.get(id).set(x, y)
	}
}
