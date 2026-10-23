import { useLayoutEffect, useRef } from 'preact/hooks'
import { outlineOpen, revision, viewport } from '../../state/signals'

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
	outlineOpen.value

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

// The Blocks panel's right edge (see OutlinePanel: 16px in, 288px wide), on screens wide enough for it.
const OUTLINE_RIGHT = 16 + 288
const OUTLINE_MIN_SCREEN = 640

/**
 * Where the page starts for things floating over it, so they stay clear of the Blocks panel.
 */
export function pageLeft(gap = 8) {
	return outlineOpen.value && window.innerWidth >= OUTLINE_MIN_SCREEN ? OUTLINE_RIGHT + gap : gap
}

/** Like clampLeft(), but also clear of the Blocks panel. */
export const clampToPage = (left, width, gap = 8) => clamp(left, pageLeft(gap), window.innerWidth - width - gap)
