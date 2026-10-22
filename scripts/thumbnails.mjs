/**
 * Make block picker thumbnails: screenshot every block on a page and save one picture per layout.
 *
 *   npm run thumbnails -- <page url> <theme folder>
 *
 * Make a page with one of each block first (it doesn't need to be published if you pass a preview
 * link). Each block is found by its `data-block` attribute (see partials/block.twig) and saved as
 * `<theme folder>/thumbnails/<layout>.jpg`. Set CHROME to Chrome's path if it isn't in the usual
 * place.
 */
import { chromium } from 'playwright-core'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const [url, theme] = process.argv.slice(2)
if (!url || !theme) {
	console.error('Usage: npm run thumbnails -- <page url> <theme folder>')
	process.exit(1)
}

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const WIDTH = 1024
const THUMBNAIL_WIDTH = 720

const out = path.join(theme, 'thumbnails')
fs.mkdirSync(out, { recursive: true })

const browser = await chromium.launch({ executablePath: CHROME })
const page = await browser.newPage({ viewport: { width: WIDTH, height: 900 } })
await page.goto(url, { waitUntil: 'networkidle' })

// Fixed and sticky things (headers, cookie notices) would sit on top of the blocks.
await page.evaluate(() => {
	for (const el of document.querySelectorAll('body *')) {
		const { position } = getComputedStyle(el)
		if ((position === 'fixed' || position === 'sticky') && !el.closest('[data-block]')) {
			el.style.visibility = 'hidden'
		}
	}
})

const blocks = await page.locator('[data-block]').all()
const done = new Set()
for (const block of blocks) {
	const layout = await block.getAttribute('data-block')
	if (done.has(layout)) {
		continue
	}
	done.add(layout)
	await block.scrollIntoViewIfNeeded()
	const file = path.join(out, `${layout}.png`)
	await block.screenshot({ path: file })
	// A smaller JPEG is plenty for a picker tile (sips ships with macOS).
	const jpg = file.replace(/\.png$/, '.jpg')
	execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '78', '-Z', String(THUMBNAIL_WIDTH), file, '--out', jpg], {
		stdio: 'ignore',
	})
	fs.rmSync(file)
	console.log(`${layout} → ${path.relative(process.cwd(), jpg)}`)
}

await browser.close()
