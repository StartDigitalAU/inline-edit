import { signal } from '@preact/signals'

/**
 * The editor's state. Fields and rows live on the page itself (see model/), so changes to them bump
 * `revision`, which anything showing counts or positions reads to stay current.
 */

export const editing = signal(false)
export const saving = signal(false)
/** What's being done that blocks other changes, e.g. "Adding Text with Image…", or ''. */
export const busy = signal('')

/** The bottom bar's message: state is '', 'saving', 'saved' or 'error'. */
export const status = signal({ state: '', message: '', link: null })

export const revision = signal(0)
/** Bumped on scroll and resize, so floating UI follows what it's attached to. */
export const viewport = signal(0)
/** Bumped as the text selection changes, so the formatting bar shows what's applied. */
export const selection = signal(0)

/** The field under the pointer or being typed in: { region, el }. */
export const hoveredField = signal(null)
export const activeField = signal(null)
/** A locked field that was clicked, to explain why: { region, el }. */
export const lockedField = signal(null)
/** The row under the pointer: { list, row }. */
export const hoveredRow = signal(null)

export const menuOpen = signal(false)
export const shortcutsOpen = signal(false)
/** Whether the Blocks outline is open. */
export const outlineOpen = signal(false)
/** The block whose settings panel is open: { list, row }. */
export const settingsFor = signal(null)
/** Starting a new page (the title dialog is open). */
export const newPageOpen = signal(false)
/** A setting to bring into view when the settings panel opens (its name), e.g. a gallery clicked on the page. */
export const settingsFocus = signal('')
/** Choosing a block to add: { list, index }. */
export const picker = signal(null)
/** The element whose tooltip is showing. */
export const tooltipFor = signal(null)
/** Unsaved changes kept from before: { draft, size }. */
export const draftsFound = signal(null)
/** The last deleted row, offered back in a toast: { label, change } (see services/history.js). */
export const lastDeleted = signal(null)
/** Dragging a row to a new place: { list, row, label, index, x, y }. */
export const dragging = signal(null)
/** The formatting bar's open panel: '', 'block', 'style' or 'link'. */
export const formatPanel = signal('')
/** Editing a link field in its popover: { region, el }. */
export const linkEditing = signal(null)
/** Setting an image's focus point: { region, el }. */
export const focusing = signal(null)
/** An image a file is being dragged over: its element. */
export const dropTarget = signal(null)
/** Images being uploaded: [{ el, progress }], progress from 0 to 1. */
export const uploads = signal([])
/** Previewing the page at a device's width: { device, html }, or null. */
export const devicePreview = signal(null)
/** Someone else editing this page (in the admin or on the page): { name, avatar }, or null. */
export const otherEditor = signal(null)
/** While the media library is open, the editor's UI steps aside. */
export const mediaOpen = signal(false)

export function touch() {
	revision.value++
}
