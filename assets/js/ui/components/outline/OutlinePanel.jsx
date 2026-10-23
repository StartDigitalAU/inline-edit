import { useEffect, useState } from 'preact/hooks'
import { rowInView, toggleOutline } from '../../../services/outline'
import { busy, editing, hoveredRow, outlineOpen, picker, revision, saving } from '../../../state/signals'
import { pageList } from '../../pageList'
import { Button } from '../Button'
import { Icon } from '../Icon'
import { Kbd } from '../Kbd'
import { OutlineList } from './OutlineList'

/**
 * The page's blocks at a glance, down the left: go to one, drag to reorder, duplicate or delete.
 */
export function OutlinePanel() {
	revision.value
	const list = pageList()
	const open = editing.value && outlineOpen.value && !!list
	const current = useRowInView(open && list)
	if (!open) {
		return null
	}
	const count = list.rows().length

	return (
		<nav
			class="floating bottom-24 left-4 top-14 flex w-72 animate-pop flex-col rounded-xl max-sm:hidden"
			aria-label="Blocks"
			onPointerLeave={() => (hoveredRow.value = null)}
		>
			<div class="flex h-11 shrink-0 items-center justify-between border-b border-edge pl-3.5 pr-1.5">
				<span class="flex items-baseline gap-2 font-medium">
					Blocks <span class="text-xs font-normal tabular-nums text-muted">{count}</span>
				</span>
				<Button variant="ghost" size="icon-sm" aria-label="Close blocks" tip="Close" keys={['B']} onClick={() => toggleOutline(false)}>
					<Icon name="close" />
				</Button>
			</div>
			<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5" role="tree" aria-label="Blocks on this page">
				{count ? (
					<OutlineList list={list} current={current} />
				) : (
					<p class="px-3 py-6 text-center text-[13px] text-subtle">No blocks yet.</p>
				)}
			</div>
			<div class="flex shrink-0 items-center justify-between gap-2 border-t border-edge p-1.5 pl-3">
				<span class="text-xs text-muted">
					Drag to reorder · <Kbd keys={['⌥', '↑']} />
				</span>
				<Button
					variant="secondary"
					size="sm"
					class="pl-2"
					disabled={saving.value || !!busy.value || !list.canAdd()}
					onClick={() => (picker.value = { list, index: count })}
				>
					<Icon name="plus" />
					Add block
				</Button>
			</div>
		</nav>
	)
}

/**
 * The block in the middle of the screen, checked once a frame while scrolling. The panel only
 * re-renders when it's a different block.
 */
function useRowInView(list) {
	const [row, setRow] = useState(null)
	useEffect(() => {
		if (!list) {
			return
		}
		let frame = 0
		const check = () => {
			frame ||= requestAnimationFrame(() => {
				frame = 0
				setRow(rowInView(list))
			})
		}
		check()
		window.addEventListener('scroll', check, { passive: true })
		return () => {
			cancelAnimationFrame(frame)
			window.removeEventListener('scroll', check)
		}
	}, [list, revision.value])
	return list ? row : null
}
