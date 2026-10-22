import { useState } from 'preact/hooks'
import { deleteRow, duplicateRow, moveRow } from '../../../services/blocks'
import { goToRow, isNewRow, listsIn, rowSummary } from '../../../services/outline'
import { hoveredRow } from '../../../state/signals'
import { Button } from '../Button'
import { Icon } from '../Icon'
import { LayoutGlyph } from '../LayoutGlyph'
import { OutlineList } from './OutlineList'

/**
 * A row in the outline: what it is, and its own rows (e.g. a block's cards) underneath, folded away
 * until opened. Click to go to it, drag to move it, or Alt+↑/↓.
 */
export function OutlineItem({ list, row, index, depth, current, dragging, onPointerDown }) {
	const [open, setOpen] = useState(false)
	const children = listsIn(row)
	const label = list.rowLabel(row)
	// The block's heading, unless it just repeats what kind of block it is.
	const heading = rowSummary(row)
	const summary = heading.toLowerCase() === label.toLowerCase() ? '' : heading

	const onKeyDown = event => {
		if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
			event.preventDefault()
			moveRow(list, row, index + (event.key === 'ArrowUp' ? -1 : 1))
		} else if (event.key === 'Enter') {
			goToRow(row)
		} else if (event.key === 'ArrowRight' && children.length) {
			setOpen(true)
		} else if (event.key === 'ArrowLeft') {
			setOpen(false)
		}
	}

	return (
		<li data-row={index} class={dragging ? 'opacity-40' : ''}>
			<div
				role="treeitem"
				tabIndex={0}
				aria-label={summary ? `${label}: ${summary}` : label}
				aria-expanded={children.length ? (open ? 'true' : 'false') : undefined}
				class={`group flex h-11 cursor-pointer select-none items-center gap-2 rounded-lg pr-1 transition-colors hover:bg-hover focus-visible:bg-hover focus-visible:shadow-none ${current === row ? 'bg-raised' : ''}`}
				style={{ paddingLeft: `${8 + depth * 16}px` }}
				onPointerDown={onPointerDown(row, () => goToRow(row))}
				onPointerEnter={() => (hoveredRow.value = { list, row })}
				onKeyDown={onKeyDown}
			>
				<button
					type="button"
					class={`grid size-4 shrink-0 place-items-center rounded text-muted hover:text-fg ${children.length ? '' : 'invisible'}`}
					aria-label={open ? 'Hide what’s inside' : 'Show what’s inside'}
					onClick={() => setOpen(!open)}
				>
					<Icon name="chevron" class={`size-3.5 transition-transform ${open ? '' : '-rotate-90'}`} />
				</button>
				<span class="grid h-6 w-8 shrink-0 place-items-center rounded bg-surface text-muted shadow-[inset_0_0_0_1px_theme(colors.edge)]">
					<LayoutGlyph fields={list.fieldsOf(row)} class="h-4 w-6" />
				</span>
				<span class="flex min-w-0 flex-1 flex-col leading-tight">
					<span class="flex items-center gap-1.5 truncate text-[13px] font-medium">
						{label}
						{isNewRow(row) && <span class="rounded bg-accent/15 px-1 text-[10px] font-semibold uppercase tracking-wide text-accent-light">New</span>}
					</span>
					{summary && <span class="truncate text-xs text-muted">{summary}</span>}
				</span>
				<span class="flex opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
					<Button variant="ghost" size="icon-sm" tip="Duplicate" disabled={!list.canDuplicate(row)} onClick={() => duplicateRow(list, row)}>
						<Icon name="copy" />
					</Button>
					<Button variant="danger" size="icon-sm" tip="Delete" disabled={!list.canRemove()} onClick={() => deleteRow(list, row)}>
						<Icon name="trash" />
					</Button>
				</span>
			</div>
			{open &&
				children.map(child => (
					<div key={child.el}>
						<OutlineList list={child} depth={depth + 1} />
						{!child.rows().length && (
							<p class="py-2 text-xs text-muted" style={{ paddingLeft: `${40 + (depth + 1) * 16}px` }}>
								No {child.item.toLowerCase()}s yet
							</p>
						)}
					</div>
				))}
		</li>
	)
}
