import { computed } from '@preact/signals'
import { liveLists, liveRegions, rowsAround } from '../model/page'
import { revision } from '../state/signals'

/**
 * Everything not saved yet: lists whose rows were added, moved, duplicated or deleted (outermost
 * first, as they must be saved), and fields with changed values.
 */
export function pendingChanges() {
	const lists = liveLists()
		.filter(list => list.hasChanges())
		.sort((a, b) => rowsAround(a.el).length - rowsAround(b.el).length)
	const fields = liveRegions().filter(region => region.dirty)

	return { lists, fields, count: lists.length + fields.length }
}

export const pending = computed(() => {
	revision.value
	return pendingChanges()
})

export function changesLabel(count) {
	return `${count} unsaved ${count === 1 ? 'change' : 'changes'}`
}
