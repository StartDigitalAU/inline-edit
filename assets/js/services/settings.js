import { config, SETTING_TYPES } from '../config'
import { settings, settingsOf } from '../model/page'
import { Setting } from '../model/Setting'
import { touch } from '../state/signals'
import { post } from './api'
import { record } from './history'
import { isStored, rowRequest } from './previews'
import { rerenderRow } from './rerender'

/**
 * Block settings (see services/rerender.js for how a change shows on the page).
 */

const loading = new WeakMap()

/** Whether a row has any settings, from the field types the server listed for it. */
export function hasSettings(list, row) {
	return list.fieldsOf(row).some(field => SETTING_TYPES.includes(field.type))
}

/**
 * A row's settings, fetched the first time they're asked for.
 */
export function loadSettings(list, row) {
	if (settingsOf(row).length) {
		return Promise.resolve(settingsOf(row))
	}
	if (!loading.has(row)) {
		const request = post(config.settingsEndpoint, rowRequest(list, row)).then(({ settings: found }) => {
			const isNew = !isStored(list, row)
			settings.push(...found.map(data => new Setting(data, { post: list.post, row, isNew })))
			touch()
			return settingsOf(row)
		})
		request.catch(() => loading.delete(row))
		loading.set(row, request)
	}
	return loading.get(row)
}

/**
 * Posts, pages or terms a setting can hold, matching what's typed (see src/Rest/ChoicesController.php).
 */
export async function searchChoices(list, row, setting, search) {
	const { choices } = await post(config.choicesEndpoint, { ...rowRequest(list, row), name: setting.name, search })
	return choices
}

/**
 * Change a setting and show it on the page, undoably.
 */
export async function changeSetting(list, setting, value) {
	const before = setting.value
	if (JSON.stringify(before) === JSON.stringify(value)) {
		return
	}
	const apply = async next => {
		setting.value = next
		touch()
		await rerenderRow(list, () => setting.row)
	}
	record({ label: `Change ${setting.label}`, undo: () => apply(before), redo: () => apply(value) })
	await apply(value)
}
