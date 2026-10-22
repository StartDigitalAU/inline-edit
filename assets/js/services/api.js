import { config } from '../config'

let nonce = config?.nonce

/**
 * POST to one of the editor's endpoints. Throws an Error with `status` and `body` when it fails.
 */
export async function post(url, payload, retry = true) {
	const response = await fetch(url, {
		method: 'POST',
		credentials: 'same-origin',
		headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
		body: JSON.stringify(payload),
	})
	const body = await response.json().catch(() => null)

	if (response.ok && body) {
		return body
	}

	// Nonces expire after a day, so a page left open needs a fresh one.
	if (retry && body?.code === 'rest_cookie_invalid_nonce' && (await refreshNonce())) {
		return post(url, payload, false)
	}

	const error = new Error(body?.message || 'Something went wrong. Try again.')
	error.status = response.status
	error.body = body
	throw error
}

/** For requests made outside post() and get(), e.g. file uploads with progress. */
export function nonceHeader() {
	return { 'X-WP-Nonce': nonce }
}

export async function get(url, signal) {
	const response = await fetch(url, { credentials: 'same-origin', headers: { 'X-WP-Nonce': nonce }, signal })
	return response.ok ? response.json() : null
}

async function refreshNonce() {
	try {
		const response = await fetch(config.nonceEndpoint, { credentials: 'same-origin' })
		const text = (await response.text()).trim()
		if (response.ok && /^[a-f0-9]{10}$/.test(text)) {
			nonce = text
			return true
		}
	} catch {
		// Falls through to the logged-out message.
	}
	return false
}

/**
 * The bottom bar message for a failed request.
 */
export function describeError(error) {
	if (!error.status) {
		return { message: 'Couldn’t reach the site. Check your connection and try again.' }
	}
	if (error.status === 401 || error.body?.code === 'rest_cookie_invalid_nonce') {
		return {
			message: 'You’ve been logged out. Your changes are kept.',
			link: { label: 'Log in', href: config.loginUrl },
		}
	}
	return { message: error.message }
}
