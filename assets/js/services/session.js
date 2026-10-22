import { STORAGE } from '../config'

/**
 * Edit mode carries over to the next page (and through reloads) in the same tab.
 */
export function rememberEditing(active) {
	try {
		if (active) {
			sessionStorage.setItem(STORAGE.active, '1')
		} else {
			sessionStorage.removeItem(STORAGE.active)
		}
	} catch {
		// Storage can be blocked; edit mode just won't carry over.
	}
}

export function wasEditing() {
	try {
		return sessionStorage.getItem(STORAGE.active) === '1'
	} catch {
		return false
	}
}

/**
 * Reload into edit mode, e.g. after a save that changed blocks, so every field has its saved name.
 */
export function reloadEditing() {
	rememberEditing(true)
	location.reload()
}
