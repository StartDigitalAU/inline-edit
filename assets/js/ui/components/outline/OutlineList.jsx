import { Fragment } from 'preact'
import { useRef } from 'preact/hooks'
import { useListDrag } from './useListDrag'
import { revision } from '../../../state/signals'
import { OutlineItem } from './OutlineItem'

/**
 * One list's rows in the outline (a page's blocks, or a block's cards), with a line showing where a
 * dragged row will land.
 */
export function OutlineList({ list, depth = 0, current }) {
	// Rows change without this component's props changing, so it follows the page itself.
	revision.value
	const items = useRef(null)
	const { drag, onPointerDown } = useListDrag(list, items)
	const rows = list.rows()

	// The row the dragged one would land before, or null for the end.
	const before = drag ? (rows.filter(row => row !== drag.row)[drag.index] ?? null) : undefined

	return (
		<ul ref={items} class="flex flex-col" role="group">
			{rows.map((row, index) => (
				<Fragment key={row}>
					{before === row && <DropLine depth={depth} />}
					<OutlineItem
						list={list}
						row={row}
						index={index}
						depth={depth}
						current={current}
						dragging={drag?.row === row}
						onPointerDown={onPointerDown}
					/>
				</Fragment>
			))}
			{before === null && <DropLine depth={depth} />}
		</ul>
	)
}

function DropLine({ depth }) {
	return (
		<li class="pointer-events-none relative h-0" style={{ marginLeft: `${12 + depth * 16}px` }} aria-hidden="true">
			<span class="absolute -top-px left-0 right-2 h-0.5 rounded-full bg-accent shadow-[0_0_0_3px_rgb(0_112_243/0.2)]" />
		</li>
	)
}
