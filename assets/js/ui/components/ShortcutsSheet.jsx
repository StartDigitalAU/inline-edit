import { useLayoutEffect, useRef } from 'preact/hooks'
import { ALT, MOD } from '../../config'
import { shortcutsOpen } from '../../state/signals'
import { Button } from './Button'
import { Kbd } from './Kbd'

const SHORTCUTS = [
	['Start or stop editing', [['E']]],
	['Save changes', [[MOD, 'S']]],
	['Undo / redo', [[MOD, 'Z'], [MOD, '⇧', 'Z']]],
	['Paragraph / heading 1–6', [[MOD, ALT, '0–6']]],
	['Bold / italic', [[MOD, 'B'], [MOD, 'I']]],
	['Add a link', [[MOD, 'K']]],
	['Leave the field', [['Esc']]],
	['Show shortcuts', [['?']]],
]

/**
 * Every keyboard shortcut, from the page menu or the ? key.
 */
export function ShortcutsSheet() {
	if (!shortcutsOpen.value) {
		return null
	}
	return <Sheet close={() => (shortcutsOpen.value = false)} />
}

function Sheet({ close }) {
	const closeButton = useRef(null)
	useLayoutEffect(() => closeButton.current.focus(), [])

	return (
		<div
			class="pointer-events-auto absolute inset-0 grid animate-fade place-items-center bg-black/40 p-4"
			onClick={event => event.target === event.currentTarget && close()}
		>
			<div
				class="w-[min(420px,100%)] animate-pop rounded-2xl bg-canvas p-2 shadow-float"
				role="dialog"
				aria-modal="true"
				aria-labelledby="shortcuts-title"
			>
				<div class="flex items-center justify-between pb-3 pl-3 pr-2 pt-2">
					<h2 id="shortcuts-title" class="text-base font-semibold">
						Keyboard shortcuts
					</h2>
					<Button buttonRef={closeButton} variant="ghost" size="sm" class="px-1.5" aria-label="Close" onClick={close}>
						<Kbd keys={['Esc']} />
					</Button>
				</div>
				<dl class="divide-y divide-edge rounded-[10px] bg-surface p-1 shadow-[inset_0_0_0_1px_theme(colors.edge)]">
					{SHORTCUTS.map(([action, combos]) => (
						<div key={action} class="flex h-10 items-center justify-between gap-4 px-2.5">
							<dt class="text-subtle">{action}</dt>
							<dd class="flex gap-2">
								{combos.map(keys => (
									<Kbd key={keys.join()} keys={keys} />
								))}
							</dd>
						</div>
					))}
				</dl>
			</div>
		</div>
	)
}
