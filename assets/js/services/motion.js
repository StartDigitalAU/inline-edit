/**
 * Animating changes to blocks with the View Transitions API: rows slide to their new places, new ones
 * fade in and removed ones fade out. Browsers without it (or with reduced motion on) just change.
 */

const names = new WeakMap()
let lastName = 0

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Run `change` (which changes the page), animating `rows` and any `added()` rows from where they
 * were to where they end up.
 */
export async function animate(change, { rows = [], added = () => [] } = {}) {
	if (!document.startViewTransition || reducedMotion()) {
		await change()
		return
	}

	const named = new Set(rows)
	named.forEach(name)
	const transition = document.startViewTransition(async () => {
		await change()
		added().forEach(row => {
			named.add(row)
			name(row)
		})
	})

	try {
		await transition.finished
	} finally {
		named.forEach(row => (row.style.viewTransitionName = ''))
	}
}

/** Each row needs its own name for the browser to track it across the change. */
function name(row) {
	if (!names.has(row)) {
		names.set(row, `sd-row-${++lastName}`)
	}
	row.style.viewTransitionName = names.get(row)
}
