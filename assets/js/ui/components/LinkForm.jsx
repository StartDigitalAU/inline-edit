import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import { applyLink, currentLink } from '../../services/formatting'
import { safeUrl } from '../../services/links'
import { useSiteSearch } from '../hooks/useSiteSearch'
import { Button } from './Button'
import { Icon } from './Icon'

/**
 * Add, change or remove the link at the selection: type to search the site's pages, or paste a URL.
 */
export function LinkForm() {
	const [link] = useState(currentLink)
	const [value, setValue] = useState(link?.getAttribute('href') || '')
	const [invalid, setInvalid] = useState(false)
	const [highlighted, setHighlighted] = useState(0)
	const results = useSiteSearch(value)
	const input = useRef(null)

	useLayoutEffect(() => {
		input.current.focus()
		input.current.select()
	}, [])
	useEffect(() => setHighlighted(0), [results])

	const submit = event => {
		event.preventDefault()
		if (results[highlighted]) {
			applyLink(results[highlighted].href)
			return
		}
		const href = safeUrl(value)
		if (href === null) {
			setInvalid(true)
			input.current.focus()
			return
		}
		applyLink(href)
	}

	const onKeyDown = event => {
		if (results.length && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
			event.preventDefault()
			const step = event.key === 'ArrowDown' ? 1 : -1
			setHighlighted((highlighted + step + results.length) % results.length)
		}
	}

	return (
		<form class="w-[min(420px,calc(100vw-32px))]" onSubmit={submit}>
			<div class="flex items-center gap-1.5 pl-2">
				<Icon name="link" class="text-subtle" />
				<input
					ref={input}
					type="text"
					inputMode="url"
					class={`h-8 min-w-0 flex-1 rounded-md bg-transparent px-1.5 outline-none placeholder:text-muted focus-visible:shadow-none ${invalid ? 'text-danger-text' : 'text-fg'}`}
					placeholder="Search pages or paste a link"
					aria-label="Link"
					aria-invalid={invalid ? 'true' : undefined}
					role="combobox"
					aria-expanded={results.length ? 'true' : 'false'}
					aria-controls="link-results"
					aria-activedescendant={results.length ? `link-result-${highlighted}` : undefined}
					autocomplete="off"
					spellcheck={false}
					value={value}
					onInput={event => {
						setValue(event.currentTarget.value)
						setInvalid(false)
					}}
					onKeyDown={onKeyDown}
				/>
				{link && (
					<Button variant="secondary" size="sm" onClick={() => applyLink('')}>
						Remove
					</Button>
				)}
				<Button type="submit" variant="primary" size="sm">
					Apply
				</Button>
			</div>
			{results.length > 0 && (
				<div
					id="link-results"
					role="listbox"
					class="mt-1 flex flex-col border-t border-line pt-1"
					onMouseDown={event => event.preventDefault()}
				>
					{results.map((result, index) => (
						<LinkResult
							key={result.href}
							index={index}
							result={result}
							highlighted={index === highlighted}
							onChoose={() => applyLink(result.href)}
						/>
					))}
				</div>
			)}
		</form>
	)
}

function LinkResult({ index, result, highlighted, onChoose }) {
	return (
		<button
			type="button"
			id={`link-result-${index}`}
			role="option"
			aria-selected={highlighted ? 'true' : 'false'}
			class={`grid w-full grid-cols-[1fr_auto] gap-x-3 rounded-md px-2.5 py-1.5 text-left ${highlighted ? 'bg-hover' : ''}`}
			onClick={onChoose}
		>
			<span class="truncate font-medium">{result.title}</span>
			<span class="text-xs capitalize text-muted">{result.type}</span>
			<span class="col-span-2 truncate font-mono text-xs text-subtle">{result.path}</span>
		</button>
	)
}
