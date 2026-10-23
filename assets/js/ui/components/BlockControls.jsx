import { useState } from 'preact/hooks'
import { deleteRow, duplicateRow, moveRow } from '../../services/blocks'
import { MOD } from '../../config'
import { canCopy, copyRow } from '../../services/clipboard'
import { startDrag } from '../../services/drag'
import { toggleHidden } from '../../services/visibility'
import { hasSettings } from '../../services/settings'
import { busy, dragging, editing, hoveredRow, picker, revision, saving, settingsFor } from '../../state/signals'
import { clampToPage, useFloating } from '../hooks/useFloating'
import { Button } from './Button'
import { Icon } from './Icon'

const INSET = 10

/**
 * Controls for the block (or card) under the pointer: an outline, a toolbar to move, duplicate or
 * delete it, and buttons on its edges to add one before or after it.
 */
export function BlockControls() {
	// While a block's settings are open, its controls stay put.
	const hovered = settingsFor.value || hoveredRow.value
	revision.value
	if (!editing.value || !hovered?.row.isConnected || busy.value || saving.value || picker.value || dragging.value) {
		return null
	}
	return <Controls key={hovered.row} {...hovered} />
}

function Controls({ list, row }) {
	const [edge, setEdge] = useState(null)
	const horizontal = list.isHorizontal()
	const item = list.itemWithArticle
	const canInsert = list.canAdd()
	const insertAt = index => (picker.value = { list, index })
	const index = list.indexOf(row)

	return (
		<>
			<Outline row={row} />
			{edge && <InsertLine row={row} edge={edge} horizontal={horizontal} />}
			<Toolbar list={list} row={row} horizontal={horizontal} />
			{canInsert && (
				<>
					<InsertButton
						row={row}
						edge="before"
						horizontal={horizontal}
						tip={`Add ${item} ${horizontal ? 'before' : 'above'}`}
						onHover={setEdge}
						onClick={() => insertAt(index)}
					/>
					<InsertButton
						row={row}
						edge="after"
						horizontal={horizontal}
						tip={`Add ${item} ${horizontal ? 'after' : 'below'}`}
						onHover={setEdge}
						onClick={() => insertAt(index + 1)}
					/>
				</>
			)}
		</>
	)
}

/**
 * Light and dark rings together, so the outline shows on any section colour.
 */
function Outline({ row }) {
	const ref = useFloating(() => {
		const rect = row.getBoundingClientRect()
		return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
	})
	return (
		<div
			ref={ref}
			class="pointer-events-none absolute left-0 top-0 rounded-sm shadow-[inset_0_0_0_1px_rgb(255_255_255/0.6),inset_0_0_0_2px_rgb(10_10_10/0.6)]"
		/>
	)
}

