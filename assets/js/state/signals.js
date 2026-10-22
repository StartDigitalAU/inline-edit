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
/** Choosing a block to add: { list, index }. */
export const picker = signal(null)
/** The element whose tooltip is showing. */
export const tooltipFor = signal(null)
/** Unsaved changes found from before a reload: [{ region, draft }]. */
export const draftsFound = signal(null)
/** The last deleted row, which can be put back: { label, restore }. */
export const undo = signal(null)
/** The formatting bar's open panel: '', 'block', 'style' or 'link'. */
export const formatPanel = signal('')
/** While the media library is open, the editor's UI steps aside. */
export const mediaOpen = signal(false)

export function touch() {
	revision.value++
}
