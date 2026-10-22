import { liveRegions, forget, register, savedName } from '../model/page'
import { editing } from '../state/signals'
import { animate } from './motion'

/**
 * After a save that changed blocks, every field after the change has a new name. Rather than reload,
 * fetch the saved page and swap in each changed list, with what's typed since kept.
 *
 * Returns false if the saved page couldn't be matched up, so the caller can reload instead.
 */
export async function swapInSavedLists(changedLists) {
	const outermost = changedLists.filter(list => !changedLists.some(other => other !== list && other.el.contains(list.el)))
	const targets = outermost.map(list => ({ list, name: savedName(list.field, list.el) }))

	const page = await fetchPage()
	const fresh = targets.map(({ list, name }) => {
		const index = page.config?.lists.findIndex(candidate => candidate.post === list.post && candidate.field === name)
		return index >= 0 ? page.doc.querySelector(`[data-sd-rows="${index}"]`) : null
	})
	if (!page.config || fresh.some(el => !el)) {
		return false
	}

	await animate(
		() => {
			targets.forEach(({ list }, i) => replaceList(list, document.importNode(fresh[i], true), page.config))
		},
		{ rows: targets.flatMap(({ list }) => list.rows()) }
	)
	return true
}

function replaceList(list, el, config) {
	// Anything typed while saving is put back into the fresh fields.
	const typed = liveRegions()
		.filter(region => region.dirty && region.elements.some(node => list.el.contains(node)))
		.map(region => ({ name: savedName(region.field, region.element), value: region.read() }))

	forget(list.el)
	list.el.replaceWith(el)
	const added = register(el, config)

	if (editing.value) {
		added.regions.forEach(region => region.activate())
		added.lists.forEach(fresh => fresh.markEmpty(true))
	}
	for (const { name, value } of typed) {
		const region = added.regions.find(candidate => candidate.field === name)
		if (region?.isText) {
			region.write(value)
			region.refresh()
		}
	}
}

/**
 * The page as it's now saved, and the editor settings printed in it.
 */
async function fetchPage() {
	const response = await fetch(location.href, { credentials: 'same-origin', cache: 'no-store' })
	const doc = new DOMParser().parseFromString(await response.text(), 'text/html')
	const script = doc.getElementById('sd-inline-edit-js-before')?.textContent || ''
	const json = script.slice(script.indexOf('{'), script.lastIndexOf('}') + 1)
	let config = null
	try {
		config = JSON.parse(json)
	} catch {
		// Handled by the caller.
	}
	return { doc, config }
}
