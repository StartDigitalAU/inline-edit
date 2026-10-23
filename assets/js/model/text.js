/**
 * Reading text out of contenteditable elements, which browsers fill in different ways.
 */

const BLOCK_TAGS = /^(ADDRESS|BLOCKQUOTE|DIV|H[1-6]|LI|OL|P|PRE|UL)$/

/**
 * Text as typed, from either plaintext-only content (text and <br>) or the <div>/<p> lines some
 * browsers make in a normal contenteditable.
 */
export function plainText(node) {
	let text = ''
	for (const child of node.childNodes) {
		if (child.nodeType === Node.TEXT_NODE) {
			text += child.data
		} else if (child.nodeName === 'BR') {
			text += '\n'
		} else if (child.nodeType === Node.ELEMENT_NODE) {
			const block = BLOCK_TAGS.test(child.nodeName)
			if (block && text && !text.endsWith('\n')) {
				text += '\n'
			}
			text += plainText(child)
			if (block && !text.endsWith('\n')) {
				text += '\n'
			}
		}
	}
	return text.replace(/ /g, ' ')
}

/**
 * Tidy HTML from a rich text field, the way the admin editor writes it: <strong>/<em>, text colours
 * as `<span style="color: #ff0000">`, and none of the other styling spans browsers add when merging
 * paragraphs (spans already in the content are marked with data-sd-keep when editing starts).
 */
export function richHtml(el) {
	const root = el.cloneNode(true)

	root.querySelectorAll('b:not([class]), i:not([class])').forEach(node => {
		renameElement(node, node.nodeName === 'B' ? 'strong' : 'em')
	})
	root.querySelectorAll('font, span:not([data-sd-keep])').forEach(node => {
		const color = textColor(node)
		if (!color) {
			unwrap(node)
			return
		}
		const span = node.nodeName === 'SPAN' ? node : renameElement(node, 'span')
		span.removeAttribute('color')
		span.setAttribute('style', `color: ${color};`)
	})
	root.querySelectorAll('[data-sd-keep]').forEach(node => node.removeAttribute('data-sd-keep'))

	// Browsers leave a <br> in blocks to keep them open, and empty paragraphs at the end.
	root.querySelectorAll('br:last-child').forEach(br => {
		if (BLOCK_TAGS.test(br.parentNode.nodeName) && br.parentNode.textContent.trim() !== '') {
			br.remove()
		}
	})
	while (isEmptyParagraph(root.lastElementChild)) {
		root.lastElementChild.remove()
	}

	return root.innerHTML.trim()
}

/**
 * Put rich text into an element, marking its own spans so richHtml() keeps them.
 */
export function setRichHtml(el, html) {
	el.innerHTML = html
	el.querySelectorAll('span').forEach(span => span.setAttribute('data-sd-keep', ''))
}

/**
 * An element's own text colour as #rrggbb (from a style or an old-style <font color>), or ''.
 */
export function textColor(el) {
	return toHex(el.style?.color || el.getAttribute?.('color') || '')
}

function toHex(color) {
	const rgb = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/)
	if (rgb) {
		return `#${rgb.slice(1, 4).map(part => Number(part).toString(16).padStart(2, '0')).join('')}`
	}
	return /^#[0-9a-f]{3,8}$/i.test(color) ? color.toLowerCase() : ''
}

export function escapeHtml(text) {
	return String(text).replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`)
}

function isEmptyParagraph(el) {
	return (
		!!el && el.nodeName === 'P' && !el.textContent.trim() && !el.querySelector('img, iframe, video, embed, object')
	)
}

function renameElement(el, tag) {
	const replacement = document.createElement(tag)
	for (const attr of el.attributes) {
		replacement.setAttribute(attr.name, attr.value)
	}
	replacement.append(...el.childNodes)
	el.replaceWith(replacement)
	return replacement
}

function unwrap(el) {
	el.replaceWith(...el.childNodes)
}
