import { finishFocus, moveFocus } from '../../services/focus'
import { focusing, revision } from '../../state/signals'
import { useFloating } from '../hooks/useFloating'
import { Button } from './Button'

/**
 * Setting an image's focus point: drag (or click) on the image to place the crosshair. The image
 * shows the new crop as you go; Apply (or Esc) finishes.
 */
export function FocusEditor() {
	const current = focusing.value
	revision.value
	return current ? <Editor key={current.el} {...current} /> : null
}

function Editor({ el, point }) {
	const ref = useFloating(() => {
		const rect = el.getBoundingClientRect()
		return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
	})

	const place = event => {
		const rect = ref.current.getBoundingClientRect()
		moveFocus(((event.clientX - rect.left) / rect.width) * 100, ((event.clientY - rect.top) / rect.height) * 100)
	}
	const onPointerDown = event => {
		if (event.target.closest('button')) {
			return
		}
		event.currentTarget.setPointerCapture(event.pointerId)
		place(event)
	}

	return (
		<div
			ref={ref}
			class="pointer-events-auto absolute left-0 top-0 cursor-crosshair touch-none rounded-sm shadow-[inset_0_0_0_2px_theme(colors.accent)]"
			onPointerDown={onPointerDown}
			onPointerMove={event => event.buttons === 1 && place(event)}
		>
			{/* Thirds, to line things up against. */}
			<div class="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,transparent_33.2%,rgb(255_255_255/0.35)_33.3%,transparent_33.5%,transparent_66.5%,rgb(255_255_255/0.35)_66.6%,transparent_66.8%),linear-gradient(to_bottom,transparent_33.2%,rgb(255_255_255/0.35)_33.3%,transparent_33.5%,transparent_66.5%,rgb(255_255_255/0.35)_66.6%,transparent_66.8%)]" />
			<div
				class="pointer-events-none absolute size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-accent/40 shadow-[0_0_0_1px_rgb(0_0_0/0.4),0_4px_12px_rgb(0_0_0/0.35)]"
				style={{ left: `${point.x}%`, top: `${point.y}%` }}
			>
				<span class="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
			</div>
			<div class="absolute bottom-3 right-3 flex items-center gap-2 rounded-[10px] bg-canvas py-1 pl-3 pr-1 shadow-float">
				<span class="font-mono text-xs tabular-nums text-subtle">
					{Math.round(point.x)}% {Math.round(point.y)}%
				</span>
				<Button variant="primary" size="sm" onClick={finishFocus}>
					Apply
				</Button>
			</div>
		</div>
	)
}
