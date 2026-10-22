const BASE =
	'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40'

const VARIANTS = {
	primary: 'bg-fg text-canvas enabled:hover:bg-[#cccccc]',
	secondary: 'shadow-[inset_0_0_0_1px_theme(colors.line)] enabled:hover:bg-hover',
	ghost: 'text-subtle enabled:hover:bg-hover enabled:hover:text-fg aria-expanded:bg-hover aria-expanded:text-fg',
	plain: 'enabled:hover:bg-hover',
	danger: 'text-subtle enabled:hover:bg-danger enabled:hover:text-white',
}

const SIZES = {
	md: 'h-8 rounded-lg px-3',
	sm: 'h-7 rounded-md px-2.5 text-[13px]',
	icon: 'size-8 rounded-lg',
	'icon-sm': 'size-7 rounded-[7px]',
}

/**
 * A button in the editor's style. `tip` (and `keys`) show a tooltip on hover (see Tooltip), and
 * `buttonRef` gets the <button> element.
 */
export function Button({ variant = 'plain', size = 'md', tip, keys, buttonRef, class: className = '', children, ...props }) {
	return (
		<button
			ref={buttonRef}
			type="button"
			class={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
			data-tip={tip}
			data-keys={keys?.join(' ')}
			{...props}
		>
			{children}
		</button>
	)
}
