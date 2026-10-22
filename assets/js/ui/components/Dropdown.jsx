import { useLayoutEffect, useRef } from 'preact/hooks'
import { formatPanel } from '../../state/signals'
import { onArrowKeys } from '../hooks/arrowKeys'
import { Button } from './Button'
import { Icon } from './Icon'
import { Kbd } from './Kbd'

/**
 * A dropdown in the formatting bar. Only one is open at a time, named by `formatPanel`.
 */
export function Dropdown({ name, label, active = false, tip, keys, class: className = '', children }) {
	const trigger = useRef(null)
	const open = formatPanel.value === name

	return (
		<>
			<Button
				buttonRef={trigger}
				size="sm"
				class={`gap-1 px-2 ${active || open ? 'bg-hover text-fg' : 'text-subtle hover:text-fg'} ${className}`}
				aria-haspopup="menu"
				aria-expanded={open ? 'true' : 'false'}
				tip={open ? undefined : tip}
				keys={keys}
				onClick={() => (formatPanel.value = open ? '' : name)}
			>
				<span class="truncate">{label}</span>
				<Icon name="chevron" class={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
			</Button>
			{open && (
				<Menu trigger={trigger.current} label={tip}>
					{children}
				</Menu>
			)}
		</>
	)
}

function Menu({ trigger, label, children }) {
	const ref = useRef(null)
	// Opens downwards unless the formatting bar is in the lower half of the screen.
	const above = trigger.getBoundingClientRect().top > window.innerHeight / 2

	useLayoutEffect(() => {
		// Opened from the keyboard: move into the menu.
		if (trigger.getRootNode().activeElement === trigger) {
			ref.current.querySelector('[role^="menuitem"]:not(:disabled)')?.focus()
		}
	}, [])

	return (
		<div
			ref={ref}
			class={`floating z-10 flex min-w-[200px] animate-pop flex-col rounded-xl p-1 ${above ? 'bottom-full top-auto mb-2' : 'top-full mt-2'}`}
			style={{ left: `${trigger.offsetLeft}px` }}
			role="menu"
			aria-label={label}
			onKeyDown={event => onArrowKeys(event, '[role^="menuitem"]')}
		>
			{children}
		</div>
	)
}

export function DropdownHeading({ children }) {
	return <div class="px-2 pb-1 pt-1.5 text-xs font-medium text-muted">{children}</div>
}

export function DropdownItem({ checked, disabled = false, hint, keys, onSelect, children }) {
	return (
		<button
			type="button"
			role="menuitemradio"
			aria-checked={checked ? 'true' : 'false'}
			disabled={disabled}
			class="flex min-h-8 w-full items-center gap-2 rounded-md px-2 py-1 text-left enabled:hover:bg-hover disabled:cursor-not-allowed disabled:text-muted focus-visible:bg-hover focus-visible:shadow-none"
			onClick={onSelect}
		>
			<Icon name="check" class={`size-3.5 ${checked ? 'text-fg' : 'invisible'}`} />
			<span class="flex-1">{children}</span>
			{hint && <span class="text-xs text-muted">{hint}</span>}
			{keys && <Kbd keys={keys} />}
		</button>
	)
}
