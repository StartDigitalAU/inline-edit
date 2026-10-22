import { config } from '../config'
import { touch } from '../state/signals'
import { setStatus } from '../state/status'
import { describeError, post } from './api'
import { flushDraft } from './drafts'

/**
 * Preview links: anyone with one sees the page with your unsaved changes (see
 * src/Preview/SharedPreview.php), as they are when they open it.
 */
export async function copyPreviewLink() {
	try {
		await flushDraft()
		const { url } = await post(config.shareEndpoint, { post: config.page.id })
		await copy(url)
		config.page.shared = true
		setStatus('saved', 'Preview link copied. It works for 7 days.')
	} catch (error) {
		setStatus('error', describeError(error).message)
	}
	touch()
}

export async function stopSharing() {
	try {
		await post(config.shareEndpoint, { post: config.page.id, revoke: true })
		config.page.shared = false
		setStatus('saved', 'Preview links stopped working.')
	} catch (error) {
		setStatus('error', describeError(error).message)
	}
	touch()
}

async function copy(text) {
	try {
		await navigator.clipboard.writeText(text)
	} catch {
		// Without clipboard access, show it to copy by hand.
		window.prompt('Copy this preview link:', text)
	}
}
