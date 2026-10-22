import { STORAGE } from '../config'
import { regions } from '../model/page'
import { draftsFound } from '../state/signals'
import { imageState, applyImage } from '../model/images'
import { pendingChanges } from './changes'

/**
 * Unsaved text and image changes survive a reload or an expired login in the same tab. Block changes
 * don't: they can't be matched up with a freshly loaded page, so leaving warns about them instead.
 */

let timer = 0

// Only fields that were on the page when it loaded, which a reload brings back.
const draftable = region => region.original !== null && !region.isCopy && region.isConnected

export function saveDrafts() {
	clearTimeout(timer)
	timer = setTimeout(() => {
		const { lists, fields } = pendingChanges()
		const drafts = {}
		for (const region of lists.length ? [] : fields.filter(draftable)) {
			drafts[region.draftKey] = {
				base: region.base,
				value: region.read(),
				image: region.kind === 'image' ? imageState(region.element) : undefined,
			}
		}
		write(Object.keys(drafts).length ? drafts : null)
	}, 300)
}

export function clearDrafts() {
	clearTimeout(timer)
	write(null)
}

/**
 * Drafts made against what's still on the page; anything saved since (by anyone) would be
 * overwritten, so those are dropped.
 */
export function findDrafts() {
	const drafts = read()
	const found = regions
		.filter(region => region.isEditable && draftable(region))
		.map(region => ({ region, draft: drafts?.[region.draftKey] }))
		.filter(({ region, draft }) => draft?.base === region.base && typeof draft.value === 'string')

	draftsFound.value = found.length ? found : null
	if (!found.length) {
		clearDrafts()
	}
}

export function restoreDrafts(found) {
	for (const { region, draft } of found) {
		if (region.kind === 'image') {
			region.value = draft.value
			if (draft.image) {
				region.elements.forEach(el => applyImage(el, draft.image))
			}
		} else {
			region.write(draft.value)
		}
		region.refresh()
	}
	saveDrafts()
}

function read() {
	try {
		return JSON.parse(sessionStorage.getItem(STORAGE.drafts) || 'null')
	} catch {
		return null
	}
}

function write(drafts) {
	try {
		if (drafts) {
			sessionStorage.setItem(STORAGE.drafts, JSON.stringify(drafts))
		} else {
			sessionStorage.removeItem(STORAGE.drafts)
		}
	} catch {
		// Drafts are a convenience; editing works without them.
	}
}
