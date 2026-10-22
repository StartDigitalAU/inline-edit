import { config } from '../config'
import { otherEditor } from '../state/signals'
import { nonceHeader, post } from './api'

/**
 * Holding the page's post lock while editing (see src/Rest/PresenceController.php), and noticing
 * when someone else holds it.
 */

// WordPress treats a lock as current for two and a half minutes; refresh well inside that.
const INTERVAL = 30000

let timer = 0

export function startPresence() {
	if (!config.page?.id || timer) {
		return
	}
	check()
	timer = setInterval(check, INTERVAL)
	window.addEventListener('pagehide', release)
}

export function stopPresence() {
	clearInterval(timer)
	timer = 0
	window.removeEventListener('pagehide', release)
	otherEditor.value = null
	release()
}

async function check() {
	try {
		const { editor } = await post(config.presenceEndpoint, { post: config.page.id })
		otherEditor.value = editor
	} catch {
		// Presence is a courtesy; editing carries on without it.
	}
}

/**
 * Let go of the lock, even as the page closes (sendBeacon can't send headers, so the nonce goes in
 * the URL).
 */
function release() {
	const url = new URL(config.presenceEndpoint, location.href)
	url.searchParams.set('_wpnonce', nonceHeader()['X-WP-Nonce'])
	url.searchParams.set('post', config.page.id)
	url.searchParams.set('release', 'true')
	navigator.sendBeacon(url)
}
