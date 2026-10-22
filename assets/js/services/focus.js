import { focusPoints } from '../model/page'
import { FocusPoint } from '../model/FocusPoint'
import { focusing, touch } from '../state/signals'
import { record } from './history'

/**
 * Setting an image's focus point on the page: drag the crosshair, then Apply (or Esc).
 */

let before = null

export function startFocus(region, el) {
	const point = pointFor(region)
	before = [point.x, point.y]
	focusing.value = { region, el, point }
}

export function moveFocus(x, y) {
	focusing.value?.point.set(x, y)
	touch()
}

export function finishFocus() {
	const current = focusing.value
	focusing.value = null
	if (!current) {
		return
	}
	const { point, region } = current
	const from = before
	const to = [point.x, point.y]
	if (from[0] !== to[0] || from[1] !== to[1]) {
		const show = ([x, y]) => {
			point.set(x, y)
			touch()
		}
		record({ label: `Move ${region.label.toLowerCase()} focus point`, undo: () => show(from), redo: () => show(to) })
	}
	touch()
}

function pointFor(region) {
	if (!focusPoints.has(region.value)) {
		focusPoints.set(region.value, new FocusPoint(region.value, region.focus || [50, 50]))
	}
	return focusPoints.get(region.value)
}
