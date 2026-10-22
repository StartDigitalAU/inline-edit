const TEXT_TYPES = ['text', 'textarea', 'wysiwyg']

const lines = (x, width) => `<path d="M${x} 10h${width}M${x} 15.5h${width}M${x} 21h${Math.round(width * 0.6)}"/>`

const SKETCHES = {
	text: lines(9, 30),
	columns: `${lines(6, 16)}${lines(26, 16)}`,
	textImage: `${lines(6, 15)}<rect x="26" y="7" width="16" height="18" rx="2"/>`,
	image: '<rect x="6" y="6" width="36" height="20" rx="2"/><path d="m6 22 10-7 7 5 6-4 13 8"/>',
	cards: [5, 19, 33].map(x => `<rect x="${x}" y="8" width="10" height="16" rx="1.5"/>`).join(''),
}

/**
 * A small sketch of a block layout, guessed from the kinds of fields it has.
 */
export function LayoutGlyph({ fields, class: className = 'h-8 w-12' }) {
	return (
		<svg
			class={className}
			viewBox="0 0 48 32"
			aria-hidden="true"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			dangerouslySetInnerHTML={{ __html: SKETCHES[sketchFor(fields.map(field => field.type))] }}
		/>
	)
}

function sketchFor(types) {
	if (types.includes('repeater') || types.includes('flexible_content')) {
		return 'cards'
	}
	const hasText = types.some(type => TEXT_TYPES.includes(type))
	if (types.includes('image')) {
		return hasText ? 'textImage' : 'image'
	}
	return types.filter(type => type === 'wysiwyg').length > 1 ? 'columns' : 'text'
}
