/**
 * Fallback-path verification.
 *
 * The three states that are easy to claim and hard to prove:
 *   1. prefers-reduced-motion: reduce — no Lenis, no pinning, no loops, but
 *      every message and action still present.
 *   2. ?static=1 — the same composition, forced, as a QA entry point.
 *   3. no WebGL — the permanent poster must carry the frame on its own.
 *
 * Run:  node scripts/fallback-qa.mjs [baseUrl]
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
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

/** Everything a visitor must still be able to reach without the renderer. */
const CONTENT_PROBE = () => {
  const visible = (el) => {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05
  }
  return {
    h1: document.querySelectorAll('h1').length,
    h1Text: (document.querySelector('h1')?.textContent || '').trim().slice(0, 40),
    links: [...document.querySelectorAll('a[href]')].filter(visible).length,
    buttons: [...document.querySelectorAll('button')].filter(visible).length,
    images: [...document.querySelectorAll('img')].filter(visible).length,
    paragraphs: [...document.querySelectorAll('p')].filter(visible).length,
    canvases: document.querySelectorAll('canvas').length,
    lenisClass: document.documentElement.className,
    bodyOverflow: getComputedStyle(document.body).overflow,
    posterVisible: (() => {
      const p = document.querySelector('.hero__poster, .case__poster, .lab__poster')
      return p ? Number(getComputedStyle(p).opacity) : null
    })(),
    animationsRunning: [...document.querySelectorAll('*')].filter((el) => {
      const cs = getComputedStyle(el)
      return (
        cs.animationName !== 'none' &&
        cs.animationPlayState === 'running' &&
        parseFloat(cs.animationDuration) > 0.05
      )
    }).length,
    docHeight: document.documentElement.scrollHeight,
  }
}

const SCENARIOS = [
  { name: 'reduced-motion', url: `${BASE}/`, emulate: ['--force-prefers-reduced-motion'] },
  { name: 'static-query', url: `${BASE}/?static=1` },
  { name: 'no-webgl', url: `${BASE}/`, blockWebgl: true },
  { name: 'no-webgl-lab', url: `${BASE}/lab`, blockWebgl: true },
  { name: 'no-webgl-case', url: `${BASE}/work/agent-x`, blockWebgl: true },
  { name: 'no-webgl-mobile', url: `${BASE}/`, blockWebgl: true, mobile: true },
]

async function run() {
  mkdirSync(OUT, { recursive: true })
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: 'shell',
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
  })

  const results = []
  for (const s of SCENARIOS) {
    const page = await browser.newPage()
    await page.setViewport(
      s.mobile
        ? { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
        : { width: 1440, height: 900, deviceScaleFactor: 1 },
    )
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))

    if (s.emulate) await page.emulateMediaFeatures(s.emulate.map((v) => ({ name: v.replace('--force-', ''), value: 'reduce' })))
    if (s.blockWebgl) {
      // Remove the renderer the way a locked-down device would: no context.
      await page.evaluateOnNewDocument(() => {
        const orig = HTMLCanvasElement.prototype.getContext
        HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
          if (String(type).includes('webgl')) return null
          return orig.call(this, type, ...rest)
        }
      })
    }

    await page.goto(s.url, { waitUntil: 'networkidle0', timeout: 45000 })
    await new Promise((r) => setTimeout(r, 2600))
    const probe = await page.evaluate(CONTENT_PROBE)
    const shot = `${OUT}/fallback-${s.name}.png`
    await page.screenshot({ path: shot })

    const issues = []
    if (!probe.h1) issues.push('no h1')
    if (probe.links < 4) issues.push(`only ${probe.links} links`)
    if (probe.paragraphs < 3) issues.push(`only ${probe.paragraphs} paragraphs`)
    if (errors.length) issues.push(`${errors.length} error(s)`)
    if (s.name.startsWith('no-webgl') && probe.canvases > 0) issues.push('canvas mounted without webgl')
    if (s.name === 'reduced-motion' && probe.animationsRunning > 1) issues.push(`${probe.animationsRunning} animations running`)
    if (s.name.startsWith('no-webgl') && probe.posterVisible !== null && probe.posterVisible < 0.2)
      issues.push(`poster opacity ${probe.posterVisible}`)

    results.push({ scenario: s.name, ...probe, errors, shot, issues })
    console.log(
      `${issues.length ? 'FAIL' : ' ok '} ${s.name.padEnd(18)} h1=${probe.h1} links=${probe.links} p=${probe.paragraphs} imgs=${probe.images} canvas=${probe.canvases} anim=${probe.animationsRunning} poster=${probe.posterVisible} h=${probe.docHeight}px`,
    )
    await page.close()
  }

  await browser.close()
  writeFileSync(`${OUT}/fallback.json`, JSON.stringify(results, null, 2))
  const bad = results.filter((r) => r.issues.length).length
  console.log(`\n${results.length - bad}/${results.length} fallback states healthy`)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
