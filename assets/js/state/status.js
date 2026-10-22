import { status } from './signals'

let timer = 0

/**
 * Show a message in the bottom bar. "Saved" clears itself after a moment.
 */
export function setStatus(state, message = '', link = null) {
	clearTimeout(timer)
	status.value = { state, message, link }
	if (state === 'saved') {
		timer = setTimeout(clearStatus, 2500)
	}
}

export function clearStatus() {
	setStatus('')
}
