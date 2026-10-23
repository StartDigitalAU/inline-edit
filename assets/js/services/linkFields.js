import { linkEditing } from '../state/signals'
import { fieldChanged } from './fields'
import { record } from './history'

/**
 * Editing a link field (a button, say) in a popover by its <a>. Each change shows straight away;
 * closing the popover makes the whole edit one step to undo.
 */

let before = ''

export function openLinkEditor(region, el) {
	before = region.read()
	linkEditing.value = { region, el }
}

export function updateLink(region, link) {
	region.write(link)
	fieldChanged(region)
}

export function closeLinkEditor() {
	const current = linkEditing.value
	linkEditing.value = null
	if (!current) {
		return
	}
	const { region } = current
	const from = before
	const to = region.read()
	if (from !== to) {
		record({
			label: `Edit ${region.label.toLowerCase()}`,
			undo: () => updateLink(region, from),
			redo: () => updateLink(region, to),
		})
	}
}
