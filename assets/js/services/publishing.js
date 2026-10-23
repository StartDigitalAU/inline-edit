import { config } from '../config'
import { busy, newPageOpen, touch } from '../state/signals'
import { setStatus } from '../state/status'
import { describeError, post } from './api'
import { pendingChanges } from './changes'
import { save } from './saving'
import { rememberEditing } from './session'

/**
 * Publishing an unpublished page, and starting new pages to build on the page.
 */

export const isDraft = () => !!config.page && config.page.status !== 'publish'

/**
 * Save anything unsaved, then publish, then go to the page's real address (a draft's is `?page_id=`).
 */
export async function publish() {
	if (busy.value) {
		return
	}
	if (pendingChanges().count) {
		await save()
		if (pendingChanges().count) {
			return
		}
	}

	busy.value = 'Publishing…'
	setStatus('saving', busy.value)
	try {
		const { url, status } = await post(config.publishEndpoint, { post: config.page.id })
		config.page.status = status
		rememberEditing(true)
		if (url && url !== location.href) {
			location.assign(url)
			return
		}
		setStatus('saved', 'Published')
	} catch (error) {
		const { message, link } = describeError(error)
		setStatus('error', message, link)
	}
	busy.value = ''
	touch()
}

/**
 * Make a draft page and go to it, ready to add blocks to.
 */
export async function createPage(title) {
	try {
		const { url } = await post(config.pagesEndpoint, { title })
		newPageOpen.value = false
		rememberEditing(true)
		location.assign(url)
	} catch (error) {
		setStatus('error', describeError(error).message)
	}
}
