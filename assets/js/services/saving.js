import { config } from '../config'
import { regions, savedName } from '../model/page'
import { editing, busy, saving, touch } from '../state/signals'
import { setStatus } from '../state/status'
import { describeError, post } from './api'
import { pendingChanges } from './changes'
import { clearDrafts, saveDrafts } from './drafts'
import { reloadEditing } from './session'

/**
 * Save everything at once (see src/Rest/SaveController.php). Each change names its field or list
 * as it will be stored (`field`) and as the page loaded it (`original`), so the server can check
 * nothing changed since and then write it in its new place.
 */
export async function save() {
	const { lists, fields } = pendingChanges()
	if (!editing.value || saving.value || busy.value || (!lists.length && !fields.length)) {
		return
	}

	saving.value = true
	setStatus('saving', 'Saving…')

	const values = new Map(fields.map(region => [region, region.read()]))
	const listChanges = lists.map((list, i) => ({
		id: `list${i}`,
		post: list.post,
		field: savedName(list.field, list.el),
		original: list.original,
		base: list.original === null ? undefined : list.base,
		rows: list.order(),
	}))
	const fieldChanges = fields.map(region => ({
		id: region.id,
		post: region.post,
		field: savedName(region.field, region.element),
		original: region.original,
		base: region.original === null ? undefined : region.base,
		value: values.get(region),
	}))

	try {
		const result = await post(config.endpoint, { lists: listChanges, changes: fieldChanges })

		// Blocks moved, so field names did too; reload to pick up the saved page.
		if (lists.length) {
			clearDrafts()
			reloadEditing()
			return
		}

		for (const item of result.saved) {
			const region = regions.find(candidate => candidate.id === item.id)
			region?.markSaved(item, values.get(region))
		}
		if (config.page) {
			config.page.modified = new Date().toISOString()
			config.page.modifiedBy = 'you'
		}
		saveDrafts()
		setStatus('saved', 'Saved')
	} catch (error) {
		showErrors(error)
	}

	saving.value = false
	touch()
}

function showErrors(error) {
	for (const item of error.body?.data?.errors || []) {
		regions.find(region => region.id === item.id)?.setError(item.message)
	}
	const { message, link } = describeError(error)
	setStatus('error', message, link)
}
