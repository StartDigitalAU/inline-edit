import { regions } from './page'

let lastId = 0

/**
 * An image's focus point: the part that stays in view when it's cropped, as x and y percentages.
 * It belongs to the image (the attachment), so every field on the page showing it moves together.
 */
export class FocusPoint {
	constructor(attachment, [x, y]) {
		this.id = `i${++lastId}`
		this.attachment = attachment
		this.x = x
		this.y = y
		this.initial = [x, y]
	}

	get dirty() {
		return this.x !== this.initial[0] || this.y !== this.initial[1]
	}

	/** Every field showing this image. */
	regions() {
		return regions.filter(region => region.kind === 'image' && region.value === this.attachment && region.isConnected)
	}

	set(x, y) {
		this.x = Math.round(Math.min(100, Math.max(0, x)) * 10) / 10
		this.y = Math.round(Math.min(100, Math.max(0, y)) * 10) / 10
		for (const region of this.regions()) {
			region.elements.forEach(el => (el.style.objectPosition = `${this.x}% ${this.y}%`))
		}
	}

	markSaved() {
		this.initial = [this.x, this.y]
	}
}
