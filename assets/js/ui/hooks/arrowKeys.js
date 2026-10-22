/**
 * Move focus through a menu's items with the up and down arrows, wrapping around.
 */
export function onArrowKeys(event, itemSelector) {
	if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
		return
	}
	event.preventDefault()
	const menu = event.currentTarget
	const items = [...menu.querySelectorAll(itemSelector)].filter(item => !item.disabled && !item.hidden)
	const current = items.indexOf(menu.getRootNode().activeElement)
	const step = event.key === 'ArrowDown' ? 1 : -1
	items[(current + step + items.length) % items.length]?.focus()
}
