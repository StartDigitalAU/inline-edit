import { isHttpUrl } from '../model/images'
import { mediaOpen } from '../state/signals'
import { setStatus } from '../state/status'
import { fieldChanged } from './fields'

/**
 * Picking an image field's image from the WordPress media library.
 */

const frames = new Map()

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
			region.setImage(attachment)
			fieldChanged(region)
		}
	})
	frame.on('close', () => {
		mediaOpen.value = false
		el.focus({ preventScroll: true })
	})

	return frame
}
