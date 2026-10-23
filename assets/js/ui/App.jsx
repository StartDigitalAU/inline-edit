import { mediaOpen } from '../state/signals'
import { BlockControls } from './components/BlockControls'
import { BlockPicker } from './components/BlockPicker'
import { BottomBar } from './components/BottomBar'
import { DevicePreview } from './components/DevicePreview'
import { DragLayer } from './components/DragLayer'
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
 * The editor's UI, layered over the page. Later components sit on top of earlier ones.
 */
export function App({ root }) {
	// The media library takes over the screen, so everything steps aside.
	if (mediaOpen.value) {
		return null
	}
	return (
		<>
			<FieldLabel />
			<BlockControls />
			<ImageTools />
			<ImageDrop />
			<FocusEditor />
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
			<Tooltip root={root} />
		</>
	)
}
