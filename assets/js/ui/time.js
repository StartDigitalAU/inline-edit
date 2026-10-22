const UNITS = [
	['year', 31536000],
	['month', 2592000],
	['day', 86400],
	['hour', 3600],
	['minute', 60],
]

/** "5 minutes ago", "yesterday", "just now". */
export function timeAgo(date) {
	const seconds = Math.round((Date.parse(date) - Date.now()) / 1000)
	if (Number.isNaN(seconds)) {
		return 'earlier'
	}
	const [unit, size] = UNITS.find(([, size]) => Math.abs(seconds) >= size) || []
	return unit ? new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(Math.round(seconds / size), unit) : 'just now'
}
