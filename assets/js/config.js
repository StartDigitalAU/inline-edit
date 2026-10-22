/**
 * What the server printed for the editor (see src/Page/Assets.php), and fixed settings.
 */
export const config = window.sdInlineEdit || null

export const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
export const MOD = IS_MAC ? '⌘' : 'Ctrl'
export const ALT = IS_MAC ? '⌥' : 'Alt'

// Paragraph and heading choices for rich text, with their Mod+Alt+number shortcut.
export const BLOCKS = [
	['p', 'Paragraph'],
	['h1', 'Heading 1'],
	['h2', 'Heading 2'],
	['h3', 'Heading 3'],
	['h4', 'Heading 4'],
	['h5', 'Heading 5'],
	['h6', 'Heading 6'],
]

// The site's TinyMCE "Formats", so the admin and front-end editors offer the same styles.
export const STYLE_FORMATS = Array.isArray(config?.styleFormats) ? config.styleFormats : []

// Field types edited in a block's settings panel rather than on the page (see src/Fields/Resolver.php).
export const SETTING_TYPES = Array.isArray(config?.settingTypes) ? config.settingTypes : []

export const LOCKED_REASONS = {
	html: 'This text has formatting that can only be changed in the admin.',
	readonly: 'This field is read-only.',
	media: 'You need permission to upload files to change images.',
}

export const STORAGE = {
	active: 'sdInlineEdit:active',
	drafts: `sdInlineEdit:drafts:${location.pathname}`,
}
