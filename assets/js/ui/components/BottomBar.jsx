import { useRef } from 'preact/hooks'
import { config, MOD } from '../../config'
import { pending } from '../../services/changes'
import { discardChanges, toggleEditing } from '../../services/editing'
import { history, redo, undo } from '../../services/history'
import { isDraft, publish } from '../../services/publishing'
import { save } from '../../services/saving'
import { toggleOutline } from '../../services/outline'
import { busy, editing, menuOpen, outlineOpen, picker, saving } from '../../state/signals'
import { pageList } from '../pageList'
import { Button } from './Button'
import { Icon } from './Icon'
import { Kbd } from './Kbd'
import { openDevicePreview } from './DevicePreview'
import { PageMenu } from './PageMenu'
import { Separator } from './Separator'
import { Status } from './Status'

const BAR =
	'pointer-events-auto absolute bottom-5 left-1/2 flex max-w-[calc(100vw-32px)] -translate-x-1/2 animate-rise items-center gap-1 rounded-[14px] bg-canvas p-1.5 shadow-float max-sm:bottom-3'

/**
 * The bar at the bottom of the page: "Edit page" until editing starts, then status, Add block,
 * Discard, Save, the page menu and Done.
 */
export function BottomBar() {
	const menuButton = useRef(null)
	return (
		<>
			<div class={BAR}>{editing.value ? <EditingActions menuButton={menuButton} /> : <StartButton />}</div>
			{/* Outside the bar: its centring transform would make it the menu's frame of reference. */}
			{editing.value && menuOpen.value && <PageMenu anchor={menuButton} />}
		</>
	)
}

function StartButton() {
	return (
		<Button class="gap-2 pl-3 pr-2" onClick={toggleEditing}>
			<Icon name="edit" />
			<span>Edit page</span>
			<span class="max-sm:hidden">
				<Kbd keys={['E']} />
			</span>
		</Button>
	)
}

function UndoRedo({ disabled }) {
	const { undo: undoLabel, redo: redoLabel } = history.value
	return (
		<div class="flex items-center max-sm:hidden">
			<Button variant="ghost" size="icon" tip={undoLabel ? `Undo ${undoLabel.toLowerCase()}` : 'Undo'} keys={[MOD, 'Z']} disabled={disabled || !undoLabel} onClick={undo} aria-label="Undo">
				<Icon name="undo" />
			</Button>
			<Button variant="ghost" size="icon" tip={redoLabel ? `Redo ${redoLabel.toLowerCase()}` : 'Redo'} keys={[MOD, '⇧', 'Z']} disabled={disabled || !redoLabel} onClick={redo} aria-label="Redo">
				<Icon name="redo" />
			</Button>
		</div>
	)
}

function EditingActions({ menuButton }) {
	const { count } = pending.value
	const locked = saving.value || !!busy.value
	const list = pageList()
	const draft = isDraft()

	return (
		<div class="flex min-w-0 items-center gap-1 max-sm:flex-1" role="toolbar" aria-label="Page editing">
			{draft && (
				<span class="ml-1 shrink-0 rounded-md bg-amber/15 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber">
					Draft
				</span>
			)}
			<div class="min-w-0 max-sm:flex-1">
				<Status />
			</div>
			<UndoRedo disabled={locked} />
			<Separator />
			{list && (
				<>
					<Button
						variant="secondary"
						class="pl-2.5 max-sm:w-8 max-sm:px-0"
						disabled={locked || !list.canAdd()}
						onClick={() => (picker.value = { list, index: list.rows().length })}
					>
						<Icon name="plus" />
						<span class="max-sm:hidden">Add block</span>
					</Button>
					<Separator />
				</>
			)}
			<Button variant="secondary" disabled={locked || !count} onClick={discardChanges}>
				Discard
			</Button>
			<Button
				variant={draft ? 'secondary' : 'primary'}
				disabled={locked || !count}
				onClick={save}
				tip={draft ? 'Save the draft' : 'Save changes'}
				keys={[MOD, 'S']}
			>
				{draft ? 'Save draft' : 'Save'}
			</Button>
			{draft && config.page.canPublish && (
				<Button variant="primary" disabled={locked} onClick={publish} tip="Publish this page, with any unsaved changes">
					Publish
				</Button>
			)}
			<Separator />
			{list && (
				<Button
					variant="ghost"
					size="icon"
					aria-label="Blocks"
					aria-expanded={outlineOpen.value ? 'true' : 'false'}
					tip="Blocks"
					keys={['B']}
					onClick={() => toggleOutline()}
				>
					<Icon name="blocks" />
				</Button>
			)}
			<Button variant="ghost" size="icon" aria-label="Preview on a phone or tablet" tip="Preview on a phone or tablet" onClick={() => openDevicePreview()}>
				<Icon name="phone" />
			</Button>
			<Button
				buttonRef={menuButton}
				variant="ghost"
				size="icon"
				aria-label="More"
				aria-haspopup="menu"
				aria-expanded={menuOpen.value ? 'true' : 'false'}
				tip="More"
				onClick={() => (menuOpen.value = !menuOpen.value)}
			>
				<Icon name="more" />
			</Button>
			<Button variant="secondary" onClick={toggleEditing} tip="Stop editing" keys={['E']}>
				Done
			</Button>
		</div>
	)
}
