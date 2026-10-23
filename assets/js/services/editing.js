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
	linkEditing,
	settingsFor,
	dragging,
} from '../state/signals'
import { clearStatus } from '../state/status'
import { changesLabel, pendingChanges } from './changes'
import { discardDraft, withoutDrafts } from './drafts'
import { restoreDraft } from './restore'
import { startPresence, stopPresence } from './presence'
import { rememberEditing, reloadEditing } from './session'
import { editingChanged } from './site'

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

	// First, so the site can undo what its scripts did to the page (e.g. text split into words) before
	// fields are made editable.
	editingChanged(true)
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
	discardDraft()
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
	editingChanged(false)
}

export function toggleEditing() {
	editing.value ? stopEditing() : startEditing()
}

export function discardChanges() {
	const { lists: changedLists, fields, count } = pendingChanges()
	if (!count || !window.confirm(`Discard ${changesLabel(count)}?`)) {
		return
	}
	discardDraft()
	if (changedLists.length) {
		reloadEditing()
		return
	}
	fields.forEach(region => region.revert())
	clearStatus()
	touch()
}

/** Bring back the unsaved changes from before (see services/restore.js). */
export function restoreFoundDraft() {
	return withoutDrafts(async () => {
		const found = draftsFound.value
		draftsFound.value = null
		startEditing()
		await restoreDraft(found.draft)
	})
}

export function dismissDraft() {
	draftsFound.value = null
	discardDraft()
}

function closeEverything() {
	activeField.value = null
	hoveredField.value = null
	hoveredRow.value = null
	lockedField.value = null
	menuOpen.value = false
	picker.value = null
	lastDeleted.value = null
	linkEditing.value = null
	settingsFor.value = null
	dragging.value = null
	formatPanel.value = ''
}
