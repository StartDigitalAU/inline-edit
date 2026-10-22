import { config } from '../../config'
import { startFocus } from '../../services/focus'
import { openMediaLibrary } from '../../services/media'
import { editing, focusing, hoveredField, uploads } from '../../state/signals'
import { useFloating } from '../hooks/useFloating'
import { Button } from './Button'
import { Icon } from './Icon'

const INSET = 10

/**
 * Tools for the image under the pointer, in its bottom right corner (the top right is where a card's
 * own toolbar goes): replace it, or set its focus point.
 */
export function ImageTools() {
	const field = hoveredField.value
	if (!editing.value || field?.region.kind !== 'image' || focusing.value || uploads.value.some(u => u.el === field.el)) {
		return null
	}
	return <Tools key={field.el} {...field} />
}

function Tools({ region, el }) {
	const ref = useFloating(({ width, height }) => {
		const rect = el.getBoundingClientRect()
		const bottom = Math.min(rect.bottom, window.innerHeight - 80)
		return { left: rect.right - width - INSET, top: Math.max(bottom - height - INSET, rect.top + INSET) }
	})
	const canFocus = config.focusPoints && !!region.value

	return (
		<div ref={ref} class="floating flex animate-pop items-center gap-0.5 rounded-[10px] p-[3px]" role="toolbar" aria-label={region.label}>
			<Button size="sm" class="gap-1.5 px-2" onClick={() => openMediaLibrary(region, el)}>
				<Icon name="image" class="text-subtle" />
				Replace
			</Button>
			{canFocus && (
				<Button size="sm" class="gap-1.5 px-2" tip="Choose what stays in view when it's cropped" onClick={() => startFocus(region, el)}>
					<Icon name="focus" class="text-subtle" />
					Focus point
				</Button>
			)}
		</div>
	)
}
