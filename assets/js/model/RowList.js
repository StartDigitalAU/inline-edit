import { rowInfo } from './rows'

const article = word => (/^[aeiou]/i.test(word) ? 'an' : 'a')

/**
 * A flexible content or repeater field's rows on the page: the element printed with
 * `editable_rows()`, whose direct children are the rows, and what the server said about the field
 * (see src/Rows/RowList.php describe()).
 *
 * Rows are changed right on the page and only saved with everything else. Each row element carries
 * where it came from (see rows.js), which is what's sent on save.
 */
export class RowList {
	constructor(data, el, { isNew = false } = {}) {
		this.post = data.post
		this.field = data.field
		this.key = data.key
		this.kind = data.kind
		this.label = data.label
		this.item = data.item
		this.layouts = data.layouts
		this.min = data.min
		this.max = data.max
		this.base = data.base
		this.template = data.template
		this.signature = data.signature
		this.el = el

		// The stored name and row count, or null for a list in a row that hasn't been saved yet.
		this.original = isNew ? null : data.field
		this.loadedCount = data.rows.length
	}

	get isFlexible() {
		return this.kind === 'flexible'
	}

	get isConnected() {
		return this.el.isConnected
	}

	/** "a block", "a card". */
	get itemWithArticle() {
		const item = this.item.toLowerCase()
		return `${article(item)} ${item}`
	}

	rows() {
		return [...this.el.children].filter(el => !/^(SCRIPT|STYLE|TEMPLATE)$/.test(el.nodeName))
	}

	indexOf(row) {
		return this.rows().indexOf(row)
	}

	layout(name) {
		return this.layouts.find(layout => layout.name === name) || null
	}

	/** "Text with Image", or "Card 2". */
	rowLabel(row) {
		if (this.isFlexible) {
			const name = rowInfo(row).layout
			return this.layout(name)?.label || name
		}
		return `${this.item} ${this.indexOf(row) + 1}`
	}

	canAdd() {
		return !!this.template && !this.isFull()
	}

	canRemove() {
		return !this.min || this.rows().length > this.min
	}

	isFull() {
		return !!this.max && this.rows().length >= this.max
	}

	isLayoutFull(name) {
		const max = this.layout(name)?.max
		return !!max && this.rows().filter(row => rowInfo(row).layout === name).length >= max
	}

	canDuplicate(row) {
		return !this.isFull() && !this.isLayoutFull(rowInfo(row).layout)
	}

	/** Side by side (a grid of cards) rather than stacked. */
	isHorizontal() {
		const [first, second] = this.rows()
		return !!second && Math.abs(first.getBoundingClientRect().top - second.getBoundingClientRect().top) < 4
	}

	/**
	 * The rows as they'll be saved: each an existing row's index as the page loaded it, or a new row.
	 */
	order() {
		return this.rows().map(row => rowInfo(row).origin)
	}

	hasChanges() {
		const order = this.order()
		if (this.original === null) {
			return order.length > 0
		}
		return order.length !== this.loadedCount || order.some((origin, i) => origin.from !== i)
	}

	/**
	 * An empty list shows an "Add a block" placeholder while editing.
	 */
	markEmpty(editing) {
		const empty = editing && !this.rows().length && this.canAdd()
		if (empty) {
			this.el.setAttribute('data-sd-empty', `Add ${this.itemWithArticle}`)
		} else {
			this.el.removeAttribute('data-sd-empty')
		}
	}

	/**
	 * The same list in a duplicated row, on the duplicate's element.
	 */
	copyTo(el) {
		return Object.assign(Object.create(RowList.prototype), this, { el })
	}
}
