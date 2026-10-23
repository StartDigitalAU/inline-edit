import { useEffect } from 'preact/hooks'
import { tooltipFor } from '../../state/signals'
import { clampLeft, useFloating } from '../hooks/useFloating'
import { layers } from '../layers'
import { Kbd } from './Kbd'

/**
 * Tooltips for anything in the editor's UI with a `data-tip` (and optional `data-keys`), shown
 * above it on hover or keyboard focus.
 */
export function Tooltip() {
	useEffect(listen, [])
	const target = tooltipFor.value
	return target?.isConnected && target.dataset.tip ? <Tip key={target} target={target} /> : null
}

function Tip({ target }) {
	const ref = useFloating(({ width, height }) => {
		const rect = target.getBoundingClientRect()
		const above = rect.top > height + 16
		return {
			left: clampLeft(rect.left + rect.width / 2 - width / 2, width, 6),
			top: above ? rect.top - height - 8 : rect.bottom + 8,
		}
	})
	const keys = target.dataset.keys?.split(' ')

	return (
		<div
			ref={ref}
			class="absolute left-0 top-0 flex h-7 animate-pop items-center gap-2 whitespace-nowrap rounded-md bg-fg pl-2.5 pr-2 text-xs font-medium text-canvas"
			role="tooltip"
		>
			{target.dataset.tip}
			{keys && <Kbd keys={keys} tone="light" />}
		</div>
	)
}

// Wait a moment before the first tooltip, so sweeping across the toolbar doesn't flicker; once one
// is showing, moving to the next shows it straight away.
const DELAY = 450
const GRACE = 300

let timer = 0
let hiddenAt = 0

function show(target, delay) {
	clearTimeout(timer)
	timer = setTimeout(() => (tooltipFor.value = target), delay)
}

function hide() {
	clearTimeout(timer)
	if (tooltipFor.value) {
		hiddenAt = Date.now()
	}
	tooltipFor.value = null
}

const tipped = node => node?.closest?.('[data-tip]') || null

function listen() {
	for (const layer of Object.values(layers)) {
		listenIn(layer.getRootNode())
	}
	window.addEventListener('scroll', hide, { passive: true })
}

function listenIn(root) {
	root.addEventListener('pointerover', event => {
		const target = tipped(event.target)
		if (target && target !== tooltipFor.value && !target.disabled) {
			show(target, tooltipFor.value || Date.now() - hiddenAt < GRACE ? 0 : DELAY)
		}
	})
	root.addEventListener('pointerout', event => {
		// Moving between parts of the same button (its icon, its edge) isn't leaving it.
		const from = tipped(event.target)
		if (!from || !from.contains(event.relatedTarget)) {
			hide()
		}
	})
	// Focus shows tooltips for keyboard users only; a click also focuses the button.
	root.addEventListener('focusin', event => {
		const target = tipped(event.target)
		if (target?.matches(':focus-visible')) {
			show(target, 0)
		}
	})
	root.addEventListener('focusout', hide)
	root.addEventListener('pointerdown', hide)
}
