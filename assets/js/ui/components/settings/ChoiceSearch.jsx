import { useEffect, useState } from 'preact/hooks'
import { searchChoices } from '../../../services/settings'
import { Icon } from '../Icon'
import { INPUT } from './styles'

const DELAY = 200

/**
 * Posts, pages or terms, searched with the field's own settings (see src/Rest/ChoicesController.php).
 * Chosen ones show as chips (in order, for a field that takes several) or as the one choice.
 */
export function ChoiceSearch({ setting, list, row, onChange }) {
	const chosen = setting.multiple ? setting.value || [] : setting.value ? [setting.value] : []
	const [query, setQuery] = useState('')
	const [open, setOpen] = useState(false)
	const choices = useChoices(list, row, setting, open ? query : null)

	const choose = choice => {
		onChange(setting.multiple ? [...chosen.filter(item => item.id !== choice.id), choice] : choice)
		setQuery('')
		setOpen(setting.multiple)
	}
	const remove = id => onChange(setting.multiple ? chosen.filter(item => item.id !== id) : null)

	return (
		<div class="flex flex-col gap-1.5">
			{chosen.length > 0 && (
				<div class="flex flex-wrap gap-1">
					{chosen.map(item => (
						<span key={item.id} class="flex h-7 max-w-full items-center gap-1 rounded-md bg-raised pl-2 pr-1 text-[13px] shadow-[inset_0_0_0_1px_theme(colors.line)]">
							<span class="truncate">{item.text}</span>
							<button type="button" class="grid size-5 place-items-center rounded text-muted hover:bg-hover hover:text-fg" aria-label={`Remove ${item.text}`} onClick={() => remove(item.id)}>
								<Icon name="close" class="size-3" />
							</button>
						</span>
					))}
				</div>
			)}
			{(setting.multiple || !chosen.length) && (
				<div class="relative">
					<input
						type="text"
						class={`${INPUT} pl-8`}
						placeholder={`Find ${setting.type === 'taxonomy' ? 'terms' : 'pages and posts'}…`}
						aria-label={setting.label}
						value={query}
						onFocus={() => setOpen(true)}
						onBlur={() => setTimeout(() => setOpen(false), 150)}
						onInput={event => setQuery(event.currentTarget.value)}
					/>
					<Icon name="search" class="pointer-events-none absolute left-2.5 top-2 size-4 text-muted" />
					{open && choices.length > 0 && (
						<div class="absolute inset-x-0 top-full z-10 mt-1 flex max-h-56 flex-col overflow-y-auto rounded-lg bg-canvas p-1 shadow-float" role="listbox">
							{choices
								.filter(choice => !chosen.some(item => item.id === choice.id))
								.map(choice => (
									<button
										key={choice.id}
										type="button"
										role="option"
										class="truncate rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-hover"
										onMouseDown={event => event.preventDefault()}
										onClick={() => choose(choice)}
									>
										{choice.text}
									</button>
								))}
						</div>
					)}
				</div>
			)}
		</div>
	)
}

function useChoices(list, row, setting, query) {
	const [choices, setChoices] = useState([])
	useEffect(() => {
		if (query === null) {
			return
		}
		let current = true
		const timer = setTimeout(() => {
			searchChoices(list, row, setting, query)
				.then(found => current && setChoices(found))
				.catch(() => {})
		}, DELAY)
		return () => {
			current = false
			clearTimeout(timer)
		}
	}, [query])
	return choices
}
