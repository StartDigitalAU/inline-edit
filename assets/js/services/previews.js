import { config } from '../config'
import { rowsAround } from '../model/page'
import { rowInfo, temporaryIndex } from '../model/rows'
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
		post: list.post,
		field: list.field,
		key: list.key,
		template: list.template,
		signature: list.signature,
		layout,
		index,
		parents: unsavedParents(list),
	})
	return { preview, index }
}

/**
 * Rows the list sits in that aren't saved yet, which the server needs to make sense of its name.
 */
export function unsavedParents(list) {
	return rowsAround(list.el)
		.filter(({ row }) => 'layout' in rowInfo(row).origin)
		.map(({ list: parent, row }) => ({
			key: parent.key,
			prefix: `${parent.field}_${rowInfo(row).index}_`,
			layout: rowInfo(row).layout,
		}))
}

function keyFor(list, layout) {
	return `${list.post}|${list.field}|${layout}|${JSON.stringify(unsavedParents(list))}`
}
