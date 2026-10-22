import { liveLists } from '../model/page'

/**
 * The page's own block list (not one inside a block), which the bottom bar's "Add block" adds to.
 */
export function pageList() {
	const flexible = liveLists().filter(list => list.isFlexible)
	return flexible.find(list => !flexible.some(other => other !== list && other.el.contains(list.el))) || null
}
