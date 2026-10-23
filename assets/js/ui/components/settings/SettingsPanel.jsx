import { useEffect, useRef, useState } from 'preact/hooks'
import { regions, settingsOf } from '../../../model/page'
import { changeSetting, loadSettings } from '../../../services/settings'
import { editing, revision, settingsFocus, settingsFor } from '../../../state/signals'
import { clamp, useFloating } from '../../hooks/useFloating'
import { Button } from '../Button'
import { Icon } from '../Icon'
import { SettingField } from './SettingField'

const INSET = 10
const TOOLBAR_SPACE = 44

/**
 * A block's settings, under its toolbar. Changes show on the page straight away and are saved with
 * everything else.
 */
export function SettingsPanel() {
	const target = settingsFor.value
	if (!target || !editing.value || !target.row.isConnected) {
		return null
	}
	return <Panel {...target} />
}

function Panel({ list, row }) {
	revision.value
	// A link already editable on the page (a button) is edited there, not here too.
	const onPage = new Set(regions.filter(region => region.isConnected && region.kind === 'link').map(region => region.field))
	const settings = settingsOf(row).filter(setting => !onPage.has(setting.field))
	const [state, setState] = useState(settings.length ? 'ready' : 'loading')

	// Bring a setting into view (a gallery clicked on the page), once the settings are there.
	const body = useRef(null)
	useEffect(() => {
		const name = settingsFocus.value
		const target = name && state === 'ready' && body.current?.querySelector(`[data-setting="${CSS.escape(name)}"]`)
		if (target) {
			target.scrollIntoView({ block: 'nearest' })
			settingsFocus.value = ''
		}
	})

	useEffect(() => {
		if (state === 'loading') {
			loadSettings(list, row).then(
				() => setState('ready'),
				() => setState('failed')
			)
		}
	}, [list])

	const ref = useFloating(({ width, height }) => {
		const rect = row.getBoundingClientRect()
		const top = Math.max(rect.top + INSET, INSET) + TOOLBAR_SPACE
		return {
			left: clamp(rect.right - width - INSET, INSET, window.innerWidth - width - INSET),
			top: Math.min(top, window.innerHeight - height - 90),
		}
	})

	return (
		<div
			ref={ref}
			class="floating flex max-h-[min(520px,calc(100vh-160px))] w-[300px] origin-top-right animate-pop flex-col rounded-xl"
			role="dialog"
			aria-label={`${list.rowLabel(row)} settings`}
		>
			<div class="flex h-11 shrink-0 items-center justify-between border-b border-edge pl-3.5 pr-1.5">
				<span class="truncate font-medium">{list.rowLabel(row)}</span>
				<Button variant="ghost" size="icon-sm" aria-label="Close settings" tip="Close" onClick={() => (settingsFor.value = null)}>
					<Icon name="close" />
				</Button>
			</div>
			<div ref={body} class="flex min-h-0 flex-col gap-5 overflow-y-auto overscroll-contain p-3.5">
				{state === 'loading' && <Loading />}
				{state === 'failed' && <p class="text-[13px] text-danger-text">The settings couldn’t load. Try again.</p>}
				{state === 'ready' && !settings.length && <p class="text-[13px] text-subtle">This block has no settings.</p>}
				{sections(settings).map(({ title, settings: inSection }) => (
					<section key={title} class="flex flex-col gap-4">
						{title && <h3 class="-mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</h3>}
						{inSection.map(setting => (
							<SettingField
								key={setting.name}
								setting={setting}
								list={list}
								row={row}
								onChange={value => changeSetting(list, setting, value)}
							/>
						))}
					</section>
				))}
			</div>
		</div>
	)
}

/**
 * Settings under their headings (the layout's tabs and groups), in order.
 */
function sections(settings) {
	const found = []
	for (const setting of settings) {
		if (found.at(-1)?.title !== setting.section) {
			found.push({ title: setting.section, settings: [] })
		}
		found.at(-1).settings.push(setting)
	}
	return found
}

function Loading() {
	return (
		<div class="flex flex-col gap-3" aria-label="Loading settings">
			{[0, 1, 2].map(i => (
				<div key={i} class="h-8 animate-pulse rounded-md bg-raised" />
			))}
		</div>
	)
}
