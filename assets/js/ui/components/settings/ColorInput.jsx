import { INPUT } from './styles'

/**
 * A colour: a swatch to pick from, and its hex code to type.
 */
export function ColorInput({ setting, onChange }) {
	const value = setting.value || ''
	return (
		<div class="flex items-center gap-2">
			<label class="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-md shadow-[inset_0_0_0_1px_theme(colors.line)]">
				<span class="absolute inset-1 rounded" style={{ background: value || 'transparent' }} />
				<input
					type="color"
					class="absolute inset-0 cursor-pointer opacity-0"
					aria-label={setting.label}
					value={value || '#000000'}
					onChange={event => onChange(event.currentTarget.value)}
				/>
			</label>
			<input
				type="text"
				class={`${INPUT} font-mono uppercase`}
				aria-label={`${setting.label} hex code`}
				placeholder="#000000"
				value={value}
				onChange={event => onChange(event.currentTarget.value.trim())}
			/>
		</div>
	)
}
