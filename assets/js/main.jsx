import { render } from 'preact'
import { config } from './config'
import { listenToKeyboard } from './events/keyboard'
import { listenToPage } from './events/page'
import { lists, regions, register } from './model/page'
import { findDraft, keepDrafts } from './services/drafts'
import { startEditing } from './services/editing'
import { outlineWasOpen, toggleOutline } from './services/outline'
import { wasEditing } from './services/session'
import { PageLayer, ScreenLayer } from './ui/App'
import { layers } from './ui/layers'

/**
 * Inline Edit: front-end editing for what templates marked with `editable()` and `editable_rows()`.
 * Only loaded for users who can edit something on the page (see src/Page/Assets.php).
 */
function boot() {
	register(document, config)
	if (!regions.length && !lists.length) {
		return
	}

	mount()
	listenToPage()
	listenToKeyboard()

	if (wasEditing()) {
		startEditing()
	}
	if (outlineWasOpen()) {
		toggleOutline(true)
	}
	keepDrafts()
	findDraft()
}

/**
 * The UI lives in shadow roots, so the page's styles can't reach it and its styles can't reach the
 * page. It has two layers: one over the screen, and one over the page that scrolls with it, so what's
 * attached to the page (outlines, "+" buttons) needn't be moved while scrolling. Each stays hidden
 * until its stylesheet has loaded.
 */
function mount() {
	layers.page = layer('sd-inline-edit-page', 'position: absolute; inset: 0 0 auto; height: 0; z-index: 2147482999')
	layers.screen = layer('sd-inline-edit')
	render(<PageLayer />, layers.page)
	render(<ScreenLayer />, layers.screen)
}

function layer(id, style = '') {
	const host = document.createElement('div')
	host.id = id
	host.style.cssText = style
	host.style.visibility = 'hidden'
	const root = host.attachShadow({ mode: 'open' })

	const stylesheet = document.createElement('link')
	stylesheet.rel = 'stylesheet'
	stylesheet.href = config.stylesheet
	stylesheet.addEventListener('load', () => (host.style.visibility = ''))
	root.append(stylesheet)

	const container = document.createElement('div')
	root.append(container)
	document.body.append(host)
	return container
}

if (config) {
	boot()
}
