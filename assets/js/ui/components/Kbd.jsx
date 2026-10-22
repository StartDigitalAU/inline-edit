const TONES = {
	dark: 'h-5 min-w-5 bg-hover text-subtle shadow-[inset_0_0_0_1px_theme(colors.line)]',
	// On a light background, e.g. in a tooltip.
	light: 'h-[18px] min-w-[18px] bg-black/10 text-[#4d4d4d]',
}

/**
 * Keys to press, e.g. <Kbd keys={['⌘', 'S']} />.
 */
export function Kbd({ keys, tone = 'dark' }) {
	return (
		<span class="inline-flex gap-[3px]">
			{keys.map(key => (
				<kbd
					key={key}
					class={`inline-flex items-center justify-center rounded px-[5px] font-mono text-[11px] font-medium leading-none ${TONES[tone]}`}
				>
					{key}
				</kbd>
			))}
		</span>
	)
}
