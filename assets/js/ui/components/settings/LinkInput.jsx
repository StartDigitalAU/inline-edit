import { Toggle } from './Toggle'
import { INPUT } from './styles'

/**
 * A link field: where it goes, its text, and whether it opens in a new tab.
 */
export function LinkInput({ setting, onChange }) {
	const link = setting.value || { url: '', title: '', target: '' }
	const update = changes => {
		const next = { ...link, ...changes }
		onChange(next.url ? next : null)
	}

	return (
		<div class="flex flex-col gap-2">
			<input
				type="url"
				class={INPUT}
				aria-label={`${setting.label} URL`}
				placeholder="https:// or /a-page"
				value={link.url}
				onChange={event => update({ url: event.currentTarget.value.trim() })}
			/>
			<input
				type="text"
				class={INPUT}
				aria-label={`${setting.label} text`}
				placeholder="Link text"
				value={link.title}
				onChange={event => update({ title: event.currentTarget.value })}
			/>
			<label class="flex items-center justify-between text-[13px] text-subtle">
				Open in a new tab
				<Toggle
					label="Open in a new tab"
					checked={link.target === '_blank'}
					onChange={checked => update({ target: checked ? '_blank' : '' })}
				/>
			</label>
		</div>
	)
}
