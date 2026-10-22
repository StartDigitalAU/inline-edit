import { Icon } from '../Icon'
import { INPUT } from './styles'

// Up to this many short choices show side by side; more go in a dropdown.
const SEGMENTS = 4
const SEGMENT_LENGTH = 12

/**
 * One of a field's choices: a segmented control for a few short ones, otherwise a dropdown.
 */
export function Choice({ setting, onChange }) {
	const { choices, value, allowNull, label } = setting
	const segmented =
		setting.type !== 'select' &&
		choices.length <= SEGMENTS &&
		choices.every(([, text]) => text.length <= SEGMENT_LENGTH)

	return segmented ? (
		<div class="flex rounded-md bg-surface p-0.5 shadow-[inset_0_0_0_1px_theme(colors.line)]" role="radiogroup" aria-label={label}>
			{choices.map(([choice, text]) => (
				<button
					key={choice}
					type="button"
					role="radio"
					aria-checked={value === choice ? 'true' : 'false'}
					class={`h-7 flex-1 rounded-[5px] px-2 text-[13px] font-medium transition-colors ${value === choice ? 'bg-hover text-fg shadow-[0_0_0_1px_theme(colors.line)]' : 'text-subtle hover:text-fg'}`}
					onClick={() => onChange(choice)}
				>
					{text}
				</button>
			))}
		</div>
	) : (
		<div class="relative">
			<select
				class={`${INPUT} appearance-none pr-8`}
				aria-label={label}
				value={value}
				onChange={event => onChange(event.currentTarget.value)}
			>
				{allowNull && <option value="">—</option>}
				{choices.map(([choice, text]) => (
					<option key={choice} value={choice}>
						{text}
					</option>
				))}
			</select>
			<Icon name="chevron" class="pointer-events-none absolute right-2.5 top-2 size-3.5 text-muted" />
		</div>
	)
}
