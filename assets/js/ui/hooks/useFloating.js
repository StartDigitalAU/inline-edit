import { useLayoutEffect, useRef } from 'preact/hooks'
import { outlineOpen, revision } from '../../state/signals'

/**
 * Position a floating element from its own size, again whenever the page changes, and on scroll
 * and resize without re-rendering anything (see repositionAll). `place({ width, height })` returns
 * `{ left, top }` in viewport pixels, optionally with a `width` and `height` to size it too, or null.
 *
 * On the page's layer (see OnPage), something that stays put on the page also stays put in its layer
 * while scrolling, so nothing is written for it at all.
 *
 * Positions are set with left/top rather than a transform, so the pop-in animation's `scale`
 * doesn't move the element.
 */
export function useFloating(place) {
	const ref = useRef(null)
	const item = useRef({ ref, place, el: null, last: {} }).current
	item.place = place
	revision.value
	outlineOpen.value

	useLayoutEffect(() => apply(item, measure(item)))

	useLayoutEffect(() => {
		floating.add(item)
		return () => floating.delete(item)
	}, [])

	return ref
}

const floating = new Set()
let frame = 0

/**
 * Re-place every floating element, once a frame however often it's asked: all of them are measured
 * first and moved after, so the page lays out once rather than once per element.
 */
export function repositionAll() {
	frame ||= requestAnimationFrame(() => {
		frame = 0
		const items = [...floating]
		const positions = items.map(measure)
		items.forEach((item, i) => apply(item, positions[i]))
	})
}

/** Where the element goes, from its layer's corner: the screen's, or the page's, which scrolls. */
function measure(item) {
	const el = item.ref.current
	const position = el && item.place({ width: el.offsetWidth, height: el.offsetHeight })
	if (!position) {
		return null
	}
	const layer = el.getRootNode().host.getBoundingClientRect()
	return { ...position, left: position.left - layer.left, top: position.top - layer.top }
}

const SIZES = ['left', 'top', 'width', 'height']

/** Only what changed is written, so an element that hasn't moved costs nothing. */
function apply(item, position) {
	const el = item.ref.current
	if (!el || !position) {
		return
	}
	if (item.el !== el) {
		item.el = el
		item.last = {}
	}
	for (const name of SIZES) {
		if (position[name] === undefined) {
			continue
		}
		const px = name === 'left' || name === 'top' ? Math.round(position[name]) : position[name]
		const value = `${px}px`
		if (item.last[name] !== value) {
			el.style[name] = item.last[name] = value
		}
	}
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
