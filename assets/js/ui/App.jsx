import { mediaOpen } from '../state/signals'
import { BlockControls } from './components/BlockControls'
import { BlockPicker } from './components/BlockPicker'
import { BottomBar } from './components/BottomBar'
import { DevicePreview } from './components/DevicePreview'
import { DragLayer, DropLine } from './components/DragLayer'
import { DraftsToast } from './components/DraftsToast'
import { PresenceNotice } from './components/PresenceNotice'
import { FieldLabel } from './components/FieldLabel'
import { FocusEditor } from './components/FocusEditor'
import { ImageDrop } from './components/ImageDrop'
import { ImageTools } from './components/ImageTools'
import { FormatBar } from './components/FormatBar'
import { LinkFieldEditor } from './components/LinkFieldEditor'
import { LockedTip } from './components/LockedTip'
import { NewPageDialog } from './components/NewPageDialog'
import { OutlinePanel } from './components/outline/OutlinePanel'
import { SettingsPanel } from './components/settings/SettingsPanel'
import { ShortcutsSheet } from './components/ShortcutsSheet'
import { Tooltip } from './components/Tooltip'
import { UndoToast } from './components/UndoToast'

/**
 * The editor's UI attached to things on the page, on the layer that scrolls with it (see main.jsx).
 * Later components sit on top of earlier ones, and all of them under the screen's.
 */
export function PageLayer() {
	// The media library takes over the screen, so everything steps aside.
	if (mediaOpen.value) {
		return null
	}
	return (
		<>
			<FieldLabel />
			<BlockControls />
			<ImageDrop />
			<FocusEditor />
			<DropLine />
		</>
	)
}

/**
 * The editor's UI over the screen: bars, panels and dialogs.
 */
export function ScreenLayer() {
	if (mediaOpen.value) {
		return null
	}
	return (
		<>
			<ImageTools />
			<LockedTip />
			<OutlinePanel />
			<SettingsPanel />
			<FormatBar />
			<LinkFieldEditor />
			<PresenceNotice />
			<DraftsToast />
			<UndoToast />
			<BottomBar />
			<DragLayer />
			<BlockPicker />
			<DevicePreview />
			<NewPageDialog />
			<ShortcutsSheet />
			<Tooltip />
		</>
	)
}
