import { config } from '../../config'
import { toggleEditing } from '../../services/editing'
import { menuOpen, revision, shortcutsOpen } from '../../state/signals'
import { useLayoutEffect } from 'preact/hooks'
import { onArrowKeys } from '../hooks/arrowKeys'
import { clampLeft, useFloating } from '../hooks/useFloating'
import { Icon } from './Icon'
import { Kbd } from './Kbd'

const ITEM =
	'flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-fg hover:bg-hover focus-visible:bg-hover focus-visible:shadow-none'

/**
 * The "⋯" menu: the page's details and links to it in the admin.
 */
export function PageMenu({ anchor }) {
	const page = config.page
	revision.value
	const ref = useFloating(({ width, height }) => {
		const button = anchor.current.getBoundingClientRect()
		return { left: clampLeft(button.right - width, width), top: button.top - height - 10 }
	})

	useLayoutEffect(() => ref.current.querySelector('a, button')?.focus(), [])

	const close = () => (menuOpen.value = false)

	return (
		<div
			ref={ref}
			class="floating flex w-[264px] origin-bottom-right animate-pop flex-col rounded-xl p-1"
			role="menu"
			aria-label="Page"
			onKeyDown={event => onArrowKeys(event, '[role="menuitem"]')}
		>
			{page && (
				<div class="mb-1 flex flex-col gap-0.5 border-b border-line px-2.5 pb-3 pt-2.5">
					<span class="truncate font-medium">{page.title}</span>
					<span class="text-xs text-subtle">{editedLabel(page)}</span>
				</div>
			)}
			{page?.editUrl && (
				<MenuLink href={page.editUrl} icon="page" onClick={close}>
					Open in admin
				</MenuLink>
			)}
			{page?.revisionsUrl && (
				<MenuLink href={page.revisionsUrl} icon="history" onClick={close}>
					Revisions
				</MenuLink>
			)}
			<button
				type="button"
				role="menuitem"
				class={ITEM}
				onClick={() => {
					close()
					shortcutsOpen.value = true
				}}
			>
				<Icon name="keyboard" class="text-subtle" />
				<span class="flex-1">Keyboard shortcuts</span>
				<Kbd keys={['?']} />
			</button>
			<span class="mx-1 my-1 h-px bg-line" />
			<button
				type="button"
				role="menuitem"
				class={ITEM}
				onClick={() => {
					close()
					toggleEditing()
				}}
			>
				<Icon name="exit" class="text-subtle" />
				<span class="flex-1">Stop editing</span>
				<Kbd keys={['E']} />
			</button>
		</div>
	)
}

function MenuLink({ href, icon, onClick, children }) {
	return (
		<a role="menuitem" class={ITEM} href={href} target="_blank" rel="noopener" onClick={onClick}>
			<Icon name={icon} class="text-subtle" />
			<span class="flex-1">{children}</span>
			<Icon name="external" class="size-3.5 text-muted" />
		</a>
	)
}

/** "Edited 5 minutes ago by Sam". */
function editedLabel(page) {
	const modified = Date.parse(page.modified)
	if (!modified) {
		return ''
	}
	const seconds = Math.round((modified - Date.now()) / 1000)
	const units = [
		['year', 31536000],
		['month', 2592000],
		['day', 86400],
		['hour', 3600],
		['minute', 60],
	]
	const [unit, size] = units.find(([, size]) => Math.abs(seconds) >= size) || []
	const when = unit
		? new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(Math.round(seconds / size), unit)
		: 'just now'
	return `Edited ${when}${page.modifiedBy ? ` by ${page.modifiedBy}` : ''}`
}
