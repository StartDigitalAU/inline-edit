import { useLayoutEffect, useRef, useState } from 'preact/hooks'
import { closeLinkEditor, updateLink } from '../../services/linkFields'
import { linkEditing, revision } from '../../state/signals'
import { clampToPage, useFloating } from '../hooks/useFloating'
import { useSiteSearch } from '../hooks/useSiteSearch'
import { Button } from './Button'
import { Icon } from './Icon'
import { Toggle } from './settings/Toggle'
import { INPUT } from './settings/styles'

/**
 * A link field's popover, under its <a>: the link's text, where it goes (search the site's pages
 * or paste a URL), and whether it opens in a new tab.
 */
export function LinkFieldEditor() {
	const current = linkEditing.value
	return current ? <Editor key={current.el} {...current} /> : null
}

function Editor({ region, el }) {
	revision.value
	const link = region.value || { url: '', title: '', target: '' }
	const [opened] = useState(link.url)
	const [query, setQuery] = useState(link.url)
	// Search as you type, but not for the link it already had.
	const results = useSiteSearch(query === opened ? '' : query)
	const text = useRef(null)

	useLayoutEffect(() => text.current.focus(), [])

	const ref = useFloating(({ width, height }) => {
		const rect = el.getBoundingClientRect()
		const below = rect.bottom + 10
		return {
			left: clampToPage(rect.left, width, 10),
			top: below + height > window.innerHeight - 80 ? rect.top - height - 10 : below,
		}
	})

	const update = changes => updateLink(region, { ...link, ...changes })
	const onKeyDown = event => event.key === 'Enter' && closeLinkEditor()

	return (
		<div ref={ref} class="floating flex w-80 animate-pop flex-col gap-3 rounded-xl p-3.5" role="dialog" aria-label={region.label}>
			<div class="flex items-center justify-between">
				<span class="flex items-center gap-2 text-[13px] font-medium">
					<Icon name="link" class="text-subtle" />
					{region.label}
				</span>
				{region.value && (
					<Button variant="ghost" size="sm" class="px-2 text-subtle" onClick={() => updateLink(region, null)}>
						Remove
					</Button>
				)}
			</div>
			<label class="flex flex-col gap-1.5 text-xs text-subtle">
				Text
				<input
					ref={text}
					type="text"
					class={INPUT}
					placeholder="Button text"
					value={link.title}
					onInput={event => update({ title: event.currentTarget.value })}
					onKeyDown={onKeyDown}
				/>
			</label>
			<label class="flex flex-col gap-1.5 text-xs text-subtle">
				Link
				<input
					type="text"
					inputMode="url"
					class={INPUT}
					placeholder="Search pages or paste a link"
					autocomplete="off"
					spellcheck={false}
					value={query}
					onInput={event => {
						setQuery(event.currentTarget.value)
						update({ url: event.currentTarget.value.trim() })
					}}
					onKeyDown={onKeyDown}
				/>
			</label>
			{results.length > 0 && (
				<div class="-mt-1 flex flex-col rounded-lg bg-surface p-1 shadow-[inset_0_0_0_1px_theme(colors.edge)]" role="listbox">
					{results.map(result => (
						<button
							key={result.href}
							type="button"
							role="option"
							class="flex flex-col rounded-md px-2 py-1.5 text-left hover:bg-hover"
							onClick={() => {
								setQuery(result.href)
								update({ url: result.href, title: link.title || result.title })
							}}
						>
							<span class="truncate text-[13px] font-medium">{result.title}</span>
							<span class="truncate font-mono text-xs text-muted">{result.path}</span>
						</button>
					))}
				</div>
			)}
			<label class="flex items-center justify-between text-[13px] text-subtle">
				Open in a new tab
				<Toggle label="Open in a new tab" checked={link.target === '_blank'} onChange={on => update({ target: on ? '_blank' : '' })} />
			</label>
			<div class="flex justify-end">
				<Button variant="primary" size="sm" onClick={closeLinkEditor}>
					Done
				</Button>
			</div>
		</div>
	)
}
