import { isHttpUrl } from '../model/images'
import { mediaOpen } from '../state/signals'
import { setStatus } from '../state/status'
import { fieldChanged } from './fields'
import { record } from './history'

/**
 * Picking an image field's image from the WordPress media library.
 */

const frames = new Map()

/**
 * Show a new image in a field, undoably.
 */
export function replaceImage(region, attachment) {
	const before = region.imageSnapshot()
	region.setImage(attachment)
	fieldChanged(region)
	const after = region.imageSnapshot()

	const show = ({ value, image }) => {
		region.showImage(value, image)
		fieldChanged(region)
	}
	record({ label: `Replace ${region.label.toLowerCase()}`, undo: () => show(before), redo: () => show(after) })
}

export function openMediaLibrary(region, el) {
	const media = window.wp?.media
	if (!media) {
		setStatus('error', 'The media library couldn’t load. Reload the page and try again.')
		return
	}
	if (!frames.has(region)) {
		frames.set(region, createFrame(media, region, el))
	}
	frames.get(region).open()
}

function createFrame(media, region, el) {
	const library = { type: 'image', ...(region.uploadedTo ? { uploadedTo: region.uploadedTo } : {}) }
	const frame = media({
		title: `Replace ${region.label.toLowerCase()}`,
		library,
		multiple: false,
		button: { text: 'Use this image' },
	})

	frame.on('open', () => {
		mediaOpen.value = true
		// Start on the library rather than the upload tab, with the current image selected.
		frame.content.mode('browse')
		const current = region.value ? media.attachment(Number(region.value)) : null
		frame.state().get('selection').reset(current ? [current] : [])
	})
	frame.on('select', () => {
		const attachment = frame.state().get('selection').first()?.toJSON()
		if (attachment?.id && isHttpUrl(attachment.url)) {
			replaceImage(region, attachment)
		}
	})
	frame.on('close', () => {
		mediaOpen.value = false
		el.focus({ preventScroll: true })
	})

	return frame
}
