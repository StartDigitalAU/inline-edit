import { INPUT } from './styles'

/**
 * A URL or email address, saved to the page when you leave the field or press Enter.
 */
export function TextInput({ setting, onChange }) {
	return (
		<input
			type={setting.type === 'email' ? 'email' : 'url'}
			class={INPUT}
			aria-label={setting.label}
			placeholder={setting.placeholder || (setting.type === 'email' ? 'name@example.com' : 'https://')}
			value={setting.value || ''}
			onChange={event => onChange(event.currentTarget.value.trim())}
		/>
	)
}
