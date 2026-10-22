import { effect } from '@preact/signals'
import { config } from '../config'
import { draftsFound, editing } from '../state/signals'
import { post } from './api'
import { pending } from './changes'
import { describeChanges } from './payload'

/**
 * Unsaved changes are kept as a draft on the server (see src/Drafts/DraftStore.php) a moment after
 * each change, so they survive closing the tab, an expired login, or switching computers. Saving
 * (or discarding) clears it.
 */

const DELAY = 1500

let timer = 0
let stored = !!config?.page?.draft
let pauses = 0

/** Start keeping drafts, for as long as the page is open. */
export function keepDrafts() {
	if (!config.page?.id) {
		return
	}
	effect(() => {
		const { count } = pending.value
		// A draft from before stays untouched until it's restored or discarded.
		if (editing.value && !pauses && !draftsFound.value) {
			schedule(count)
		}
	})
}

function schedule(count) {
	clearTimeout(timer)
	timer = setTimeout(() => {
		timer = 0
		sync(count)
	}, DELAY)
}

/** Whether the latest changes are still waiting to be kept (leaving now would lose them). */
export function draftPending() {
	return !!timer
}

/** Store the draft now (e.g. before sharing a preview of it). */
export async function flushDraft() {
	clearTimeout(timer)
	timer = 0
	await sync(pending.value.count)
}

export async function discardDraft() {
	clearTimeout(timer)
	timer = 0
	if (stored) {
		await sync(0)
	}
}

/** Hold off while a draft is being restored, so a half-restored one isn't stored. */
export async function withoutDrafts(work) {
	pauses++
	clearTimeout(timer)
	timer = 0
	try {
		return await work()
	} finally {
		pauses--
		if (!pauses && editing.value) {
			schedule(pending.value.count)
		}
	}
}

/** Offer back a draft from before, if there's one for this page. */
export function findDraft() {
	const draft = config.page?.draft
	const size = draft ? ['lists', 'fields', 'settings', 'images'].reduce((sum, key) => sum + (draft[key]?.length || 0), 0) : 0
	draftsFound.value = size ? { draft, size } : null
}

async function sync(count) {
	if (!count && !stored) {
		return
	}
	const draft = count ? describeChanges() : null
	try {
		await post(config.draftEndpoint, { post: config.page.id, draft })
		stored = !!draft
	} catch {
		// Drafts are a safety net; editing carries on without them.
	}
}
