import { savedName } from '../model/page'
import { imageState } from '../model/images'
import { pendingChanges } from './changes'

/**
 * Everything not saved yet, described by name (see services/changes.js and savedName()). This is
 * what Save sends, and what's kept as a draft, which also needs a little more to show it again
 * (an image's picture, a setting's value as the panel shows it).
 */
export function describeChanges() {
	const { lists, fields, settings, focus } = pendingChanges()
	const loaded = item => (item.original === null ? {} : { base: item.base })

	return {
		lists: lists.map((list, i) => ({
			id: `list${i}`,
			post: list.post,
			field: savedName(list.field, list.el),
			original: list.original,
			...loaded(list),
			rows: list.order(),
		})),
		fields: fields.map(region => ({
			id: region.id,
			post: region.post,
			field: savedName(region.field, region.element),
			original: region.original,
			...loaded(region),
			value: region.read(),
			...(region.kind === 'image' ? { image: imageState(region.element) } : {}),
		})),
		settings: settings.map(setting => ({
			id: setting.id,
			post: setting.post,
			field: savedName(setting.field, setting.row),
			original: setting.original,
			...loaded(setting),
			value: setting.serialize(),
			shown: setting.value,
		})),
		images: focus.map(point => ({ id: point.id, attachment: Number(point.attachment), x: point.x, y: point.y })),
	}
}

/**
 * The save endpoint's request (see src/Rest/Routes.php), without what's only kept for drafts.
 */
export function saveRequest({ lists, fields, settings, images }) {
	const change = ({ image, shown, ...item }) => item
	return { lists, changes: [...fields.map(change), ...settings.map(change)], images }
}
