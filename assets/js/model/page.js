import { Region } from './Region'
import { RowList } from './RowList'
import { rowInfo, setRowInfo } from './rows'

/**
 * Everything editable on the page: fields (Regions) and row lists (RowLists), including ones added
 * since it loaded (new and duplicated rows).
 */
export const regions = []
export const lists = []
/** Settings of rows, loaded when a block's settings panel first opens. */
export const settings = []

/**
 * Pick up what the server marked as editable inside `root`: elements with `data-sd-edit` and
 * `data-sd-rows`, whose values index into `data.regions` and `data.lists`. Anything inside `except`
 * is already known (e.g. a list carried over from a re-rendered row) and left alone.
 */
export function register(root, data, { isNew = false, except = [] } = {}) {
	const known = el => except.some(other => other.contains(el))
	const found = selector =>
		[...(root.matches?.(selector) ? [root] : []), ...root.querySelectorAll(selector)].filter(el => !known(el))
	const added = { regions: [], lists: [] }

	for (const el of found('[data-sd-rows]')) {
		const details = data.lists[el.getAttribute('data-sd-rows')]
		const list = details && new RowList(details, el, { isNew })
		if (!list || !rowsLineUp(list, details)) {
			continue
		}
		list.rows().forEach((row, index) =>
			setRowInfo(row, { index, origin: { from: index }, layout: details.rows[index] })
		)
		lists.push(list)
		added.lists.push(list)
	}

	const elementsByIndex = new Map()
	for (const el of found('[data-sd-edit]')) {
		const index = el.getAttribute('data-sd-edit')
		elementsByIndex.set(index, [...(elementsByIndex.get(index) || []), el])
	}
	for (const [index, elements] of elementsByIndex) {
		if (data.regions[index]) {
			const region = new Region(data.regions[index], elements, { isNew })
			regions.push(region)
			added.regions.push(region)
		}
	}

	return added
}

// Rows are saved by position, so they have to match the list's elements one to one.
function rowsLineUp(list, details) {
	const found = list.rows().length
	if (found === details.rows.length) {
		return true
	}
	console.warn(
		`Inline edit: "${list.field}" has ${details.rows.length} rows but ${found} child elements, so its rows can’t be changed on the page.`
	)
	return false
}

/**
 * Stop tracking the fields and lists inside `root` (and `root` itself), e.g. before it's replaced.
 */
export function forget(root) {
	const inside = el => root === el || root.contains(el)
	remove(regions, region => region.elements.some(inside))
	remove(lists, list => inside(list.el))
	remove(settings, setting => inside(setting.row))
}

function remove(items, shouldRemove) {
	for (let i = items.length - 1; i >= 0; i--) {
		if (shouldRemove(items[i])) {
			items.splice(i, 1)
		}
	}
}

export function regionFor(target) {
	const el = target instanceof Element ? target.closest('[data-sd-edit]') : null
	return el ? regions.find(region => region.elements.includes(el)) || null : null
}

/**
 * The innermost row an element is in (or is), e.g. a card inside a block.
 */
export function rowAt(target) {
	for (let el = target instanceof Element ? target : null; el?.parentElement; el = el.parentElement) {
		const list = lists.find(candidate => candidate.el === el.parentElement)
		if (list) {
			return { list, row: el }
		}
	}
	return null
}

/**
 * The rows an element sits in, outermost first.
 */
export function rowsAround(el) {
	const around = []
	for (let found = rowAt(el); found; found = rowAt(found.list.el)) {
		around.unshift(found)
	}
	return around
}

export const liveRegions = () => regions.filter(region => region.isConnected)
export const liveSettings = () => settings.filter(setting => setting.isConnected)
export const settingsOf = row => settings.filter(setting => setting.row === row)
export const liveLists = () => lists.filter(list => list.isConnected)

/**
 * A field or list's name once saved. Names include their row's position
 * (`page_builder_2_content`), so a row that moved, or is new, gets its fields renamed.
 */
export function savedName(name, el) {
	const found = rowAt(el)
	if (!found) {
		return name
	}
	const prefix = `${found.list.field}_${rowInfo(found.row).index}_`
	if (!name.startsWith(prefix)) {
		return name
	}
	const listName = savedName(found.list.field, found.list.el)
	return `${listName}_${found.list.indexOf(found.row)}_${name.slice(prefix.length)}`
}
