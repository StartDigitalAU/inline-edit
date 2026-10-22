/**
 * A message above the bottom bar, with actions.
 */
export function Toast({ label, children }) {
	return (
		<div
			class="pointer-events-auto absolute bottom-[84px] left-1/2 flex -translate-x-1/2 animate-rise items-center gap-2 whitespace-nowrap rounded-xl bg-canvas py-1.5 pl-3.5 pr-1.5 shadow-float max-sm:bottom-16"
			role="alertdialog"
			aria-label={label}
		>
			{children}
		</div>
	)
}
