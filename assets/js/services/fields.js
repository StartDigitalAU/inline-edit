import { status, saving, touch } from '../state/signals'
import { clearStatus } from '../state/status'
import { escapeHtml } from '../model/text'
import { saveDrafts } from './drafts'

/**
 * After a field's value changes on the page (typing, formatting, a new image).
 */
export function fieldChanged(region, el = region.element) {
	if (region.isText) {
		region.sync(el)
	}
	region.error = ''
	region.refresh()
	if (status.value.state && !saving.value) {
		clearStatus()
	}
	saveDrafts()
	touch()
}

/**
 * Paste as plain text: pasted rich text brings styles and markup from wherever it came from. In rich
 * text, blank lines become paragraphs.
 */
export function pasteText(region, text) {
	text = text.replace(/\r\n?/g, '\n')

	if (region.kind === 'line') {
		document.execCommand('insertText', false, text.replace(/\s*\n\s*/g, ' '))
	} else if (region.kind === 'multi') {
		document.execCommand('insertText', false, text)
	} else {
		const paragraphs = text
			.trim()
			.split(/\n\s*\n/)
			.map(p => escapeHtml(p).replace(/\n/g, '<br>'))
		const html = paragraphs.length === 1 ? paragraphs[0] : paragraphs.map(p => `<p>${p}</p>`).join('')
		document.execCommand('insertHTML', false, html)
	}
}
