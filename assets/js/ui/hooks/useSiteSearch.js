import { useEffect, useState } from 'preact/hooks'
import { looksLikeUrl, searchSite } from '../../services/links'

const DELAY = 180

/**
 * Pages on the site whose titles match what's typed, unless it's already a URL.
 */
export function useSiteSearch(query) {
	const [results, setResults] = useState([])

	useEffect(() => {
		const text = query.trim()
		if (text.length < 2 || looksLikeUrl(text)) {
			setResults([])
			return
		}
		const controller = new AbortController()
		const timer = setTimeout(() => {
			searchSite(text, controller.signal)
				.then(setResults)
				.catch(() => {
					// Aborted by the next keystroke, or offline: typing a URL still works.
				})
		}, DELAY)
		return () => {
			clearTimeout(timer)
			controller.abort()
		}
	}, [query])

	return results
}
