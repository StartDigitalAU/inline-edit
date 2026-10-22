import { dragging } from '../../state/signals'
import { useFloating } from '../hooks/useFloating'
import { Icon } from './Icon'

/**
 * While dragging a row: its name following the pointer, and a line where it will land.
 */
export function DragLayer() {
	const drag = dragging.value
	if (!drag) {
		return null
	}
	return (
		<div class="pointer-events-auto absolute inset-0 cursor-grabbing">
			<DropLine {...drag} />
			<Chip {...drag} />
		</div>
	)
}

function Chip({ label, x, y }) {
	const ref = useFloating(() => ({ left: x + 14, top: y + 14 }))
	return (
		<div
			ref={ref}
			class="absolute left-0 top-0 flex h-8 animate-pop items-center gap-2 rounded-lg bg-canvas pl-2 pr-3 text-[13px] font-medium shadow-float"
		>
			<Icon name="grip" class="text-subtle" />
			{label}
		</div>
	)
}

function DropLine({ list, row, index, horizontal }) {
	const others = list.rows().filter(other => other !== row)
	const ref = useFloating(() => {
		const before = others[index]?.getBoundingClientRect()
		const after = others[index - 1]?.getBoundingClientRect()
		const rect = before || after
		if (!rect) {
			return null
		}
		const style = ref.current.style
		if (horizontal) {
			style.width = '3px'
			style.height = `${rect.height}px`
			return { left: (before ? rect.left - 12 : rect.right + 12) - 1.5, top: rect.top }
		}
		style.width = `${rect.width}px`
		style.height = '3px'
		return { left: rect.left, top: (before ? rect.top : rect.bottom) - 1.5 }
	})
	return (
		<div
			ref={ref}
			class="absolute left-0 top-0 rounded-full bg-accent shadow-[0_0_0_4px_rgb(0_112_243/0.2)] transition-[left,top] duration-150"
		/>
	)
}
