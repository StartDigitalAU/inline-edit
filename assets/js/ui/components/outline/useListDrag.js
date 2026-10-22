import { useRef, useState } from 'preact/hooks'
import { moveRow } from '../../../services/blocks'

// A press that moves less than this is a click, not a drag.
const THRESHOLD = 4

/**
 * Dragging items in one list of the outline to reorder its rows. Returns where a dragged row would
 * land (for the drop line) and a pointerdown handler for each item; a press without a drag calls
 * `onClick`.
 */
export function useListDrag(list, itemsRef) {
	const [drag, setDrag] = useState(null)
	const start = useRef(null)

	// After every other row whose item's middle is above the pointer.
	const dropIndex = (row, y) => {
		const items = [...itemsRef.current.children].filter(el => el.dataset.row !== undefined)
		return items
			.filter(el => list.rows()[Number(el.dataset.row)] !== row)
			.filter(el => {
				const rect = el.firstElementChild.getBoundingClientRect()
				return rect.top + rect.height / 2 < y
			}).length
	}

	const onPointerDown = (row, onClick) => event => {
		if (event.button !== 0 || event.target.closest('button')) {
			return
		}
		const item = event.currentTarget
		item.setPointerCapture(event.pointerId)
		start.current = { y: event.clientY, dragging: false }

		const onMove = moveEvent => {
			if (!start.current.dragging && Math.abs(moveEvent.clientY - start.current.y) < THRESHOLD) {
				return
			}
			start.current.dragging = true
			setDrag({ row, index: dropIndex(row, moveEvent.clientY) })
		}
		const onUp = () => {
			item.removeEventListener('pointermove', onMove)
			const dragged = start.current.dragging
			setDrag(current => {
				if (dragged && current) {
					moveRow(list, row, current.index)
				}
				return null
			})
			if (!dragged) {
				onClick()
			}
		}
		item.addEventListener('pointermove', onMove)
		item.addEventListener('pointerup', onUp, { once: true })
	}

	return { drag, onPointerDown }
}
