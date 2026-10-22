import { changesLabel } from '../../services/changes'
import { dismissDraft, restoreFoundDraft } from '../../services/editing'
import { draftsFound } from '../../state/signals'
import { timeAgo } from '../time'
import { Button } from './Button'
import { Toast } from './Toast'

/**
 * Offers back unsaved changes from before (another tab, another computer, or an expired login).
 */
export function DraftsToast() {
	const found = draftsFound.value
	if (!found) {
		return null
	}
	return (
		<Toast label="Unsaved changes">
			<span class="mr-1 text-[13px]">
				You have {changesLabel(found.size)} from {timeAgo(found.draft.savedAt)}.
			</span>
			<Button variant="secondary" size="sm" onClick={dismissDraft}>
				Discard
			</Button>
			<Button variant="primary" size="sm" onClick={restoreFoundDraft}>
				Restore
			</Button>
		</Toast>
	)
}
