/**
 * Browser features the editor adapts to.
 */

// Plain text fields use contenteditable="plaintext-only" where it's supported, so pasting and
// typing can't add markup.
export const supportsPlaintextOnly = (() => {
	const el = document.createElement('div')
	try {
		el.contentEditable = 'plaintext-only'
	} catch {
		return false
	}
	return el.contentEditable === 'plaintext-only'
})()
