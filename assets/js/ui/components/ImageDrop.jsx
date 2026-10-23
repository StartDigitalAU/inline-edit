import { dropTarget, uploads } from '../../state/signals'
import { useFloating } from '../hooks/useFloating'

/**
 * Over an image field: "Drop to replace" while a file is dragged over it, and progress while one
 * uploads.
 */
export function ImageDrop() {
	const target = dropTarget.value
	return (
		<>
			{target && <Cover key={target} el={target} label="Drop to replace" />}
			{uploads.value.map(({ el, progress }) => (
				<Cover key={el} el={el} label={`Uploading ${Math.round(progress * 100)}%`} progress={progress} />
			))}
		</>
	)
}

function Cover({ el, label, progress }) {
	const ref = useFloating(() => {
		const rect = el.getBoundingClientRect()
		return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
	})
	const uploading = progress !== undefined

	return (
		<div
			ref={ref}
			class={`pointer-events-none absolute left-0 top-0 grid animate-fade place-items-center rounded-sm ${uploading ? 'bg-black/50' : 'bg-accent/20 shadow-[inset_0_0_0_2px_theme(colors.accent)]'}`}
		>
			<div class="flex w-48 flex-col items-center gap-2.5 rounded-xl bg-canvas px-4 py-3 shadow-float">
				<span class="text-[13px] font-medium tabular-nums">{label}</span>
				{uploading && (
					<span class="h-1 w-full overflow-hidden rounded-full bg-line">
						<span class="block h-full rounded-full bg-accent transition-[width]" style={{ width: `${progress * 100}%` }} />
					</span>
				)}
			</div>
		</div>
	)
}
