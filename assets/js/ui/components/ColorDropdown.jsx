import { TEXT_COLORS } from '../../config'
import { clearColor, setColor } from '../../services/formatting'
import { Dropdown, DropdownHeading } from './Dropdown'

/**
 * Text colour, from the same palette as the admin editor's colour picker, or any colour.
 */
export function ColorDropdown({ current }) {
	return (
		<Dropdown name="color" label={<ColorMark color={current} />} active={!!current} tip="Text colour" class="px-1.5">
			<DropdownHeading>Text colour</DropdownHeading>
			<div class="grid grid-cols-8 gap-1 px-2 pb-2 pt-1" role="group" aria-label="Colours">
				{TEXT_COLORS.map(({ color, name }) => (
					<button
						key={color}
						type="button"
						role="menuitemradio"
						aria-checked={current === color ? 'true' : 'false'}
						aria-label={name || color}
						title={name || color}
						class={`size-6 rounded-md shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)] transition-transform hover:scale-110 focus-visible:scale-110 ${current === color ? 'outline outline-2 outline-offset-1 outline-accent-light' : ''}`}
						style={{ background: color }}
						onClick={() => setColor(color)}
					/>
				))}
			</div>
			<div class="flex items-center gap-1 border-t border-line px-1 pt-1">
				<button
					type="button"
					role="menuitem"
					class="flex h-8 flex-1 items-center gap-2 rounded-md px-2 text-left text-[13px] hover:bg-hover focus-visible:bg-hover focus-visible:shadow-none"
					onClick={clearColor}
				>
					<span class="size-4 rounded-full bg-[linear-gradient(135deg,transparent_45%,theme(colors.danger.DEFAULT)_45%,theme(colors.danger.DEFAULT)_55%,transparent_55%)] shadow-[inset_0_0_0_1px_theme(colors.line)]" />
					Default
				</button>
				<label class="flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-[13px] hover:bg-hover">
					<span class="size-4 rounded-full bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)]" />
					Custom
					<input
						type="color"
						class="sr-only"
						value={current || '#000000'}
						onChange={event => setColor(event.currentTarget.value)}
					/>
				</label>
			</div>
		</Dropdown>
	)
}

/** An "A" underlined with the current colour. */
function ColorMark({ color }) {
	return (
		<span class="flex flex-col items-center leading-none">
			<span class="font-serif text-[15px] font-semibold">A</span>
			<span class="mt-0.5 h-[3px] w-3.5 rounded-full" style={{ background: color || 'currentColor' }} />
		</span>
	)
}
