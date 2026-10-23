import { activeField, hoveredField, revision } from '../../state/signals'
import { clampLeft, useFloating } from '../hooks/useFloating'
import { Icon } from './Icon'

const TONES = {
	'': 'bg-accent',
	active: 'bg-accent',
	dirty: 'bg-amber text-canvas',
	error: 'bg-danger',
}

/**
 * The name of the field under the pointer (or being typed in), above its outline. Images often sit
 * in clipped frames, so theirs goes inside the corner.
 */
export function FieldLabel() {
	const field = hoveredField.value || activeField.value
	revision.value
	if (!field) {
		return null
	}
	return <Label key={field.el} {...field} />
}

function Label({ region, el }) {
	const inside = el.matches('img')
	const ref = useFloating(({ width, height }) => {
		const rect = el.getBoundingClientRect()
		let top = inside ? rect.top + 10 : rect.top - height - 9
		if (top < 6) {
			top = inside ? 6 : rect.top - 3
		}
		return { left: clampLeft(inside ? rect.left + 10 : rect.left - 7, width, 6), top }
	})

	const tone = region.error ? 'error' : region.dirty ? 'dirty' : ''
	const icon = { image: 'image', gallery: 'image', link: 'link', locked: 'lock' }[region.kind] || 'text'
	const hints = { image: 'Click to replace', gallery: 'Click to edit', link: 'Click to edit', locked: 'Locked' }
	const hint = region.dirty ? 'Edited' : hints[region.kind] || ''

	return (
		<div
			ref={ref}
			class={`absolute left-0 top-0 flex h-5 animate-pop items-center gap-[5px] rounded-[5px] pl-[5px] pr-[7px] text-xs font-medium leading-none text-white shadow-[0_2px_8px_rgb(0_0_0/0.2)] ${TONES[tone]}`}
			aria-hidden="true"
		>
			<Icon name={icon} class="size-3" />
			<span>{region.label}</span>
			{hint && <span class="border-l border-current/30 pl-[5px] opacity-80">{hint}</span>}
		</div>
	)
}
