import { config } from '../config'
import { liveRegions, liveSettings, lists } from '../model/page'
import { rowInfo } from '../model/rows'
import { setStatus } from '../state/status'
import { addRow } from './blocks'
import { isStored } from './previews'

/**
 * Copying a block and pasting it into this page or another (in this browser). What's copied is
 * where the saved block is; pasting reads it from there (see src/Rows/RowSource.php), so it's the
 * saved version that comes across.
 */

const KEY = 'sdInlineEdit:copied'

export function canCopy(list, row) {
	return list.isFlexible && list.original !== null && isStored(list, row)
}

export function copyRow(list, row) {
	if (!canCopy(list, row)) {
		setStatus('error', 'Save this block before copying it.')
		return
	}
	const copy = {
		source: { post: list.post, field: list.original, index: rowInfo(row).origin.from },
		key: list.key,
		layout: rowInfo(row).layout,
		label: list.rowLabel(row),
		from: config.page?.title || '',
	}
	try {
		localStorage.setItem(KEY, JSON.stringify(copy))
	} catch {
		setStatus('error', 'Couldn’t copy the block (this browser is blocking storage).')
		return
	}
	setStatus(
		'saved',
		hasUnsavedChanges(row) ? `Copied ${copy.label} as it’s saved. Save first to include your changes.` : `Copied ${copy.label}`
	)
}

/** The copied block, if it can go in this list. */
export function pasteable(list) {
	let copy = null
	try {
		copy = JSON.parse(localStorage.getItem(KEY) || 'null')
	} catch {
		return null
	}
	return copy && list.isFlexible && copy.key === list.key && list.layout(copy.layout) && list.canAdd() ? copy : null
}

export function pasteRow(list, index) {
	const copy = pasteable(list)
	if (copy) {
		return addRow(list, index, copy.layout, copy)
	}
}

function hasUnsavedChanges(row) {
	return (
		liveRegions().some(region => region.dirty && region.elements.some(el => row.contains(el))) ||
		liveSettings().some(setting => setting.dirty && row.contains(setting.row)) ||
		lists.some(list => list.isConnected && row.contains(list.el) && list.hasChanges())
	)
}
