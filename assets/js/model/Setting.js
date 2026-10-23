let lastId = 0

/**
 * A row's setting: a field with nothing to click on the page (a toggle, select, number, link…),
 * changed in the block's settings panel. Like a Region it's saved by name with everything else, and
 * its name moves with its row (see savedName()).
 *
 * `value` is as the panel shows it: a boolean, number or string; a { url, title, target } link;
 * a { id, filename } file; { id, url } images (a gallery); or { id, text } posts or terms (a list
 * when the field takes several).
 */
export class Setting {
	constructor(data, { post, row, isNew }) {
		this.id = `s${++lastId}`
		this.post = post
		this.row = row
		this.field = data.field
		this.name = data.name
		this.label = data.label
		this.type = data.type
		this.instructions = data.instructions
		this.choices = data.choices
		this.allowNull = data.allowNull
		this.min = data.min
		this.max = data.max
		this.step = data.step
		this.placeholder = data.placeholder
		this.prepend = data.prepend
		this.append = data.append
		this.multiple = data.multiple
		this.mimeTypes = data.mimeTypes
		// The layout's tab or group it's under, which the panel shows as a heading.
		this.section = data.section || ''
		this.base = data.base

		// The stored name, or null for a setting of a row that hasn't been saved yet.
		this.original = isNew ? null : data.field
		this.value = data.value
		this.initial = data.value
	}

	get dirty() {
		return this.serialize() !== serialize(this.type, this.initial)
	}

	get isConnected() {
		return this.row.isConnected
	}

	/** The value as it's sent to the server. */
	serialize() {
		return serialize(this.type, this.value)
	}

	markSaved({ value, base }) {
		this.value = value
		this.initial = value
		this.base = base
	}

	/** The same setting on a duplicated row. */
	copyTo(row) {
		return Object.assign(Object.create(Setting.prototype), this, { id: `s${++lastId}`, row })
	}
}

const ID_TYPES = ['gallery', 'file', 'post_object', 'page_link', 'relationship', 'taxonomy']

function serialize(type, value) {
	if (type === 'true_false') {
		return value ? '1' : '0'
	}
	if (type === 'link') {
		return value?.url ? JSON.stringify(value) : ''
	}
	// Attachments, posts and terms go as IDs: a list of them, or one.
	if (ID_TYPES.includes(type)) {
		return Array.isArray(value) ? JSON.stringify(value.map(item => item.id)) : value?.id ? String(value.id) : ''
	}
	return value === null || value === undefined ? '' : String(value)
}
