/**
 * Boot-gate lifetime probe.
 *
 * A full-viewport overlay that stays in the DOM after it reports "ready" is an
 * invisible click-blocker: the page looks finished, every button is dead.
 * This measures mount time, unmount time, and hit-testability over time.
 *
 * Run:  node scripts/boot-probe.mjs [baseUrl]
 */
import { existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import puppeteer from 'puppeteer-core'

const BASE = process.argv[2] ?? 'http://localhost:4173'
const OUT = resolve('qa')

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  const roots = [
    `${process.env.LOCALAPPDATA ?? ''}/hermes/tools/chromium-1208/chrome-win64/chrome.exe`,
    `${process.env.USERPROFILE ?? ''}/.cache/puppeteer/chrome/win64-154.0.8037.57/chrome-win64/chrome.exe`,
  ]
  const found = roots.find((p) => p && existsSync(p))
  if (!found) throw new Error('No Chrome found. Set CHROME_PATH.')
  return found
}

const SAMPLE = () => {
  // Only the real overlay counts. A previous version of this probe fell back to
  // "any div mentioning ready/loading", which matches ordinary page copy and
  // reported a false never-unmounts on /contact.
  const el = document.querySelector('.boot')
  if (!el) return { present: false }
  const cs = getComputedStyle(el)
  const r = el.getBoundingClientRect()
  // What actually receives a click at the visual centre of a primary button?
  const btn = document.querySelector('.filters__btn, .navlink, .btn')
  let hitTest = null
  if (btn) {
    const b = btn.getBoundingClientRect()
    const top = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)
    hitTest = {
      button: (btn.textContent || '').trim().slice(0, 14),
      hit: top ? `${top.tagName.toLowerCase()}.${(top.className || '').toString().split(' ')[0]}` : 'null',
      reachesButton: !!(top && (top === btn || btn.contains(top))),
    }
  }
  return {
    present: true,
    cls: (el.className || '').toString().slice(0, 60),
    opacity: cs.opacity,
    pointerEvents: cs.pointerEvents,
    covers: r.width >= innerWidth * 0.9 && r.height >= innerHeight * 0.9,
    status: (el.querySelector('[class*="status"], p, span')?.textContent || '').trim().slice(0, 20),
    hitTest,
  }
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: 'shell',
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
  })
  const report = []

  for (const path of ['/', '/work', '/contact']) {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })
    const samples = []
    const t0 = Date.now()
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' })
    // Sample from navigation start; 60 samples ≈ 6s of coverage.
    for (let i = 0; i < 60; i++) {
      const s = await page.evaluate(SAMPLE).catch(() => ({ present: false }))
      samples.push({ t: Date.now() - t0, ...s })
      if (!s.present && i > 4) break
      await new Promise((r) => setTimeout(r, 100))
    }
    const blocking = samples.filter((s) => s.present && s.covers && s.hitTest && !s.hitTest.reachesButton)
    const afterReady = samples.filter((s) => s.present && s.status === 'ready' && s.covers)
    const lastBlocking = blocking.length ? blocking[blocking.length - 1].t : 0
    const unmounted = samples.find((s) => !s.present)?.t ?? null
    const issues = []
    if (lastBlocking > 4500) issues.push(`blocked clicks for ${lastBlocking}ms after "ready"`)
    if (afterReady.length > 3) issues.push(`"ready" but still covering viewport for ${afterReady.length} samples`)
    if (unmounted === null) issues.push('overlay never removed')
    report.push({ path, samples, issues, unmounted, lastBlocking })
    console.log(
      `${issues.length ? 'FAIL' : ' ok '} ${path.padEnd(10)} unmount@${String(unmounted).padStart(5)}ms  blocked=${String(lastBlocking).padStart(5)}ms  readyButCovering=${afterReady.length}`,
    )
    for (const b of blocking.slice(-2))
      console.log(`        t=${b.t}ms status="${b.status}" hit=${b.hitTest?.hit} (wanted ${b.hitTest?.button})`)
    await page.close()
  }

  await browser.close()
  writeFileSync(`${OUT}/boot.json`, JSON.stringify(report, null, 2))
  const bad = report.filter((r) => r.issues.length).length
  console.log(`\n${report.length - bad}/${report.length} routes have a non-blocking boot`)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
