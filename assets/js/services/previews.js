import { config } from '../config'
import { rowsAround } from '../model/page'
import { isNewRow, rowInfo, temporaryIndex } from '../model/rows'
import { post } from './api'

/**
 * New rows rendered by the server (see src/Rest/PreviewController.php), fetched ahead of time while
 * the block picker is open, so a chosen block appears straight away.
 */

const prefetched = new Map()

export function prefetchPreview(list, layout) {
	const key = keyFor(list, layout)
	if (!prefetched.has(key)) {
		const request = fetchPreview(list, layout)
		request.catch(() => prefetched.delete(key))
		prefetched.set(key, request)
	}
}

/**
 * A preview for a new row: `{ preview: { html, regions, lists }, index }`, where `index` is the
 * temporary row index its field names were built with. Each preview is only used once.
 */
export function takePreview(list, layout) {
	const key = keyFor(list, layout)
	const request = prefetched.get(key) || fetchPreview(list, layout)
	prefetched.delete(key)
	return request
}

async function fetchPreview(list, layout) {
	const index = temporaryIndex()
	const preview = await post(config.previewEndpoint, {
		...listRequest(list),
		layout,
		index,
		stored: false,
	})
	return { preview, index }
}

/**
 * A new row copied from a saved one (see services/clipboard.js), rendered with its values.
 */
export async function fetchCopy(list, copy) {
	const index = temporaryIndex()
	const preview = await post(config.previewEndpoint, {
		...listRequest(list),
		layout: copy.layout,
		index,
		stored: false,
		source: copy.source,
	})
	return { preview, index }
}

/**
 * Render an existing row again, e.g. with changed settings (`values`, by sub field name).
 */
export function renderRow(list, row, values) {
	return post(config.previewEndpoint, { ...rowRequest(list, row), values })
}

/**
 * How the server finds a row: its list, layout, index, and whether it's saved yet.
 */
export function rowRequest(list, row) {
	const info = rowInfo(row)
	return {
		...listRequest(list),
		layout: info.layout,
		index: info.index,
		stored: isStored(list, row),
		...(info.origin.source ? { source: info.origin.source } : {}),
	}
}

/** Whether a row is saved: one loaded with the page, or a copy of one (which has its values). */
export function isStored(list, row) {
	return list.original !== null && 'from' in rowInfo(row).origin
}

/** The element a row template printed (it must print exactly one). */
export function toElement(html) {
	const template = document.createElement('template')
	template.innerHTML = html.trim()
	if (template.content.children.length !== 1) {
		throw new Error('The row template has to print exactly one element.')
	}
	return template.content.firstElementChild
}

function listRequest(list) {
	return {
		post: list.post,
		field: list.field,
		key: list.key,
		template: list.template,
		signature: list.signature,
		parents: unsavedParents(list),
	}
}

/**
 * Rows the list sits in that aren't saved yet, which the server needs to make sense of its name.
 */
export function unsavedParents(list) {
	return rowsAround(list.el)
		.filter(({ row }) => isNewRow(row))
		.map(({ list: parent, row }) => ({
			key: parent.key,
			prefix: `${parent.field}_${rowInfo(row).index}_`,
			layout: rowInfo(row).layout,
		}))
}

function keyFor(list, layout) {
	return `${list.post}|${list.field}|${layout}|${JSON.stringify(unsavedParents(list))}`
}
