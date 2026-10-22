import { BLOCKS, STYLE_FORMATS } from '../config'
import { escapeHtml } from '../model/text'
import { activeField, formatPanel, selection } from '../state/signals'
import { fieldChanged } from './fields'

/**
 * Formatting the rich text field being edited, with the browser's editing commands.
 *
 * Clicking the formatting bar moves focus away from the field, so the selection is remembered and
 * put back before each command.
 */

let savedRange = null

const activeElement = () => activeField.value?.el || null

export function rememberSelection() {
	savedRange = currentRange() || savedRange
	selection.value++
}

export function forgetSelection() {
	savedRange = null
}

/** The selection inside the field, or the last one there. */
export function selectionRange() {
	return currentRange() || savedRange
}

export function restoreSelection() {
	const el = activeElement()
	if (!el) {
		return
	}
	el.focus({ preventScroll: true })
	if (savedRange) {
		const current = document.getSelection()
		current.removeAllRanges()
		current.addRange(savedRange)
	}
}

/**
 * What's applied at the selection, for the formatting bar.
 */
export function formatState() {
	let block = ''
	try {
		block = String(document.queryCommandValue('formatBlock') || '').toLowerCase()
	} catch {
		// Treated as a paragraph.
	}
	if (!BLOCKS.some(([tag]) => tag === block)) {
		block = 'p'
	}

	const style = STYLE_FORMATS.find(format => styleTarget(format)?.classList.contains(format.className)) || null
	const isOn = command => {
		try {
			return document.queryCommandState(command)
		} catch {
			return false
		}
	}

	return {
		block,
		style,
		bold: isOn('bold'),
		italic: isOn('italic'),
		bulleted: isOn('insertUnorderedList'),
		numbered: isOn('insertOrderedList'),
		link: !!currentLink(),
	}
}

export function setBlock(tag) {
	run(() => document.execCommand('formatBlock', false, `<${tag}>`))
}

export function toggle(command) {
	run(() => document.execCommand(command))
}

export function clearFormatting() {
	run(() => {
		document.execCommand('removeFormat')
		document.execCommand('unlink')
	})
}

/**
 * Like TinyMCE, one format at a time: picking another replaces it, picking it again removes it.
 */
export function applyStyle(format) {
	run(() => {
		const target = styleTarget(format)
		if (!target) {
			return
		}
		const had = target.classList.contains(format.className)
		target.classList.remove(...STYLE_FORMATS.map(f => f.className))
		if (!had) {
			target.classList.add(format.className)
		}
		if (!target.classList.length) {
			target.removeAttribute('class')
		}
	})
}

/** The element a format would apply to: the closest match to the start of the selection. */
export function styleTarget(format) {
	const el = activeElement()
	let node = selectionRange()?.startContainer
	if (node?.nodeType === Node.TEXT_NODE) {
		node = node.parentNode
	}
	if (!(node instanceof Element) || !el) {
		return null
	}
	let target = null
	try {
		target = node.closest(format.selector)
	} catch {
		// A selector the browser can't parse matches nothing.
	}
	return target && target !== el && el.contains(target) ? target : null
}

export function currentLink() {
	const el = activeElement()
	for (let node = selectionRange()?.commonAncestorContainer; node && node !== el; node = node.parentNode) {
		if (node.nodeName === 'A') {
			return node
		}
	}
	return null
}

/**
 * Link the selection to `href`, change the link it's in, or remove that link when `href` is empty.
 */
export function applyLink(href) {
	run(() => {
		const link = currentLink()
		if (!href) {
			if (link) {
				document.execCommand('unlink')
			}
		} else if (link) {
			link.setAttribute('href', href)
		} else if (document.getSelection().isCollapsed) {
			document.execCommand('insertHTML', false, `<a href="${escapeHtml(href)}">${escapeHtml(href)}</a>`)
		} else {
			document.execCommand('createLink', false, href)
		}
	})
}

function run(command) {
	formatPanel.value = ''
	restoreSelection()
	command()
	const field = activeField.value
	if (field) {
		fieldChanged(field.region, field.el)
	}
	savedRange = currentRange()
	selection.value++
}

function currentRange() {
	const el = activeElement()
	const current = document.getSelection()
	if (!el || !current?.rangeCount) {
		return null
	}
	// A copy, since the selection's own range changes as soon as focus moves to the toolbar.
	const range = current.getRangeAt(0)
	return el.contains(range.commonAncestorContainer) ? range.cloneRange() : null
}
