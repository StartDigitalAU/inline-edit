import { pending, changesLabel } from '../../services/changes'
import { status } from '../../state/signals'

const DOT = {
	clean: 'size-2 bg-muted',
	dirty: 'size-2 bg-amber animate-pulse',
	saving: 'size-3 -m-0.5 border-[1.5px] border-line border-t-fg animate-spin',
	saved: 'size-2 bg-success',
	error: 'size-2 bg-danger',
}

const TEXT = {
	clean: 'text-subtle',
	dirty: 'text-fg',
	saving: 'text-subtle',
	saved: 'text-success',
	error: 'text-danger-text whitespace-normal',
}

/**
 * What's going on: unsaved changes, saving, saved, or what went wrong.
 */
export function Status() {
	const { count } = pending.value
	let { state, message, link } = status.value
	if (!state || (state === 'saved' && count)) {
		state = count ? 'dirty' : 'clean'
		message = count ? changesLabel(count) : 'No changes'
	}

	return (
		<div class="flex min-w-0 items-center gap-2 pl-2.5 pr-2 text-[13px]" role="status" aria-live="polite">
			<span class={`shrink-0 rounded-full transition-colors ${DOT[state]}`} aria-hidden="true" />
			<span class={`truncate tabular-nums ${TEXT[state]}`}>{message}</span>
			{state === 'error' && link && (
				<a
					class="font-medium text-fg underline decoration-muted underline-offset-[3px]"
					href={link.href}
					target="_blank"
					rel="noopener"
				>
					{link.label}
				</a>
			)}
		</div>
	)
}
