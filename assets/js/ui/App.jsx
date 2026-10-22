import { mediaOpen } from '../state/signals'
import { BlockControls } from './components/BlockControls'
import { BlockPicker } from './components/BlockPicker'
import { BottomBar } from './components/BottomBar'
import { DragLayer } from './components/DragLayer'
import { DraftsToast } from './components/DraftsToast'
import { FieldLabel } from './components/FieldLabel'
import { FormatBar } from './components/FormatBar'
import { LockedTip } from './components/LockedTip'
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
			<LockedTip />
			<SettingsPanel />
			<FormatBar />
			<DraftsToast />
			<UndoToast />
			<BottomBar />
			<DragLayer />
			<BlockPicker />
			<ShortcutsSheet />
			<Tooltip root={root} />
		</>
	)
}
