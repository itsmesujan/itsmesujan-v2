/**
 * Focus-order probe.
 *
 * Separates the question "is the skip link the first tab stop?" from the
 * headless-Chrome behaviour where tabbing past the last element lands on the
 * browser chrome and reports document.activeElement === body before wrapping.
 * That wrap-through is a property of the driver, not of the page, so this
 * reads the DOM's own tab order instead of counting Tab presses.
 */
import { existsSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const BASE = process.argv[2] ?? 'http://localhost:4180'

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  const roots = [
    `${process.env.LOCALAPPDATA ?? ''}/hermes/tools/chromium-1208/chrome-win64/chrome.exe`,
    `${process.env.USERPROFILE ?? ''}/.cache/puppeteer/chrome/win64-154.0.8037.57/chrome-win64/chrome.exe`,
  ]
  const found = roots.find((p) => p && existsSync(p))
  if (!found) throw new Error('No Chrome found. Set CHROME_PATH to a chrome.exe.')
  return found
}

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: 'shell',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader'],
})

for (const path of ['/', '/work', '/contact']) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle0' })
  await new Promise((r) => setTimeout(r, 1500))

  const order = await page.evaluate(() => {
    const sel = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])'
    return [...document.querySelectorAll(sel)]
      // NOTE: do not filter on offsetParent — it is null for every
      // position:fixed element, which is exactly how the skip link is hidden.
      // Use tabIndex and a real box instead.
      .filter((e) => e.tabIndex >= 0 && e.getClientRects().length > 0)
      .map((e) => ({
        tag: e.tagName.toLowerCase(),
        label: (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30),
        href: e.getAttribute('href') || '',
        position: getComputedStyle(e).position,
      }))
  })

  const first = order[0]
  const skipOk = /skip to content/i.test(first?.label ?? '')
  console.log(`\n${path}`)
  console.log(`  first tab stop: ${first?.tag}:${first?.label}  ${skipOk ? 'OK' : 'PROBLEM'}`)
  console.log(`  total stops: ${order.length}`)
  console.log(`  next 5: ${order.slice(1, 6).map((o) => `${o.tag}:${o.label}`).join(' → ')}`)

  // Also verify a real Tab press from a clean body focus reaches the skip link.
  const viaTab = await page.evaluate(async () => {
    document.body.focus?.()
    if (document.activeElement) document.activeElement.blur()
    return document.activeElement === document.body
  })
  await page.keyboard.press('Tab')
  const landed = await page.evaluate(() => {
    const el = document.activeElement
    if (!el || el === document.body) return 'body'
    return `${el.tagName.toLowerCase()}:${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)}`
  })
  console.log(`  Tab from body: ${viaTab ? '' : '(blur failed) '}${landed}`)

  await page.close()
}

await browser.close()
