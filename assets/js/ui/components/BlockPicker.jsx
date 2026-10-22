import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import { addRow } from '../../services/blocks'
import { prefetchPreview } from '../../services/previews'
import { picker } from '../../state/signals'
import { Kbd } from './Kbd'
import { Icon } from './Icon'
import { LayoutGlyph } from './LayoutGlyph'

/**
 * Choosing what to add. A repeater's rows are all alike, so those are added straight away.
 */
export function BlockPicker() {
	const choice = picker.value
	useEffect(() => {
		if (choice && !choice.list.isFlexible) {
			picker.value = null
			addRow(choice.list, choice.index)
		}
	}, [choice])

	return choice?.list.isFlexible ? <Picker key={choice.list} {...choice} /> : null
}

// With thumbnails, layouts show as a grid of pictures, this many across.
const GRID_COLUMNS = 2

function Picker({ list, index }) {
	const visual = list.layouts.some(layout => layout.thumbnail)
	const [query, setQuery] = useState('')
	const layouts = matching(list.layouts, query)
	const available = layouts.filter(layout => !list.isLayoutFull(layout.name))
	const [highlighted, setHighlighted] = useState(available[0]?.name)
	const input = useRef(null)

	useLayoutEffect(() => input.current.focus(), [])
	useEffect(() => setHighlighted(available[0]?.name), [query])
	// Start rendering the highlighted block, so it's ready if it's chosen.
	useEffect(() => {
		const timer = highlighted && setTimeout(() => prefetchPreview(list, highlighted), 120)
		return () => clearTimeout(timer)
	}, [highlighted])

	const close = () => (picker.value = null)
	const choose = name => {
		if (name && !list.isLayoutFull(name)) {
			close()
			addRow(list, index, name)
		}
	}
	const move = step => {
		const names = available.map(layout => layout.name)
		const current = names.indexOf(highlighted)
		setHighlighted(names[(current + step + names.length) % names.length])
	}
	const steps = {
		ArrowDown: visual ? GRID_COLUMNS : 1,
		ArrowUp: visual ? -GRID_COLUMNS : -1,
		...(visual ? { ArrowRight: 1, ArrowLeft: -1 } : {}),
	}
	const onKeyDown = event => {
		if (steps[event.key]) {
			event.preventDefault()
			move(steps[event.key])
		} else if (event.key === 'Enter') {
			event.preventDefault()
			choose(highlighted)
		}
	}

	return (
		<div
			class="pointer-events-auto absolute inset-0 flex animate-fade items-start justify-center bg-black/40 px-4 pb-4 pt-[max(16px,14vh)]"
			onClick={event => event.target === event.currentTarget && close()}
		>
			<div
				class={`flex max-h-[min(640px,100%)] animate-pop flex-col overflow-hidden rounded-2xl bg-canvas shadow-float ${visual ? 'w-[min(720px,100%)]' : 'w-[min(560px,100%)]'}`}
				role="dialog"
				aria-modal="true"
				aria-label={`Add ${list.itemWithArticle}`}
			>
				<div class="flex h-14 shrink-0 items-center gap-2.5 border-b border-edge pl-[18px] pr-3.5 text-subtle">
					<Icon name="search" class="size-[18px]" />
					<input
						ref={input}
						type="text"
						class="h-full min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-muted focus-visible:shadow-none"
						placeholder={`Find ${list.itemWithArticle}…`}
						aria-label="Search blocks"
						role="combobox"
						aria-expanded="true"
						aria-controls="picker-list"
						aria-activedescendant={highlighted ? `layout-${highlighted}` : undefined}
						autocomplete="off"
						spellcheck={false}
						value={query}
						onInput={event => setQuery(event.currentTarget.value)}
						onKeyDown={onKeyDown}
					/>
					<Kbd keys={['Esc']} />
				</div>
				<div
					id="picker-list"
					role="listbox"
					aria-label="Blocks"
					class={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${visual ? 'grid grid-cols-2 content-start gap-2 p-3 max-sm:grid-cols-1' : 'p-1.5'}`}
					onMouseDown={event => event.preventDefault()}
				>
					{layouts.length ? (
						layouts.map(layout => (
							<LayoutOption
								key={layout.name}
								visual={visual}
								layout={layout}
								full={list.isLayoutFull(layout.name)}
								highlighted={layout.name === highlighted}
								onHover={() => setHighlighted(layout.name)}
								onChoose={() => choose(layout.name)}
							/>
						))
					) : (
						<div class="col-span-full px-4 py-8 text-center text-subtle">Nothing matches “{query.trim()}”</div>
					)}
				</div>
				<div class="flex shrink-0 gap-4 border-t border-edge px-4 py-2.5 text-xs text-subtle max-sm:hidden">
					<span class="flex items-center gap-1.5">
						<Kbd keys={visual ? ['←', '↑', '→', '↓'] : ['↑', '↓']} /> Choose
					</span>
					<span class="flex items-center gap-1.5">
						<Kbd keys={['↵']} /> Add
					</span>
				</div>
			</div>
		</div>
	)
}

function LayoutOption({ visual, ...props }) {
	return visual ? <LayoutCard {...props} /> : <LayoutRow {...props} />
}

function useScrollIntoView(highlighted) {
	const ref = useRef(null)
	useEffect(() => {
		if (highlighted) {
			ref.current.scrollIntoView({ block: 'nearest' })
		}
	}, [highlighted])
	return ref
}

/**
 * A layout as a picture of it, with its name.
 */
function LayoutCard({ layout, full, highlighted, onHover, onChoose }) {
	const option = useScrollIntoView(highlighted)
	return (
		<button
			ref={option}
			type="button"
			id={`layout-${layout.name}`}
			role="option"
			aria-selected={highlighted ? 'true' : 'false'}
			disabled={full}
			class={`flex flex-col gap-2 rounded-xl p-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${highlighted ? 'bg-hover' : ''}`}
			onPointerMove={() => !full && !highlighted && onHover()}
			onClick={onChoose}
		>
			<span
				class={`grid aspect-[16/10] w-full place-items-center overflow-hidden rounded-lg transition-shadow ${layout.thumbnail ? 'bg-white' : 'bg-surface'} ${highlighted ? 'shadow-[0_0_0_2px_theme(colors.accent)]' : 'shadow-[inset_0_0_0_1px_theme(colors.edge)]'}`}
			>
				{layout.thumbnail ? (
					// The whole block, scaled to fit: blocks are usually much wider than tall.
					<img src={layout.thumbnail} alt="" class="size-full object-contain" loading="lazy" />
				) : (
					<span class="text-muted">
						<LayoutGlyph fields={layout.fields} />
					</span>
				)}
			</span>
			<span class="flex items-baseline justify-between gap-2 px-0.5">
				<span class="truncate font-medium">{layout.label}</span>
				{full && <span class="shrink-0 text-xs text-amber">Limit reached</span>}
			</span>
		</button>
	)
}

/**
 * A layout as a sketch, its name and its fields.
 */
function LayoutRow({ layout, full, highlighted, onHover, onChoose }) {
	const option = useScrollIntoView(highlighted)
	const fields = layout.fields.map(field => field.label).join(' · ') || 'No fields'

	return (
		<button
			ref={option}
			type="button"
			id={`layout-${layout.name}`}
			role="option"
			aria-selected={highlighted ? 'true' : 'false'}
			disabled={full}
			class={`group flex w-full items-center gap-3.5 rounded-[10px] p-2 text-left disabled:cursor-not-allowed disabled:opacity-60 ${highlighted ? 'bg-hover' : ''}`}
			onPointerMove={() => !full && !highlighted && onHover()}
			onClick={onChoose}
		>
			<span
				class={`grid h-11 w-16 shrink-0 place-items-center rounded-lg bg-surface transition-colors ${highlighted ? 'text-fg shadow-[inset_0_0_0_1px_theme(colors.line)]' : 'text-muted shadow-[inset_0_0_0_1px_theme(colors.edge)]'}`}
			>
				<LayoutGlyph fields={layout.fields} />
			</span>
			<span class="flex min-w-0 flex-col gap-0.5">
				<span class="font-medium">{layout.label}</span>
				<span class={`truncate text-[13px] ${full ? 'text-amber' : 'text-subtle'}`}>
					{full ? `Limit of ${layout.max} reached` : fields}
				</span>
			</span>
		</button>
	)
}

function matching(layouts, query) {
	const words = query.trim().toLowerCase()
	return layouts.filter(layout =>
		`${layout.label} ${layout.fields.map(field => field.label).join(' ')}`.toLowerCase().includes(words)
	)
}
