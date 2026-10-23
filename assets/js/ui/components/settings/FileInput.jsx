import { openMediaPicker } from '../../../services/media'
import { Icon } from '../Icon'

/**
 * A file (a download, say), from the media library.
 */
export function FileInput({ setting, onChange }) {
	const file = setting.value
	const choose = () =>
		openMediaPicker({ title: `Choose ${setting.label.toLowerCase()}`, multiple: false, type: setting.mimeTypes || '' }, ([picked]) =>
			onChange(picked ? { id: picked.id, filename: picked.filename, url: picked.url } : null)
		)

	return (
		<div class="flex items-center gap-2 rounded-md p-1 pl-2.5 shadow-[inset_0_0_0_1px_theme(colors.line)]">
			<Icon name="page" class="text-subtle" />
			<span class={`min-w-0 flex-1 truncate text-[13px] ${file ? '' : 'text-muted'}`}>{file ? file.filename : 'No file'}</span>
			{file && (
				<button type="button" class="h-7 rounded-md px-2 text-[13px] text-subtle hover:bg-hover hover:text-fg" onClick={() => onChange(null)}>
					Remove
				</button>
			)}
			<button type="button" class="h-7 rounded-md px-2 text-[13px] font-medium hover:bg-hover" onClick={choose}>
				{file ? 'Replace' : 'Choose'}
			</button>
		</div>
	)
}
