/**
 * The editor's two layers (see main.jsx): `screen` over the screen, for bars, panels and dialogs, and
 * `page` over the page, scrolling with it, for what's attached to something on the page.
 */
export const layers = { screen: null, page: null }

/** Whether a node is one of the layers' hosts, which events from inside them are retargeted to. */
export function isEditorHost(node) {
	return !!node && Object.values(layers).some(layer => layer?.getRootNode().host === node)
}
