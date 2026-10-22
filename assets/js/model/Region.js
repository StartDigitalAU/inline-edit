import { supportsPlaintextOnly } from './support'
import { plainText, richHtml, setRichHtml } from './text'
import { applyImage, imageState } from './images'

const TEXT_KINDS = ['line', 'multi', 'rich']

// Attributes a region gets while editing, removed again when editing stops.
const EDITING_ATTRIBUTES = [
	'contenteditable',
	'spellcheck',
	'data-sd-kind',
	'data-sd-dirty',
	'data-sd-error',
	'role',
	'tabindex',
	'aria-label',
	'aria-multiline',
]

let lastId = 0

/**
 * One editable field on the page: the element(s) printed with `editable()` and what the server said
 * about the field (see src/Fields/Field.php describe()).
 *
 * `kind` is how it's edited: 'line' (single-line text), 'multi' (text with line breaks), 'rich'
 * (formatted HTML), 'image', or 'locked' (shown, but only editable in the admin).
 */
export class Region {
	constructor(data, elements, { isNew = false } = {}) {
		this.id = `f${++lastId}`
		this.post = data.post
		this.field = data.field
		this.kind = data.kind
		this.label = data.label
		this.source = data.source
		this.reason = data.reason
		this.base = data.base
		this.editUrl = data.editUrl
		this.uploadedTo = data.uploadedTo
		this.elements = elements

		// The field's stored name, or null for one in a row that hasn't been saved yet.
		this.original = isNew ? null : data.field
		// A copy in a duplicated row, which shares the original's name until it's saved.
		this.isCopy = false

		this.value = data.source // An image's attachment ID; text is read from the page.
		this.initial = ''
		this.dirty = false
		this.error = ''
		this.loaded = [] // What each element showed before editing, to put back after.
	}

	get isText() {
		return TEXT_KINDS.includes(this.kind)
	}

	get isEditable() {
		return this.kind !== 'locked'
	}

	get isConnected() {
		return this.elements.some(el => el.isConnected)
	}

	get element() {
		return this.elements[0]
	}

	/** Identifies the field's unsaved draft between page loads. */
	get draftKey() {
		return `${this.post}:${this.field}`
	}

	read(el = this.element) {
		if (this.kind === 'image') {
			return this.value
		}
		if (this.kind === 'rich') {
			return richHtml(el)
		}
		const text = plainText(el)
		return this.kind === 'line' ? text.replace(/\s*\n\s*/g, ' ').trim() : text.trim()
	}

	write(value, elements = this.elements) {
		for (const el of elements) {
			if (this.kind === 'rich') {
				setRichHtml(el, value)
			} else {
				el.textContent = value
			}
		}
	}

	/**
	 * Make the elements editable, showing the field's source (e.g. a WYSIWYG's HTML rather than its
	 * rendered shortcodes).
	 */
	activate() {
		this.loaded = this.elements.map(el => (this.kind === 'image' ? imageState(el) : el.innerHTML))

		for (const el of this.elements) {
			el.setAttribute('data-sd-kind', this.kind)
			el.setAttribute('aria-label', this.label)

			if (this.kind === 'image') {
				el.setAttribute('role', 'button')
				el.setAttribute('tabindex', '0')
				el.setAttribute('aria-label', `Replace ${this.label.toLowerCase()}`)
			} else if (this.isText) {
				el.contentEditable = this.kind !== 'rich' && supportsPlaintextOnly ? 'plaintext-only' : 'true'
				el.spellcheck = true
				el.setAttribute('role', 'textbox')
				el.setAttribute('aria-multiline', this.kind === 'line' ? 'false' : 'true')
			}
		}

		if (this.isText) {
			this.write(this.source)
		}
		this.value = this.source
		if (this.isEditable) {
			this.initial = this.read()
		}
	}

	/**
	 * Back to how the page showed it before editing, dropping any changes.
	 */
	deactivate() {
		this.elements.forEach((el, i) => {
			EDITING_ATTRIBUTES.forEach(attr => el.removeAttribute(attr))
			if (this.kind === 'image') {
				applyImage(el, this.loaded[i])
			} else if (this.isEditable) {
				el.innerHTML = this.loaded[i]
			}
		})
		this.value = this.source
		this.dirty = false
		this.error = ''
	}

	/**
	 * Drop unsaved changes but keep editing.
	 */
	revert() {
		if (this.kind === 'image') {
			this.elements.forEach((el, i) => applyImage(el, this.loaded[i]))
			this.value = this.source
		} else {
			this.write(this.source)
		}
		this.error = ''
		this.refresh()
	}

	/**
	 * Keep every copy of the field on the page showing what was typed into one of them.
	 */
	sync(from) {
		const others = this.elements.filter(el => el !== from)
		if (this.kind === 'rich') {
			others.forEach(el => (el.innerHTML = from.innerHTML))
		} else {
			others.forEach(el => (el.textContent = this.read(from)))
		}
	}

	setImage(attachment) {
		this.value = String(attachment.id)
		this.elements.forEach(el => applyImage(el, { src: attachment.url, alt: attachment.alt }))
		this.error = ''
		this.refresh()
	}

	setError(message) {
		this.error = message
		this.refresh()
	}

	/**
	 * Recheck whether the field has unsaved changes, and mark its elements to match.
	 */
	refresh() {
		this.dirty = this.read() !== this.initial
		for (const el of this.elements) {
			el.toggleAttribute('data-sd-dirty', this.dirty)
			el.toggleAttribute('data-sd-error', !!this.error)
		}
	}

	/**
	 * After a save: what's stored now, and what the page should show.
	 */
	markSaved({ source, base, rendered }, savedValue) {
		this.source = source
		this.base = base
		this.error = ''
		// Anything typed while the save was running stays an unsaved change.
		this.initial = savedValue
		if (this.kind === 'image') {
			this.elements.forEach(el => applyImage(el, rendered))
			this.loaded = this.elements.map(imageState)
		} else {
			this.loaded = this.elements.map(() => rendered)
		}
		this.refresh()
	}

	/**
	 * The same field in a duplicated row, on the duplicate's elements.
	 */
	copyTo(elements) {
		const copy = Object.assign(Object.create(Region.prototype), this, {
			id: `f${++lastId}`,
			elements,
			isCopy: true,
			loaded: [...this.loaded],
		})
		copy.refresh()
		return copy
	}
}
