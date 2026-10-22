import { ALT, BLOCKS, MOD, STYLE_FORMATS } from '../../config'
import {
	applyStyle,
	clearFormatting,
	formatState,
	selectionRange,
	setBlock,
	styleTarget,
	toggle,
} from '../../services/formatting'
import { activeField, formatPanel, mediaOpen, selection } from '../../state/signals'
import { clampLeft, useFloating } from '../hooks/useFloating'
import { Dropdown, DropdownHeading, DropdownItem } from './Dropdown'
import { Icon } from './Icon'
import { LinkForm } from './LinkForm'
import { Separator } from './Separator'
import { ToolButton } from './ToolButton'

// Room the bottom bar takes, which the formatting bar stays clear of.
const BOTTOM_BAR_SPACE = 76

const HEADING_PREVIEW = {
	p: '',
	h1: 'text-xl font-semibold',
	h2: 'text-lg font-semibold',
	h3: 'text-base font-semibold',
	h4: 'font-semibold',
	h5: 'text-[13px] font-semibold',
	h6: 'text-xs font-semibold uppercase tracking-wide',
}

/**
 * Formatting for the rich text field being edited, above the selection.
 */
export function FormatBar() {
	const field = activeField.value
	if (!field || field.region.kind !== 'rich' || mediaOpen.value) {
		return null
	}
	return <Bar key={field.el} el={field.el} />
}

function Bar({ el }) {
	selection.value
	const ref = useFloating(({ width, height }) => {
		const range = selectionRange()?.getBoundingClientRect()
		const rect = range && (range.width || range.height) ? range : el.getBoundingClientRect()
		let top = rect.top - height - 10
		if (top < 10) {
			top = rect.bottom + 10
		}
		top = Math.min(top, window.innerHeight - BOTTOM_BAR_SPACE - height)
		return { left: clampLeft(rect.left + rect.width / 2 - width / 2, width, 10), top }
	})

	return (
		<div
			ref={ref}
			class="floating animate-pop rounded-xl p-1"
			// Keep the field's selection when using the bar (except in the link field).
			onMouseDown={event => event.target.closest('input') || event.preventDefault()}
		>
			{formatPanel.value === 'link' ? <LinkForm /> : <Tools />}
		</div>
	)
}

function Tools() {
	const state = formatState()
	const blockLabel = BLOCKS.find(([tag]) => tag === state.block)[1]

	return (
		<div class="flex items-center gap-0.5" role="toolbar" aria-label="Text formatting">
			<Dropdown name="block" label={blockLabel} tip="Paragraph or heading" keys={[MOD, ALT, '0–6']} class="w-[118px] justify-between">
				{BLOCKS.map(([tag, label], index) => (
					<DropdownItem key={tag} checked={state.block === tag} keys={[MOD, ALT, String(index)]} onSelect={() => setBlock(tag)}>
						<span class={HEADING_PREVIEW[tag]}>{label}</span>
					</DropdownItem>
				))}
			</Dropdown>
			{STYLE_FORMATS.length > 0 && <StyleDropdown current={state.style} />}
			<Separator />
			<ToolButton active={state.bold} tip="Bold" keys={[MOD, 'B']} onClick={() => toggle('bold')}>
				<b class="font-serif text-[15px]">B</b>
			</ToolButton>
			<ToolButton active={state.italic} tip="Italic" keys={[MOD, 'I']} onClick={() => toggle('italic')}>
				<i class="font-serif text-[15px]">I</i>
			</ToolButton>
			<ToolButton active={state.link} tip="Link" keys={[MOD, 'K']} onClick={() => (formatPanel.value = 'link')}>
				<Icon name="link" />
			</ToolButton>
			<Separator />
			<ToolButton active={state.bulleted} tip="Bulleted list" onClick={() => toggle('insertUnorderedList')}>
				<Icon name="bulleted" />
			</ToolButton>
			<ToolButton active={state.numbered} tip="Numbered list" onClick={() => toggle('insertOrderedList')}>
				<Icon name="numbered" />
			</ToolButton>
			<ToolButton tip="Clear formatting" onClick={clearFormatting}>
				<Icon name="clear" />
			</ToolButton>
		</div>
	)
}

function StyleDropdown({ current }) {
	return (
		<Dropdown name="style" label={current?.title || 'Formats'} active={!!current} tip="Formats" class="max-w-[140px]">
			<DropdownHeading>Formats</DropdownHeading>
			{STYLE_FORMATS.map(format => (
				<DropdownItem
					key={format.title}
					checked={current === format}
					disabled={!styleTarget(format)}
					hint={format.selector.trim() === 'a' ? 'Select a link' : ''}
					onSelect={() => applyStyle(format)}
				>
					{format.title}
				</DropdownItem>
			))}
		</Dropdown>
	)
}
