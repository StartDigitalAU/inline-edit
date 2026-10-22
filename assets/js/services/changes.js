import { computed } from '@preact/signals'
import { focusPoints, liveLists, liveRegions, liveSettings, rowsAround } from '../model/page'
import { revision } from '../state/signals'

/**
 * Everything not saved yet: lists whose rows were added, moved, duplicated or deleted (outermost
 * first, as they must be saved), fields with changed values, changed settings, and images' changed
 * focus points.
 */
export function pendingChanges() {
	const lists = liveLists()
		.filter(list => list.hasChanges())
		.sort((a, b) => rowsAround(a.el).length - rowsAround(b.el).length)
	const fields = liveRegions().filter(region => region.dirty)
	const settings = liveSettings().filter(setting => setting.dirty)
	const focus = [...focusPoints.values()].filter(point => point.dirty)

	return { lists, fields, settings, focus, count: lists.length + fields.length + settings.length + focus.length }
}

export const pending = computed(() => {
	revision.value
	return pendingChanges()
})

export function changesLabel(count) {
	return `${count} unsaved ${count === 1 ? 'change' : 'changes'}`
}
