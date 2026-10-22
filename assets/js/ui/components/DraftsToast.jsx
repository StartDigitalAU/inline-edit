import { changesLabel } from '../../services/changes'
import { dismissDrafts, restoreFoundDrafts } from '../../services/editing'
import { draftsFound } from '../../state/signals'
import { Button } from './Button'
import { Toast } from './Toast'

/**
 * Offers back unsaved changes from before a reload or an expired login.
 */
export function DraftsToast() {
	const found = draftsFound.value
	if (!found) {
		return null
	}
	return (
		<Toast label="Unsaved changes">
			<span class="mr-1 text-[13px]">You have {changesLabel(found.length)} from earlier.</span>
			<Button variant="secondary" size="sm" onClick={dismissDrafts}>
				Dismiss
			</Button>
			<Button variant="primary" size="sm" onClick={restoreFoundDrafts}>
				Restore
			</Button>
		</Toast>
	)
}
