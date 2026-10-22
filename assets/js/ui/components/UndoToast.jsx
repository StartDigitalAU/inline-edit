import { useEffect } from 'preact/hooks'
import { undo } from '../../state/signals'
import { Button } from './Button'
import { Toast } from './Toast'

const SHOWN_FOR = 6000

/**
 * "Card 2 deleted · Undo", for a few seconds after a delete. (Until Save, Discard also brings it back.)
 */
export function UndoToast() {
	const action = undo.value
	useEffect(() => {
		if (!action) {
			return
		}
		const timer = setTimeout(() => {
			if (undo.value === action) {
				undo.value = null
			}
		}, SHOWN_FOR)
		return () => clearTimeout(timer)
	}, [action])

	if (!action) {
		return null
	}
	return (
		<Toast label={action.label}>
			<span class="mr-1 text-[13px]">{action.label}</span>
			<Button variant="secondary" size="sm" onClick={action.restore}>
				Undo
			</Button>
		</Toast>
	)
}
