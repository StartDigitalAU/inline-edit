import { useLayoutEffect, useRef } from 'preact/hooks'
import { revision, viewport } from '../../state/signals'

/**
 * Position a floating element from its own size, and again whenever the page scrolls, resizes or
 * changes. `place({ width, height })` returns `{ left, top }` in viewport pixels, or null.
 *
 * Positions are set with left/top rather than a transform, so the pop-in animation's `scale`
 * doesn't move the element.
 */
export function useFloating(place) {
	const ref = useRef(null)
	viewport.value
	revision.value

	useLayoutEffect(() => {
		const el = ref.current
		const position = el && place({ width: el.offsetWidth, height: el.offsetHeight })
		if (position) {
			el.style.left = `${Math.round(position.left)}px`
			el.style.top = `${Math.round(position.top)}px`
		}
	})

	return ref
}

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

/** Keep something `width` wide fully on screen, `gap` from the edges. */
export const clampLeft = (left, width, gap = 8) => clamp(left, gap, window.innerWidth - width - gap)
