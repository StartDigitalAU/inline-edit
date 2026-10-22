import { config } from '../config'
import { isHttpUrl } from '../model/images'
import { get } from './api'

/**
 * Links in rich text: what's allowed, and finding pages on the site to link to.
 */

const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:']

/**
 * A link as typed, if it's a web, email or phone link or a path on the site; a bare domain gets
 * https://. Returns '' for nothing and null for anything else.
 */
export function safeUrl(value) {
	const url = value.trim()
	if (!url) {
		return ''
	}
	if (/^(\/(?!\/)|#|\?)/.test(url)) {
		return url
	}
	try {
		return SAFE_PROTOCOLS.includes(new URL(url).protocol) ? url : null
	} catch {
		// Not absolute, so maybe a bare domain like example.com.
	}
	return /^[^\s:/?#]+\.[a-z]{2,}([/?#]|$)/i.test(url) ? `https://${url}` : null
}

export function looksLikeUrl(value) {
	return /^(\/|#|\?|[a-z][a-z0-9+.-]*:)/i.test(value) || /^[^\s]+\.[a-z]{2,}(\/|$)/i.test(value)
}

/**
 * Pages, posts and terms whose titles match, from the REST API's search.
 *
 * @returns {Promise<Array<{ title: string, path: string, type: string, href: string }>>}
 */
export async function searchSite(query, signal) {
	const items = await get(searchUrl(query), signal)
	return (Array.isArray(items) ? items : [])
		.filter(item => typeof item?.url === 'string' && isHttpUrl(item.url))
		.map(item => {
			const url = new URL(item.url, location.href)
			return {
				title: decodeTitle(item.title),
				path: url.pathname,
				type: item.subtype || '',
				// Same-site links are stored as paths, so they survive a domain change.
				href: url.origin === location.origin ? `${url.pathname}${url.search}${url.hash}` : item.url,
			}
		})
}

function searchUrl(query) {
	const url = new URL(config.restRoot, location.href)
	// Plain permalinks put the route in ?rest_route= instead of the path.
	if (url.searchParams.has('rest_route')) {
		url.searchParams.set('rest_route', `${url.searchParams.get('rest_route').replace(/\/$/, '')}/wp/v2/search`)
	} else {
		url.pathname = `${url.pathname.replace(/\/$/, '')}/wp/v2/search`
	}
	const params = { search: query, per_page: '6', _fields: 'id,title,url,subtype' }
	Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
	return url
}

function decodeTitle(title) {
	return new DOMParser().parseFromString(String(title || ''), 'text/html').body.textContent || 'Untitled'
}
