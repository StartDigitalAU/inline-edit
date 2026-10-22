import { LOCKED_REASONS } from '../../config'
import { lockedField } from '../../state/signals'
import { clampLeft, useFloating } from '../hooks/useFloating'
import { Icon } from './Icon'

/**
 * Why a locked field can't be edited here, with a link to the admin.
 */
export function LockedTip() {
	const field = lockedField.value
	return field ? <Tip key={field.el} {...field} /> : null
}

function Tip({ region, el }) {
	const ref = useFloating(({ width, height }) => {
		const rect = el.getBoundingClientRect()
		const top = rect.top > height + 24 ? rect.top - height - 12 : rect.bottom + 12
		return { left: clampLeft(rect.left, width, 10), top }
	})

	return (
		<div ref={ref} class="floating w-72 animate-pop rounded-xl p-3.5" role="dialog" aria-label="Locked field">
			<div class="flex items-center gap-2 font-medium">
				<Icon name="lock" class="text-subtle" />
				<span>Locked</span>
			</div>
			<p class="mb-3 mt-1.5 text-[13px] leading-5 text-subtle">{LOCKED_REASONS[region.reason] || LOCKED_REASONS.html}</p>
			{region.editUrl && (
				<a
					class="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-light hover:underline"
					href={region.editUrl}
					target="_blank"
					rel="noopener"
				>
					Edit in admin <Icon name="external" class="size-3.5" />
				</a>
			)}
		</div>
	)
}
