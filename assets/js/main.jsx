import { render } from 'preact'
import { config } from './config'
import { listenToKeyboard } from './events/keyboard'
import { listenToPage } from './events/page'
import { lists, regions, register } from './model/page'
import { findDraft, keepDrafts } from './services/drafts'
import { startEditing } from './services/editing'
import { outlineWasOpen, toggleOutline } from './services/outline'
import { wasEditing } from './services/session'
import { App } from './ui/App'

/**
 * Inline Edit: front-end editing for what templates marked with `editable()` and `editable_rows()`.
 * Only loaded for users who can edit something on the page (see src/Page/Assets.php).
 */
function boot() {
	register(document, config)
	if (!regions.length && !lists.length) {
		return
	}

	const host = mount()
	listenToPage(host)
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
 * The UI lives in a shadow root, so the page's styles can't reach it and its styles can't reach the
 * page. It stays hidden until its stylesheet has loaded.
 */
function mount() {
	const host = document.createElement('div')
	host.id = 'sd-inline-edit'
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
	render(<App root={root} />, container)

	return host
}

if (config) {
	boot()
}
