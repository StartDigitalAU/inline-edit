/**
 * Reading and updating a link field's <a>: its text, where it goes, and whether it opens in a new tab.
 * A link field's value is { url, title, target }, or null for no link.
 */

export function linkState(a) {
	return {
		html: a.innerHTML,
		href: a.getAttribute('href'),
		target: a.getAttribute('target'),
		rel: a.getAttribute('rel'),
	}
}

export function restoreLink(a, { html, href, target, rel }) {
	a.innerHTML = html
	setAttribute(a, 'href', href)
	setAttribute(a, 'target', target)
	setAttribute(a, 'rel', rel)
}

export function showLink(a, link) {
	a.textContent = link?.title || link?.url || ''
	a.setAttribute('href', link?.url || '#')
	setAttribute(a, 'target', link?.target === '_blank' ? '_blank' : null)
	setAttribute(a, 'rel', link?.target === '_blank' ? 'noopener' : null)
}

/** A link value from what's stored or sent (an object, JSON, or nothing). */
export function parseLink(value) {
	if (typeof value === 'string') {
		try {
			value = value ? JSON.parse(value) : null
		} catch {
			value = null
		}
	}
	// Text without a URL yet is kept while the link is being filled in (it saves once it has one).
	return value?.url || value?.title
		? { url: value.url || '', title: value.title || '', target: value.target === '_blank' ? '_blank' : '' }
		: null
}

/** A link value as it's sent to the server, and compared for changes. */
export function serializeLink(link) {
	return link?.url ? JSON.stringify({ url: link.url, title: link.title || '', target: link.target || '' }) : ''
}

function setAttribute(el, name, value) {
	if (value === null || value === undefined) {
		el.removeAttribute(name)
	} else {
		el.setAttribute(name, value)
	}
}
