import { Button } from './Button'

/**
 * A formatting button that shows whether its format is applied.
 */
export function ToolButton({ active = false, children, ...props }) {
	return (
		<Button
			size="icon-sm"
			class={active ? 'bg-hover text-fg' : 'text-subtle hover:text-fg'}
			aria-pressed={active ? 'true' : 'false'}
			{...props}
		>
			{children}
		</Button>
	)
}
