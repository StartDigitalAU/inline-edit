import { INPUT } from './styles'

/**
 * A number, or a slider for a range field.
 */
export function NumberInput({ setting, onChange }) {
	const { value, min, max, step, prepend, append, label, type } = setting
	const commit = event => {
		const text = event.currentTarget.value
		onChange(text === '' ? null : Number(text))
	}

	if (type === 'range') {
		return (
			<div class="flex items-center gap-3">
				<input
					type="range"
					class="h-1 flex-1 cursor-pointer accent-[#0070f3]"
					aria-label={label}
					min={min ?? 0}
					max={max ?? 100}
					step={step ?? 1}
					value={value ?? min ?? 0}
					onChange={commit}
				/>
				<span class="w-10 text-right font-mono text-xs tabular-nums text-subtle">
					{value ?? '—'}
					{append}
				</span>
			</div>
		)
	}

	return (
		<div class="flex items-center gap-2">
			{prepend && <span class="text-[13px] text-subtle">{prepend}</span>}
			<input
				type="number"
				class={INPUT}
				aria-label={label}
				min={min ?? undefined}
				max={max ?? undefined}
				step={step ?? 'any'}
				value={value ?? ''}
				onChange={commit}
			/>
			{append && <span class="text-[13px] text-subtle">{append}</span>}
		</div>
	)
}
