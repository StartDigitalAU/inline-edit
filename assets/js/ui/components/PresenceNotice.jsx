import { editing, otherEditor } from '../../state/signals'

/**
 * Someone else is editing this page: say who, at the top of the screen, while it lasts.
 */
export function PresenceNotice() {
	const editor = otherEditor.value
	if (!editing.value || !editor) {
		return null
	}
	return (
		<div
			class="pointer-events-auto absolute left-1/2 top-12 flex -translate-x-1/2 animate-pop items-center gap-2.5 rounded-full bg-canvas py-1.5 pl-1.5 pr-4 text-[13px] shadow-float"
			role="status"
		>
			<span class="relative">
				{editor.avatar ? (
					<img src={editor.avatar} alt="" class="size-7 rounded-full" />
				) : (
					<span class="block size-7 rounded-full bg-raised" />
				)}
				<span class="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-canvas bg-amber" />
			</span>
			<span>
				<span class="font-medium">{editor.name}</span>
				<span class="text-subtle"> is editing this page. You can save once they’ve finished.</span>
			</span>
		</div>
	)
}
