/**
 * An on/off switch, for a true/false field.
 */
export function Toggle({ label, checked, onChange }) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked ? 'true' : 'false'}
			aria-label={label}
			class={`relative h-[18px] w-8 shrink-0 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-line hover:bg-muted/60'}`}
			onClick={() => onChange(!checked)}
		>
			<span
				class={`absolute left-0.5 top-0.5 size-3.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-3.5' : ''}`}
			/>
		</button>
	)
}
