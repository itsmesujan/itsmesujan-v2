/**
 * Visual QA harness.
 *
 * Measures the composited page, not the WebGL drawing buffer: R3F does not set
 * preserveDrawingBuffer, so gl.readPixels() after a frame returns a cleared
 * buffer and would report a false "nothing rendered". Pixel evidence therefore
 * comes from screenshots, which capture the real composited output.
 *
 * Checks per route × viewport: horizontal overflow, runtime errors, text
 * contrast (WCAG AA), tap-target size, image alt text, heading order,
 * landmarks, and visible focus on the primary nav.
 *
 * Run:  CHROME_PATH=... node scripts/visual-qa.mjs [baseUrl]
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import puppeteer from 'puppeteer-core'

const BASE = process.argv[2] ?? 'http://localhost:4173'
const OUT = resolve('qa')

/** Resolves a local Chrome: explicit env first, then the known tool caches. */
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

const ROUTES = [
  { path: '/', name: 'home' },
  { path: '/work', name: 'work' },
  { path: '/work/devpilot', name: 'case-devpilot' },
  { path: '/lab', name: 'lab' },
  { path: '/about', name: 'about' },
  { path: '/contact', name: 'contact' },
  { path: '/nope', name: '404' },
]

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, dsf: 1 },
  { name: 'tablet', width: 834, height: 1112, dsf: 1 },
  { name: 'mobile', width: 390, height: 844, dsf: 2, mobile: true },
]

const AUDIT = () => {
  // WCAG relative luminance, inlined because page.evaluate() serialises the
  // function body and cannot close over Node-scope helpers.
  const lin = (c) => {
    const v = c / 255
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  const ratio = (a, b) => {
    const [l1, l2] = [lum(a), lum(b)]
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
  }
  const rgb = (s) => {
    const m = (s || '').match(/[\d.]+/g)
    return m ? m.slice(0, 3).map(Number) : [0, 0, 0]
  }

  const out = {
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
    offenders: [],
    smallTargets: [],
    contrast: [],
    missingAlt: [],
    headingOrder: [],
    landmarks: {},
  }

  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect()
    if (r.width === 0) continue
    const cs = getComputedStyle(el)
    if (cs.position === 'fixed' || cs.visibility === 'hidden') continue
    if (r.right > window.innerWidth + 1.5 || r.left < -1.5) {
      out.offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: String(el.className?.baseVal ?? el.className ?? '').slice(0, 48),
        left: Math.round(r.left),
        right: Math.round(r.right),
      })
    }
  }
  out.offenders = out.offenders.slice(0, 10)

  for (const el of document.querySelectorAll('a, button, input, textarea, select')) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    if (r.height < 40 || r.width < 24) {
      out.smallTargets.push({
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || '').trim().slice(0, 26),
        w: Math.round(r.width),
        h: Math.round(r.height),
      })
    }
  }
  out.smallTargets = out.smallTargets.slice(0, 10)

  const bgOf = (el) => {
    let node = el
    while (node && node !== document.documentElement) {
      const c = getComputedStyle(node).backgroundColor
      const a = (c || '').match(/[\d.]+/g)
      if (a && (a.length < 4 || Number(a[3]) > 0.6)) return rgb(c)
      node = node.parentElement
    }
    return [7, 8, 10]
  }

  for (const el of document.querySelectorAll(
    'p,a,h1,h2,h3,h4,li,span,dt,dd,label,button,strong,em',
  )) {
    const text = (el.textContent || '').trim()
    if (!text || el.children.length > 0) continue
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || Number(cs.opacity) < 0.15) continue
    const size = parseFloat(cs.fontSize)
    const weight = Number(cs.fontWeight) || 400
    const large = size >= 24 || (size >= 18.66 && weight >= 700)
    const need = large ? 3 : 4.5
    const r2 = ratio(rgb(cs.color), bgOf(el))
    if (r2 < need) {
      out.contrast.push({
        text: text.slice(0, 30),
        color: cs.color,
        size: Math.round(size),
        ratio: +r2.toFixed(2),
        need,
      })
    }
  }
  out.contrast = out.contrast.slice(0, 12)

  for (const img of document.querySelectorAll('img')) {
    if (!img.hasAttribute('alt')) out.missingAlt.push((img.currentSrc || img.src).split('/').pop())
  }

  let last = 0
  for (const h of document.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
    const level = Number(h.tagName[1])
    if (last && level > last + 1) {
      out.headingOrder.push({ from: last, to: level, text: (h.textContent || '').slice(0, 30) })
    }
    last = level
  }

  out.landmarks = {
    main: document.querySelectorAll('main').length,
    footer: document.querySelectorAll('footer').length,
    h1: document.querySelectorAll('h1').length,
    skipLink: Boolean(document.querySelector('.skip-link')),
  }
  return out
}

