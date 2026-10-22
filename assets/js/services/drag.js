import { dragging } from '../state/signals'
import { moveRow } from './blocks'

/**
 * Dragging a row to a new place by its label. While dragging, `dragging` holds where it would land;
 * dropping moves it there (animated and undoable), and Escape cancels.
 */

// Near the top or bottom of the screen, the page scrolls to reach rows out of view, faster the
// closer to the edge.
const SCROLL_ZONE = 100
const SCROLL_SPEED = 24

export function startDrag(list, row, event) {
	if (event.button !== 0 || list.rows().length < 2) {
		return
	}
	event.preventDefault()

	const horizontal = list.isHorizontal()
	let pointer = { x: event.clientX, y: event.clientY }
	let frame = 0

	const update = () => {
		dragging.value = {
			list,
			row,
			label: list.rowLabel(row),
			horizontal,
			x: pointer.x,
			y: pointer.y,
			index: dropIndex(list, row, pointer, horizontal),
		}
	}
	const scroll = () => {
		const step = scrollStep(pointer.y)
		if (step) {
			// Instant, as smooth scrolling (the site's or a library's) would lag behind each step.
			window.scrollBy({ top: step, behavior: 'instant' })
			update()
		}
		frame = requestAnimationFrame(scroll)
	}
	const onMove = moveEvent => {
		pointer = { x: moveEvent.clientX, y: moveEvent.clientY }
		update()
	}
	const onKey = keyEvent => keyEvent.key === 'Escape' && finish(false)
	const finish = drop => {
		cancelAnimationFrame(frame)
		window.removeEventListener('pointermove', onMove)
		window.removeEventListener('pointerup', onUp)
		window.removeEventListener('keydown', onKey, true)
		row.removeAttribute('data-sd-dragging')
		const target = dragging.value?.index
		dragging.value = null
		if (drop && target !== undefined) {
			moveRow(list, row, target)
		}
	}
	const onUp = () => finish(true)

	row.setAttribute('data-sd-dragging', '')
	window.addEventListener('pointermove', onMove)
	window.addEventListener('pointerup', onUp)
	window.addEventListener('keydown', onKey, true)
	update()
	frame = requestAnimationFrame(scroll)
}

function scrollStep(y) {
	const fromBottom = window.innerHeight - y
	if (y < SCROLL_ZONE) {
		return -Math.round(SCROLL_SPEED * (1 - y / SCROLL_ZONE))
	}
	if (fromBottom < SCROLL_ZONE) {
		return Math.round(SCROLL_SPEED * (1 - fromBottom / SCROLL_ZONE))
	}
	return 0
}

/**
 * Where the row would land: after every other row that's before the pointer, reading left to right
 * and top to bottom in a grid.
 */
function dropIndex(list, row, { x, y }, horizontal) {
	return list
		.rows()
		.filter(other => other !== row)
		.filter(other => {
			const rect = other.getBoundingClientRect()
			if (!horizontal) {
				return rect.top + rect.height / 2 < y
			}
			const inLine = y >= rect.top && y <= rect.bottom
			return rect.bottom < y || (inLine && rect.left + rect.width / 2 < x)
		}).length
}
