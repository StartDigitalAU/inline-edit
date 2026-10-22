import { pageSnapshot } from '../../services/snapshot'
import { devicePreview } from '../../state/signals'
import { Button } from './Button'
import { Icon } from './Icon'
import { Kbd } from './Kbd'

export const DEVICES = {
	phone: { label: 'Phone', width: 390 },
	tablet: { label: 'Tablet', width: 820 },
}

export function openDevicePreview(device = 'phone') {
	devicePreview.value = { device, html: pageSnapshot() }
}

/**
 * The page at a phone's or tablet's width, as it is right now (unsaved changes included).
 */
export function DevicePreview() {
	const preview = devicePreview.value
	if (!preview) {
		return null
	}
	const { width } = DEVICES[preview.device]
	const close = () => (devicePreview.value = null)

	return (
		<div class="pointer-events-auto absolute inset-0 flex animate-fade flex-col items-center gap-4 bg-black/80 px-4 pb-6 pt-4 backdrop-blur-sm">
			<div class="flex items-center gap-2" role="toolbar" aria-label="Preview size">
				<div class="flex rounded-[10px] bg-canvas p-1 shadow-float" role="radiogroup">
					{Object.entries(DEVICES).map(([device, { label, width: size }]) => (
						<button
							key={device}
							type="button"
							role="radio"
							aria-checked={preview.device === device ? 'true' : 'false'}
							class={`flex h-8 items-center gap-2 rounded-md px-3 text-[13px] font-medium transition-colors ${preview.device === device ? 'bg-hover text-fg' : 'text-subtle hover:text-fg'}`}
							onClick={() => (devicePreview.value = { ...preview, device })}
						>
							<Icon name={device} />
							{label}
							<span class="font-mono text-xs text-muted">{size}</span>
						</button>
					))}
				</div>
				<Button variant="secondary" class="bg-canvas shadow-float" onClick={close}>
					Close <Kbd keys={['Esc']} />
				</Button>
			</div>
			<div
				class="min-h-0 flex-1 animate-pop overflow-hidden rounded-[28px] bg-white shadow-[0_0_0_8px_#1a1a1a,0_0_0_9px_rgb(255_255_255/0.12),0_30px_60px_rgb(0_0_0/0.5)] transition-[width] duration-300"
				style={{ width: `${Math.min(width, window.innerWidth - 48)}px` }}
			>
				<iframe class="size-full" title="Preview" srcdoc={preview.html} sandbox="allow-same-origin" />
			</div>
		</div>
	)
}