const REGION_PROBE = (selector) => {
  const el = document.querySelector(selector)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
}

async function run() {
  mkdirSync(OUT, { recursive: true })
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: 'shell',
    args: [
      '--no-sandbox',
      '--enable-unsafe-swiftshader',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--hide-scrollbars',
    ],
  })

  const report = { base: BASE, when: new Date().toISOString(), runs: [] }

  for (const vp of VIEWPORTS) {
    for (const route of ROUTES) {
      const page = await browser.newPage()
      await page.setViewport({
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.dsf,
        isMobile: Boolean(vp.mobile),
        hasTouch: Boolean(vp.mobile),
      })
      const errors = []
      page.on('pageerror', (e) => errors.push(String(e).slice(0, 180)))
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 180)}`)
      })

      await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle0', timeout: 45000 })
      await new Promise((r) => setTimeout(r, 2600))

      const audit = await page.evaluate(AUDIT)

      // The signature moment is not at scrollTop 0 — measure there too.
      await page.evaluate(() => window.scrollTo(0, window.innerHeight * 0.85))
      await new Promise((r) => setTimeout(r, 1500))
      const midScroll = await page.evaluate(() => ({
        y: Math.round(window.scrollY),
        docH: document.documentElement.scrollHeight,
        headlineOpacity: (() => {
          const el = document.querySelector('.hero__line--1, .case__title, .case__summary')
          return el ? Number(getComputedStyle(el).opacity) : null
        })(),
      }))

      const shot = `${OUT}/${route.name}-${vp.name}.png`
      const buf = await page.screenshot({ path: shot })
      const sceneBox = await page.evaluate(
        REGION_PROBE,
        '.hero__scene, .case__scene, .page-head__scene, .lab__canvas-wrap, .contact__scene',
      )

      let focus = null
      if (route.name === 'home') {
        await page.evaluate(() => window.scrollTo(0, 0))
        await new Promise((r) => setTimeout(r, 400))
        await page.keyboard.press('Tab')
        await page.keyboard.press('Tab')
        focus = await page.evaluate(() => {
          const el = document.activeElement
          if (!el || el === document.body) return null
          const cs = getComputedStyle(el)
          return {
            tag: el.tagName.toLowerCase(),
            text: (el.textContent || '').trim().slice(0, 30),
            outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`,
          }
        })
        await page.screenshot({
          path: `${OUT}/focus-${vp.name}.png`,
          clip: { x: 0, y: 0, width: vp.width, height: 160 },
        })
      }

      report.runs.push({
        route: route.path,
        viewport: vp.name,
        ...audit,
        midScroll,
        sceneBox,
        shotBytes: buf.length,
        focus,
        errors,
        shot,
      })
      await page.close()
    }
  }

  await browser.close()
  writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))

  let bad = 0
  for (const r of report.runs) {
    const issues = []
    if (r.overflowX > 0) issues.push(`overflow-x +${r.overflowX} (${r.offenders.length})`)
    if (r.errors.length) issues.push(`error×${r.errors.length}`)
    if (r.contrast.length) issues.push(`contrast ${r.contrast.length}`)
    if (r.smallTargets.length) issues.push(`targets ${r.smallTargets.length}`)
    if (r.missingAlt.length) issues.push(`alt ${r.missingAlt.length}`)
    if (r.headingOrder.length) issues.push(`heading ${r.headingOrder.length}`)
    if (r.landmarks.h1 !== 1) issues.push(`h1=${r.landmarks.h1}`)
    if (issues.length) bad++
    console.log(
      `${issues.length ? 'FAIL' : ' ok '} ${r.route.padEnd(17)} ${r.viewport.padEnd(8)} ${issues.join(' · ') || 'clean'}`,
    )
  }
  console.log(`\n${report.runs.length - bad}/${report.runs.length} clean · qa/report.json`)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
