import { config } from '../config'
import { focusPoints, regions, settings } from '../model/page'
import { editing, busy, saving, touch } from '../state/signals'
import { setStatus } from '../state/status'
import { describeError, post } from './api'
import { pendingChanges } from './changes'
import { discardDraft } from './drafts'
import { clearHistory } from './history'
import { describeChanges, saveRequest } from './payload'
import { swapInSavedLists } from './refresh'
import { reloadEditing } from './session'

/**
 * Save everything at once (see src/Rest/SaveController.php). Each change names its field or list
 * as it will be stored and as the page loaded it, so the server can check nothing changed since and
 * then write it in its new place.
 */
export async function save() {
	const { lists, count } = pendingChanges()
	if (!editing.value || saving.value || busy.value || !count) {
		return
	}

	saving.value = true
	setStatus('saving', 'Saving…')
	const changes = describeChanges()

	try {
		const result = await post(config.endpoint, saveRequest(changes))
		markSaved(changes, result.saved)

		// Blocks moved, so field names did too: swap in the saved blocks (or reload if that fails).
		if (lists.length) {
			if (!(await swapInSavedLists(lists).catch(() => false))) {
				reloadEditing()
				return
			}
			// Undo can't reach blocks that were swapped out.
			clearHistory()
		}
		if (config.page) {
			config.page.modified = new Date().toISOString()
			config.page.modifiedBy = 'you'
		}
		// Nothing left to keep as a draft (unless more was typed while saving).
		if (!pendingChanges().count) {
			discardDraft()
		}
		setStatus('saved', 'Saved')
	} catch (error) {
		showErrors(error)
	}

	saving.value = false
	touch()
}

/**
 * What's stored now becomes what each field, setting and focus point compares against.
 */
function markSaved(changes, saved) {
	const sent = new Map([...changes.fields, ...changes.settings].map(item => [item.id, item]))
	for (const item of saved) {
		regions.find(region => region.id === item.id)?.markSaved(item, sent.get(item.id)?.value)
		settings.find(setting => setting.id === item.id)?.markSaved(item)
	}
	for (const { attachment } of changes.images) {
		focusPoints.get(String(attachment))?.markSaved()
	}
}

function showErrors(error) {
	for (const item of error.body?.data?.errors || []) {
		regions.find(region => region.id === item.id)?.setError(item.message)
	}
	const { message, link } = describeError(error)
	setStatus('error', message, link)
}
