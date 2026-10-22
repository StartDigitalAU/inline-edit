import { useEffect } from 'preact/hooks'
import { lastChange, undo } from '../../services/history'
import { lastDeleted } from '../../state/signals'
import { Button } from './Button'
import { Toast } from './Toast'

const SHOWN_FOR = 6000

/**
 * "Card 2 deleted · Undo", for a few seconds after a delete. (⌘Z and Discard also bring it back.)
 */
export function UndoToast() {
	const deleted = lastDeleted.value
	useEffect(() => {
		if (!deleted) {
			return
		}
		const timer = setTimeout(() => {
			if (lastDeleted.value === deleted) {
				lastDeleted.value = null
			}
		}, SHOWN_FOR)
		return () => clearTimeout(timer)
	}, [deleted])

	// Only while the delete is still the latest change, which is what Undo would undo.
	if (!deleted || lastChange() !== deleted.change) {
		return null
	}
	return (
		<Toast label={deleted.label}>
			<span class="mr-1 text-[13px]">{deleted.label}</span>
			<Button
				variant="secondary"
				size="sm"
				onClick={() => {
					lastDeleted.value = null
					undo()
				}}
			>
				Undo
			</Button>
		</Toast>
	)
}