function Toolbar({ list, row, horizontal }) {
	const index = list.indexOf(row)
	const last = list.rows().length - 1

	// Top right of the block, kept in view while scrolling through a tall one.
	const ref = useFloating(({ width, height }) => {
		const rect = row.getBoundingClientRect()
		const stuckToScreen = Math.max(rect.top + INSET, INSET)
		return {
			left: clampToPage(rect.right - width - INSET, width, INSET),
			top: Math.max(Math.min(stuckToScreen, rect.bottom - height - INSET), rect.top),
		}
	})

	return (
		<div
			ref={ref}
			class="floating flex animate-pop items-center gap-0.5 rounded-[10px] p-[3px]"
			role="toolbar"
			aria-label={list.rowLabel(row)}
		>
			<DragHandle list={list} row={row} />
			<Button
				variant="ghost"
				size="icon-sm"
				class="ml-1"
				tip={horizontal ? 'Move left' : 'Move up'}
				disabled={index === 0}
				onClick={() => moveRow(list, row, index - 1)}
			>
				<Icon name="up" class={horizontal ? '-rotate-90' : ''} />
			</Button>
			<Button
				variant="ghost"
				size="icon-sm"
				tip={horizontal ? 'Move right' : 'Move down'}
				disabled={index === last}
				onClick={() => moveRow(list, row, index + 1)}
			>
				<Icon name="down" class={horizontal ? '-rotate-90' : ''} />
			</Button>
			{hasSettings(list, row) && !list.isHidden(row) && (
				<Button
					variant="ghost"
					size="icon-sm"
					tip="Settings"
					aria-expanded={settingsFor.value?.row === row ? 'true' : 'false'}
					onClick={() => (settingsFor.value = settingsFor.value?.row === row ? null : { list, row })}
				>
					<Icon name="settings" />
				</Button>
			)}
			{list.canHide && (
				<Button
					variant="ghost"
					size="icon-sm"
					tip={list.isHidden(row) ? 'Show to visitors' : 'Hide from visitors'}
					onClick={() => toggleHidden(list, row)}
				>
					<Icon name={list.isHidden(row) ? 'eye' : 'eyeOff'} />
				</Button>
			)}
			{list.isFlexible && (
				<Button variant="ghost" size="icon-sm" tip="Copy, to paste here or on another page" keys={[MOD, 'C']} disabled={!canCopy(list, row)} onClick={() => copyRow(list, row)}>
					<Icon name="clipboard" />
				</Button>
			)}
			<Button variant="ghost" size="icon-sm" tip="Duplicate" disabled={!list.canDuplicate(row)} onClick={() => duplicateRow(list, row)}>
				<Icon name="copy" />
			</Button>
			<Button
				variant="danger"
				size="icon-sm"
				tip="Delete"
				disabled={!list.canRemove()}
				onClick={() => deleteRow(list, row)}
			>
				<Icon name="trash" />
			</Button>
		</div>
	)
}

/**
 * The block's name, which is also what you drag it by.
 */
function DragHandle({ list, row }) {
	const movable = list.rows().length > 1
	return (
		<span
			class={`flex h-7 max-w-[200px] select-none items-center gap-1 rounded-[7px] border-r border-line pl-1 pr-2 text-[13px] font-medium ${movable ? 'cursor-grab hover:bg-hover active:cursor-grabbing' : ''}`}
			data-tip={movable ? 'Drag to move' : undefined}
			onPointerDown={event => movable && startDrag(list, row, event)}
		>
			{movable && <Icon name="grip" class="text-muted" />}
			<span class="truncate">{list.rowLabel(row)}</span>
		</span>
	)
}

/**
 * A round "+" on the middle of one edge: top and bottom for stacked rows, sides for a grid.
 * Neighbouring rows' buttons share a spot, so these don't animate in (it would flash on every
 * move between rows) or grow on hover (its edge would flicker under the pointer).
 */
function InsertButton({ row, edge, horizontal, tip, onHover, onClick }) {
	const ref = useFloating(({ width, height }) => {
		const rect = row.getBoundingClientRect()
		const x = horizontal ? (edge === 'before' ? rect.left : rect.right) : rect.left + rect.width / 2
		const y = horizontal ? rect.top + Math.min(rect.height, window.innerHeight) / 2 : edge === 'before' ? rect.top : rect.bottom
		return { left: x - width / 2, top: y - height / 2 }
	})

	return (
		<button
			ref={ref}
			type="button"
			class="pointer-events-auto absolute left-0 top-0 grid size-7 place-items-center rounded-full bg-canvas text-fg shadow-float transition-colors hover:bg-accent hover:text-white"
			data-tip={tip}
			aria-label={tip}
			onPointerEnter={() => onHover(edge)}
			onPointerLeave={() => onHover(null)}
			onClick={onClick}
		>
			<Icon name="plus" />
		</button>
	)
}

/**
 * Where a new row will go, while its "+" is hovered.
 */
function InsertLine({ row, edge, horizontal }) {
	const ref = useFloating(() => {
		const rect = row.getBoundingClientRect()
		const x = horizontal ? (edge === 'before' ? rect.left : rect.right) - 1 : rect.left
		const y = horizontal ? rect.top : (edge === 'before' ? rect.top : rect.bottom) - 1
		return { left: x, top: y, width: horizontal ? 2 : rect.width, height: horizontal ? rect.height : 2 }
	})
	return (
		<div ref={ref} class="pointer-events-none absolute left-0 top-0 rounded-sm bg-accent shadow-[0_0_0_3px_rgb(0_112_243/0.2)]" />
	)
}
