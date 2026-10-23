import { useLayoutEffect, useRef, useState } from 'preact/hooks'
import { createPage } from '../../services/publishing'
import { newPageOpen } from '../../state/signals'
import { Button } from './Button'
import { INPUT } from './settings/styles'

/**
 * Starting a new page: give it a title, and it opens as a draft, ready to add blocks to.
 */
export function NewPageDialog() {
	return newPageOpen.value ? <Dialog /> : null
}

function Dialog() {
	const [title, setTitle] = useState('')
	const [creating, setCreating] = useState(false)
	const input = useRef(null)
	useLayoutEffect(() => input.current.focus(), [])

	const close = () => (newPageOpen.value = false)
	const submit = async event => {
		event.preventDefault()
		setCreating(true)
		await createPage(title)
		setCreating(false)
	}

	return (
		<div
			class="pointer-events-auto absolute inset-0 grid animate-fade place-items-center bg-black/40 p-4"
			onClick={event => event.target === event.currentTarget && close()}
		>
			<form
				class="flex w-[min(400px,100%)] animate-pop flex-col gap-4 rounded-2xl bg-canvas p-5 shadow-float"
				role="dialog"
				aria-modal="true"
				aria-labelledby="new-page-title"
				onSubmit={submit}
			>
				<div class="flex flex-col gap-1">
					<h2 id="new-page-title" class="text-base font-semibold">
						New page
					</h2>
					<p class="text-[13px] text-subtle">It starts as a draft. Add blocks, then publish when it’s ready.</p>
				</div>
				<input
					ref={input}
					type="text"
					class={`${INPUT} h-9 text-sm`}
					placeholder="Page title"
					aria-label="Page title"
					value={title}
					onInput={event => setTitle(event.currentTarget.value)}
				/>
				<div class="flex justify-end gap-2">
					<Button variant="secondary" onClick={close}>
						Cancel
					</Button>
					<Button type="submit" variant="primary" disabled={creating}>
						{creating ? 'Creating…' : 'Create page'}
					</Button>
				</div>
			</form>
		</div>
	)
}
