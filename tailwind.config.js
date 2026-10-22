/**
 * The editor's UI styles: Vercel's dark palette and Geist. Built into dist/editor.css, which loads
 * inside the editor's shadow root, so none of it reaches the page (and the page's styles don't
 * reach the editor).
 */
module.exports = {
	content: ['./assets/js/**/*.{js,jsx}'],
	theme: {
		colors: {
			transparent: 'transparent',
			current: 'currentColor',
			white: '#ffffff',
			black: '#000000',
			canvas: '#0a0a0a',
			surface: '#111111',
			raised: '#1a1a1a',
			hover: '#1f1f1f',
			edge: '#292929',
			line: '#2e2e2e',
			muted: '#878787',
			subtle: '#a1a1a1',
			fg: '#ededed',
			accent: { DEFAULT: '#0070f3', light: '#52a8ff' },
			amber: '#ffb224',
			// Vercel's destructive red, and the lighter one it uses for error text on black.
			danger: { DEFAULT: '#e5484d', text: '#ff6166' },
			success: '#62c073',
		},
		fontFamily: {
			sans: ['Geist', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
			mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
		},
		extend: {
			boxShadow: {
				border: '0 0 0 1px rgb(255 255 255 / 0.1)',
				float:
					'0 0 0 1px rgb(255 255 255 / 0.1), 0 1px 1px rgb(0 0 0 / 0.2), 0 8px 16px -4px rgb(0 0 0 / 0.4), 0 24px 32px -8px rgb(0 0 0 / 0.3)',
				focus: '0 0 0 1px #0a0a0a, 0 0 0 3px #52a8ff',
			},
			keyframes: {
				pop: { from: { opacity: '0', scale: '0.97' } },
				fade: { from: { opacity: '0' } },
				rise: { from: { opacity: '0', translate: '0 8px' } },
				pulse: { '50%': { boxShadow: '0 0 0 4px rgb(255 178 36 / 0.12)' } },
			},
			animation: {
				pop: 'pop 0.14s ease-out',
				fade: 'fade 0.15s ease-out',
				rise: 'rise 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
				pulse: 'pulse 2s ease-in-out infinite',
			},
		},
	},
}
