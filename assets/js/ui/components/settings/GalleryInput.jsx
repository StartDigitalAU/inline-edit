import { useRef, useState } from 'preact/hooks'
import { openMediaPicker } from '../../../services/media'
import { uploadFile } from '../../../services/upload'
import { Icon } from '../Icon'

/**
 * A gallery: its images in order. Drag to reorder, × to remove, Add for more from the media library,
 * or drop image files on it to upload them.
 */
export function GalleryInput({ setting, onChange }) {
	const images = setting.value || []
	const [dragging, setDragging] = useState(null)
	const [over, setOver] = useState(null)
	const [uploading, setUploading] = useState(0)
	const [dropping, setDropping] = useState(false)
	const grid = useRef(null)

	const move = (from, to) => {
		const next = [...images]
		next.splice(to, 0, next.splice(from, 1)[0])
		onChange(next)
	}
	const add = () =>
		openMediaPicker({ title: `Add to ${setting.label.toLowerCase()}`, multiple: true, type: 'image' }, picked =>
			onChange([...images, ...picked.filter(image => !images.some(existing => existing.id === image.id))])
		)
	const drop = async event => {
		event.preventDefault()
		setDropping(false)
		const files = [...(event.dataTransfer?.files || [])].filter(file => file.type.startsWith('image/'))
		if (!files.length) {
			return
		}
		setUploading(files.length)
		const uploaded = []
		for (const file of files) {
			const media = await uploadFile(file).catch(() => null)
			if (media) {
				uploaded.push({ id: media.id, url: media.media_details?.sizes?.thumbnail?.source_url || media.source_url, alt: media.alt_text || '' })
			}
			setUploading(count => count - 1)
		}
		onChange([...images, ...uploaded])
	}

	return (
		<div
			class={`flex flex-col gap-2 rounded-lg p-1.5 transition-shadow ${dropping ? 'shadow-[inset_0_0_0_2px_theme(colors.accent)]' : 'shadow-[inset_0_0_0_1px_theme(colors.line)]'}`}
			onDragOver={event => {
				event.preventDefault()
				setDropping([...(event.dataTransfer?.types || [])].includes('Files'))
			}}
			onDragLeave={() => setDropping(false)}
			onDrop={drop}
		>
			{images.length > 0 && (
				<div ref={grid} class="grid grid-cols-4 gap-1.5" role="list" aria-label={setting.label}>
					{images.map((image, index) => (
						<div
							key={image.id}
							role="listitem"
							draggable
							class={`group relative aspect-square cursor-grab overflow-hidden rounded-md bg-surface active:cursor-grabbing ${dragging === index ? 'opacity-30' : ''} ${over === index && dragging !== index ? 'outline outline-2 outline-accent' : ''}`}
							onDragStart={event => {
								setDragging(index)
								event.dataTransfer.effectAllowed = 'move'
							}}
							onDragOver={event => {
								event.preventDefault()
								event.stopPropagation()
								setOver(index)
							}}
							onDrop={event => {
								event.preventDefault()
								event.stopPropagation()
								if (dragging !== null && dragging !== index) {
									move(dragging, index)
								}
								setDragging(null)
								setOver(null)
							}}
							onDragEnd={() => {
								setDragging(null)
								setOver(null)
							}}
						>
							<img src={image.url} alt={image.alt} class="size-full object-cover" draggable={false} />
							<button
								type="button"
								class="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-black/70 text-white opacity-0 transition-opacity hover:bg-danger group-hover:opacity-100 focus-visible:opacity-100"
								aria-label={`Remove image ${index + 1}`}
								onClick={() => onChange(images.filter((_, i) => i !== index))}
							>
								<Icon name="close" class="size-3" />
							</button>
						</div>
					))}
				</div>
			)}
			<div class="flex items-center justify-between gap-2 px-1">
				<span class="text-xs text-muted">
					{uploading ? `Uploading ${uploading}…` : images.length ? `${images.length} image${images.length === 1 ? '' : 's'} · drag to reorder` : 'Drop images here, or'}
				</span>
				<button type="button" class="flex h-7 items-center gap-1 rounded-md px-2 text-[13px] font-medium hover:bg-hover" onClick={add}>
					<Icon name="plus" class="size-3.5" />
					Add images
				</button>
			</div>
		</div>
	)
}
