/**
 * The page as it looks now, unsaved changes and all, as a standalone HTML document for a preview
 * frame: without the editor, the admin bar, or scripts (which would run a second copy of the page).
 */

// What the editor adds to the page while editing.
const EDITOR_ATTRIBUTES = ['contenteditable', 'spellcheck', 'data-sd-kind', 'data-sd-dirty', 'data-sd-error', 'data-sd-empty', 'data-sd-flash', 'data-sd-dragging']
const REMOVE = ['#sd-inline-edit', '#wpadminbar', '#admin-bar-css', '#admin-bar-inline-css', 'script', 'noscript', '[data-sd-placeholder]']

export function pageSnapshot() {
	const doc = document.documentElement.cloneNode(true)

	doc.querySelectorAll(REMOVE.join(',')).forEach(el => el.remove())
	doc.querySelectorAll(EDITOR_ATTRIBUTES.map(attr => `[${attr}]`).join(',')).forEach(el =>
		EDITOR_ATTRIBUTES.forEach(attr => el.removeAttribute(attr))
	)
	doc.querySelectorAll('[style*="view-transition-name"]').forEach(el => (el.style.viewTransitionName = ''))

	// Classes for editing, the admin bar's offset, and smooth scrolling libraries.
	doc.classList.remove('sd-inline-editing', 'lenis', 'lenis-smooth', 'lenis-stopped')
	doc.querySelector('body')?.classList.remove('admin-bar')

	// Relative links and assets resolve against this page.
	const base = document.createElement('base')
	base.href = location.href
	doc.querySelector('head')?.prepend(base)

	return `<!doctype html>${doc.outerHTML}`
}
