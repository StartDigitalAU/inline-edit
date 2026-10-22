/**
 * Reading and updating an image field's <img>.
 */

export function imageState(img) {
	return {
		src: img.getAttribute('src') || '',
		alt: img.getAttribute('alt') || '',
		position: img.style.objectPosition,
	}
}

export function applyImage(img, { src, alt, position }) {
	if (src && isHttpUrl(src)) {
		img.setAttribute('src', src)
		// A srcset would keep showing the old image.
		img.removeAttribute('srcset')
	}
	img.setAttribute('alt', alt || '')
	if (position !== undefined) {
		img.style.objectPosition = position
	}
}

export function isHttpUrl(value) {
	try {
		return ['http:', 'https:'].includes(new URL(value, location.href).protocol)
	} catch {
		return false
	}
}
