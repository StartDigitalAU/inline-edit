import { Choice } from './Choice'
import { ColorInput } from './ColorInput'
import { LinkInput } from './LinkInput'
import { NumberInput } from './NumberInput'
import { TextInput } from './TextInput'
import { Toggle } from './Toggle'

const CONTROLS = {
	select: Choice,
	radio: Choice,
	button_group: Choice,
	number: NumberInput,
	range: NumberInput,
	url: TextInput,
	email: TextInput,
	link: LinkInput,
	color_picker: ColorInput,
}

/**
 * One setting: its label, help text, and the control for its type.
 */
export function SettingField({ setting, onChange }) {
	if (setting.type === 'true_false') {
		return (
			<label class="flex items-center justify-between gap-4 py-1">
				<SettingLabel setting={setting} />
				<Toggle label={setting.label} checked={!!setting.value} onChange={onChange} />
			</label>
		)
	}

	const Control = CONTROLS[setting.type]
	return (
		<div class="flex flex-col gap-2">
			<SettingLabel setting={setting} />
			{Control && <Control setting={setting} onChange={onChange} />}
		</div>
	)
}

function SettingLabel({ setting }) {
	return (
		<span class="flex min-w-0 flex-col gap-0.5">
			<span class="flex items-center gap-1.5 text-[13px] font-medium">
				{setting.label}
				{setting.dirty && <span class="size-1.5 rounded-full bg-amber" title="Not saved yet" />}
			</span>
			{setting.instructions && <span class="text-xs leading-4 text-muted">{setting.instructions}</span>}
		</span>
	)
}
