import { BLOCKS } from '../config'
import { regionFor } from '../model/page'
import { editing, focusing, formatPanel, lockedField, menuOpen, picker, settingsFor, shortcutsOpen } from '../state/signals'
import { finishFocus } from '../services/focus'
import { toggleEditing } from '../services/editing'
import { redo, undo } from '../services/history'
import { save } from '../services/saving'
import { restoreSelection, setBlock } from '../services/formatting'
import { openMediaLibrary } from '../services/media'

/**
 * Keyboard shortcuts. Single-key ones (E, ?) only work when not typing.
 */
export function listenToKeyboard() {
	document.addEventListener('keydown', event => {
		const mod = event.metaKey || event.ctrlKey

		if (event.key === 'Escape' && closeTopmost()) {
			event.preventDefault()
			return
		}

		if (!isTyping(event) && !mod && !event.altKey) {
			if (event.key.toLowerCase() === 'e' && !event.repeat) {
				event.preventDefault()
				toggleEditing()
				return
			}
			if (event.key === '?') {
				event.preventDefault()
				shortcutsOpen.value = !shortcutsOpen.value
				return
			}
		}

		if (!editing.value) {
			return
		}

		if (mod && event.key.toLowerCase() === 's') {
			event.preventDefault()
			save()
			return
		}

		// In a text field, the browser's own undo handles typing.
		if (mod && !isTyping(event) && (event.key.toLowerCase() === 'z' || event.key.toLowerCase() === 'y')) {
			event.preventDefault()
			const redoing = event.key.toLowerCase() === 'y' || event.shiftKey
			redoing ? redo() : undo()
			return
		}

		const region = regionFor(event.target)
		if (region?.isEditable) {
			fieldKeys(event, region, mod)
		}
	})
}

function fieldKeys(event, region, mod) {
	const key = event.key.toLowerCase()
	const el = event.target.closest('[data-sd-edit]')

	if (region.kind === 'image') {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault()
			openMediaLibrary(region, el)
		}
	} else if (event.key === 'Escape') {
		el.blur()
	} else if (event.key === 'Enter' && region.kind === 'line') {
		event.preventDefault()
	} else if (region.kind === 'rich' && mod && key === 'k') {
		event.preventDefault()
		formatPanel.value = 'link'
	} else if (region.kind === 'rich' && mod && event.altKey && /^Digit[0-6]$/.test(event.code)) {
		// Option changes the typed character on a Mac, so match the physical key.
		event.preventDefault()
		setBlock(BLOCKS[Number(event.code.slice(-1))][0])
	} else if (region.kind !== 'rich' && mod && ['b', 'i', 'u'].includes(key)) {
		// Plain text fields have no formatting to apply.
		event.preventDefault()
	}
}

/**
 * Close whatever's open on top, most recent first. Returns whether anything was.
 */
function closeTopmost() {
	const closable = [
		[picker, null],
		[focusing, null],
		[settingsFor, null],
		[shortcutsOpen, false],
		[menuOpen, false],
		[formatPanel, ''],
		[lockedField, null],
	]
	for (const [state, closed] of closable) {
		if (state.value) {
			if (state === focusing) {
				finishFocus()
				return true
			}
			state.value = closed
			if (state === formatPanel) {
				restoreSelection()
			}
			return true
		}
	}
	return false
}

function isTyping(event) {
	const target = event.composedPath()[0]
	return (
		target instanceof Element &&
		(target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.nodeName) || !!target.closest('.media-modal'))
	)
}
