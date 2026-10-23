import { lists, regionFor, rowAt } from '../model/page'
import { rowInfo } from '../model/rows'
import {
	activeField,
	dropTarget,
	editing,
	formatPanel,
	hoveredField,
	hoveredRow,
	linkEditing,
	lockedField,
	menuOpen,
	picker,
	saving,
	settingsFocus,
	settingsFor,
} from '../state/signals'
import { pending } from '../services/changes'
import { draftPending } from '../services/drafts'
import { fieldChanged, pasteText } from '../services/fields'
import { forgetSelection, rememberSelection } from '../services/formatting'
import { closeLinkEditor, openLinkEditor } from '../services/linkFields'
import { openMediaLibrary } from '../services/media'
import { uploadImage } from '../services/upload'
import { repositionAll } from '../ui/hooks/useFloating'
import { isEditorHost } from '../ui/layers'

// How long after the last scroll it counts as settled.
const SCROLL_SETTLE = 120

/**
 * Listeners on the page itself: typing into fields, hovering fields and blocks, clicking images.
 */
export function listenToPage() {
	const fromEditor = event => event.composedPath().some(isEditorHost)
	const fieldAt = target => {
		const region = editing.value ? regionFor(target) : null
		return region ? { region, el: target.closest('[data-sd-edit]') } : null
	}

	document.addEventListener('input', event => {
		const field = fieldAt(event.target)
		if (field?.region.isText) {
			fieldChanged(field.region, field.el)
			// The block toolbar steps aside while typing, and comes back with the mouse.
			hoveredRow.value = null
		}
	})

	document.addEventListener('paste', event => {
		const field = fieldAt(event.target)
		if (field?.region.isText) {
			event.preventDefault()
			pasteText(field.region, event.clipboardData?.getData('text/plain') || '')
		}
	})

	// An image file dropped on an image field replaces it. Anything else dropped on a field (markup
	// from other pages, images into text) is ignored.
	const hasFiles = event => [...(event.dataTransfer?.types || [])].includes('Files')
	document.addEventListener('dragstart', event => fieldAt(event.target) && event.preventDefault())
	document.addEventListener('dragover', event => {
		const field = fieldAt(event.target)
		if (!field) {
			dropTarget.value = null
			return
		}
		event.preventDefault()
		const accepts = field.region.kind === 'image' && hasFiles(event)
		event.dataTransfer.dropEffect = accepts ? 'copy' : 'none'
		dropTarget.value = accepts ? field.el : null
	})
	document.addEventListener('dragleave', event => {
		if (event.target === dropTarget.value) {
			dropTarget.value = null
		}
	})
	document.addEventListener('drop', event => {
		const field = fieldAt(event.target)
		dropTarget.value = null
		if (!field) {
			return
		}
		event.preventDefault()
		const file = event.dataTransfer?.files?.[0]
		if (field.region.kind === 'image' && file) {
			uploadImage(field.region, field.el, file)
		}
	})

	// While scrolling, blocks pass under a still pointer. Rather than the controls hopping from block
	// to block every frame, hovering waits until the scrolling settles.
	let scrolling = 0
	let held = null
	const hover = target => {
		hoveredField.value = fieldAt(target)
		hoveredRow.value = rowAt(target)
	}
	document.addEventListener('mouseover', event => {
		held = null
		if (!editing.value || fromEditor(event)) {
			return
		}
		if (scrolling) {
			held = event.target
			return
		}
		hover(event.target)
	})
	window.addEventListener(
		'scroll',
		() => {
			clearTimeout(scrolling)
			scrolling = setTimeout(() => {
				scrolling = 0
				if (held && editing.value) {
					hover(held)
				}
				held = null
			}, SCROLL_SETTLE)
		},
		{ passive: true },
	)
	document.documentElement.addEventListener('mouseleave', () => {
		hoveredField.value = null
		hoveredRow.value = null
	})

	document.addEventListener('focusin', event => {
		const field = fieldAt(event.target)
		if (!field?.region.isText) {
			return
		}
		// Coming back from the formatting bar refocuses the same element, which keeps its selection.
		if (field.el !== activeField.value?.el) {
			forgetSelection()
		}
		activeField.value = field
		lockedField.value = null
		menuOpen.value = false
	})

	document.addEventListener('focusout', event => {
		// Focus moving into the editor's UI (e.g. the link field) keeps the field active.
		if (!editing.value || isEditorHost(event.relatedTarget) || fieldAt(event.relatedTarget)?.el === activeField.value?.el) {
			return
		}
		setTimeout(() => {
			const el = activeField.value?.el
			if (!isEditorHost(document.activeElement) && !el?.contains(document.activeElement)) {
				activeField.value = null
				formatPanel.value = ''
			}
		})
	})

	document.addEventListener('selectionchange', () => {
		if (editing.value && activeField.value?.region.kind === 'rich') {
			rememberSelection()
		}
	})

	document.addEventListener('click', event => onClick(event, fieldAt, fromEditor), true)

	window.addEventListener('scroll', repositionAll, { passive: true })
	window.addEventListener('resize', repositionAll)

	// Unsaved changes are kept as a draft, so leaving only warns if the latest aren't kept yet.
	window.addEventListener('beforeunload', event => {
		if (editing.value && pending.value.count && !saving.value && draftPending()) {
			event.preventDefault()
			event.returnValue = ''
		}
	})
}

/**
 * A gallery on the page is edited in its block's settings: open them, at the gallery.
 */
function openGallery(event, field) {
	const found = rowAt(field.el)
	event.preventDefault()
	event.stopPropagation()
	if (found) {
		settingsFocus.value = savedSuffix(field.region.field, found)
		settingsFor.value = { list: found.list, row: found.row }
	}
}

/** A field's name within its row (`gallery`, `cta_images`). */
function savedSuffix(name, { list, row }) {
	const prefix = `${list.field}_${rowInfo(row).index}_`
	return name.startsWith(prefix) ? name.slice(prefix.length) : name
}

function onClick(event, fieldAt, fromEditor) {
	if (!editing.value || fromEditor(event)) {
		return
	}
	menuOpen.value = false
	// Dropdowns close on a click elsewhere; the link field stays open until it's done with.
	if (formatPanel.value !== 'link') {
		formatPanel.value = ''
	}

	// A click inside an open settings panel's block stays in it (e.g. a gallery that opened it).
	if (!settingsFor.value?.row.contains(event.target)) {
		settingsFor.value = null
	}
	// An empty list is one big "Add a block" button.
	const emptyList = lists.find(list => list.el === event.target && list.el.hasAttribute('data-sd-empty'))
	if (emptyList) {
		event.preventDefault()
		picker.value = { list: emptyList, index: 0 }
		return
	}

	const field = fieldAt(event.target)
	lockedField.value = field && !field.region.isEditable ? field : null

	if (linkEditing.value && linkEditing.value.el !== field?.el) {
		closeLinkEditor()
	}

	if (field?.region.kind === 'image') {
		event.preventDefault()
		event.stopPropagation()
		openMediaLibrary(field.region, field.el)
	} else if (field?.region.kind === 'link') {
		event.preventDefault()
		openLinkEditor(field.region, field.el)
	} else if (field?.region.kind === 'gallery') {
		openGallery(event, field)
	} else if (field && (!field.region.isEditable || event.target.closest('a'))) {
		// Links inside editable text are for editing, not following.
		event.preventDefault()
	}
}
