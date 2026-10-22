import { computed } from '@preact/signals'
import { liveLists, liveRegions, liveSettings, rowsAround } from '../model/page'
import { revision } from '../state/signals'

/**
 * Everything not saved yet: lists whose rows were added, moved, duplicated or deleted (outermost
 * first, as they must be saved), fields with changed values, and changed settings.
 */
export function pendingChanges() {
	const lists = liveLists()
		.filter(list => list.hasChanges())
		.sort((a, b) => rowsAround(a.el).length - rowsAround(b.el).length)
	const fields = liveRegions().filter(region => region.dirty)
	const settings = liveSettings().filter(setting => setting.dirty)

	return { lists, fields, settings, count: lists.length + fields.length + settings.length }
}

export const pending = computed(() => {
	revision.value
	return pendingChanges()
})

export function changesLabel(count) {
	return `${count} unsaved ${count === 1 ? 'change' : 'changes'}`
}
