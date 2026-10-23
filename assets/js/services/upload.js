import { config } from '../config'
import { uploads } from '../state/signals'
import { setStatus } from '../state/status'
import { nonceHeader } from './api'
import { replaceImage } from './media'

/**
 * Uploading an image dropped onto an image field, then showing it there (undoably, like picking one
 * from the media library).
 */
export async function uploadImage(region, el, file) {
	if (!file.type.startsWith('image/')) {
		setStatus('error', 'Only images can go here.')
		return
	}

	const entry = { el, progress: 0 }
	uploads.value = [...uploads.value, entry]
	const progress = value => {
		entry.progress = value
		uploads.value = [...uploads.value]
	}

	try {
		const media = await uploadFile(file, region.uploadedTo, progress)
		replaceImage(region, { id: media.id, url: media.source_url, alt: media.alt_text || '' })
	} catch (error) {
		setStatus('error', error.message)
	} finally {
		uploads.value = uploads.value.filter(item => item !== entry)
	}
}

/**
 * Upload a file to the media library (attached to a post, optionally), reporting progress (which
 * fetch() can't). Resolves with the REST API's attachment.
 */
export function uploadFile(file, attachTo = null, onProgress = () => {}) {
	return new Promise((resolve, reject) => {
		const url = new URL(config.mediaEndpoint, location.href)
		if (attachTo) {
			url.searchParams.set('post', attachTo)
		}
		const xhr = new XMLHttpRequest()
		xhr.open('POST', url)
		xhr.withCredentials = true
		Object.entries(nonceHeader()).forEach(([name, value]) => xhr.setRequestHeader(name, value))
		xhr.setRequestHeader('Content-Type', file.type)
		xhr.setRequestHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`)
		xhr.upload.addEventListener('progress', event => event.lengthComputable && onProgress(event.loaded / event.total))
		xhr.addEventListener('load', () => {
			const body = JSON.parse(xhr.responseText || 'null')
			if (xhr.status >= 200 && xhr.status < 300 && body?.id) {
				resolve(body)
			} else {
				reject(new Error(body?.message || 'The image couldn’t be uploaded.'))
			}
		})
		xhr.addEventListener('error', () => reject(new Error('Couldn’t reach the site. Check your connection and try again.')))
		xhr.send(file)
	})
}
