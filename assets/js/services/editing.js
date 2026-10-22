import { batch } from '@preact/signals'
import { lists, regions } from '../model/page'
import {
	activeField,
	draftsFound,
	editing,
	formatPanel,
	hoveredField,
	hoveredRow,
	lockedField,
	menuOpen,
	picker,
	touch,
	lastDeleted,
	settingsFor,
	dragging,
} from '../state/signals'
import { clearStatus } from '../state/status'
import { changesLabel, pendingChanges } from './changes'
import { clearDrafts, restoreDrafts } from './drafts'
import { startPresence, stopPresence } from './presence'
import { rememberEditing, reloadEditing } from './session'

/**
 * Turning edit mode on and off, and throwing changes away.
 */

export function startEditing() {
	if (editing.value) {
		return
	}
	try {
		document.execCommand('defaultParagraphSeparator', false, 'p')
		document.execCommand('styleWithCSS', false, false)
	} catch {
		// Not supported everywhere, and only affects tidiness.
	}

	document.documentElement.classList.add('sd-inline-editing')
	regions.forEach(region => region.activate())
	editing.value = true
	lists.forEach(list => list.markEmpty(true))
	rememberEditing(true)
	startPresence()
	clearStatus()
	touch()
}

export function stopEditing() {
	if (!editing.value) {
		return
	}
	const { lists: changedLists, count } = pendingChanges()
	if (count && !window.confirm('Discard your unsaved changes?')) {
		return
	}
	clearDrafts()
	rememberEditing(false)
	stopPresence()

	// Added, moved and deleted blocks are only on this page, so a reload puts it back as saved.
	if (changedLists.length) {
		location.reload()
		return
	}

	batch(() => {
		editing.value = false
		closeEverything()
	})
	document.documentElement.classList.remove('sd-inline-editing')
	regions.forEach(region => region.deactivate())
	lists.forEach(list => list.markEmpty(false))
	touch()
}

export function toggleEditing() {
	editing.value ? stopEditing() : startEditing()
}

export function discardChanges() {
	const { lists: changedLists, fields, count } = pendingChanges()
	if (!count || !window.confirm(`Discard ${changesLabel(count)}?`)) {
		return
	}
	clearDrafts()
	if (changedLists.length) {
		reloadEditing()
		return
	}
	fields.forEach(region => region.revert())
	clearStatus()
	touch()
}

export function restoreFoundDrafts() {
	const found = draftsFound.value || []
	draftsFound.value = null
	startEditing()
	restoreDrafts(found)
	touch()
}

export function dismissDrafts() {
	draftsFound.value = null
	clearDrafts()
}

function closeEverything() {
	activeField.value = null
	hoveredField.value = null
	hoveredRow.value = null
	lockedField.value = null
	menuOpen.value = false
	picker.value = null
	lastDeleted.value = null
	settingsFor.value = null
	dragging.value = null
	formatPanel.value = ''
}
