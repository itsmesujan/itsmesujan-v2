import { useCallback, useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { isBooted, markBooted, setBootProgress } from './bootStore'

const STEPS = ['reading manifests', 'compiling shaders', 'allocating geometry', 'ready']
const CEILING_MS = 2600

/**
 * Boot gate. It exists to cover the first-paint gap, not to perform: it
 * reports real work (asset progress) and never invents a fake percentage.
 *
 * The critical rule this component must not break: once it says "ready" it has
 * to actually get out of the way. A full-viewport overlay that lingers after
 * reporting completion is an invisible click-blocker — the page looks finished
 * and every control is dead. So completion is one-shot and latched, and the
 * overlay stops accepting pointer input the moment it is told to leave.
 */
export function BootGate({ onDone }: { onDone: () => void }) {
  const [hidden, setHidden] = useState(() => isBooted())
  const [leaving, setLeaving] = useState(false)
  const [pct, setPct] = useState(0)
  const [step, setStep] = useState(0)
  const [failed] = useState(() => {
    if (typeof document === 'undefined') return true
    try {
      const c = document.createElement('canvas')
      return !(
        c.getContext('webgl2') ?? c.getContext('webgl') ?? c.getContext('experimental-webgl')
      )
    } catch {
      return true
    }
  })
  const bar = useRef<HTMLDivElement>(null)
  const leavingRef = useRef(false)

  /* Progress: only observed states move the bar — fonts resolved, document
     parsed, images decoded. Never a tick that merely counts up. */
  useEffect(() => {
    const bump = (to: number) =>
      setPct((p) => {
        const next = Math.max(p, Math.min(1, to))
        setBootProgress(next)
        setStep(Math.min(STEPS.length - 1, Math.floor(next * STEPS.length)))
        return next
      })

    bump(document.readyState === 'complete' ? 0.7 : 0.25)
    document.fonts?.ready.then(() => bump(0.55)).catch(() => {})

    const imgs = [...document.images].filter((i) => !i.complete)
    if (imgs.length) {
      let settled = 0
      const onOne = () => bump(0.55 + (0.4 * ++settled) / imgs.length)
      imgs.forEach((i) => {
        i.addEventListener('load', onOne, { once: true })
        i.addEventListener('error', onOne, { once: true })
      })
    }

    const onReady = () => bump(1)
    window.addEventListener('load', onReady)
    return () => window.removeEventListener('load', onReady)
  }, [])

  /* Completion: latched and one-shot. Deps are only [hidden, finish] — never
     progress — so a bar update can no longer re-arm this and starve it. */
  const finish = useCallback(() => {
    if (leavingRef.current) return
    leavingRef.current = true
    setPct(1)
    setStep(STEPS.length - 1)
    setBootProgress(1)
    setLeaving(true)
    markBooted()
    onDone()
    window.setTimeout(() => setHidden(true), 620)
  }, [onDone])

  useEffect(() => {
    if (hidden) return
    let fired = false
    const go = () => {
      if (fired) return
      fired = true
      finish()
    }
    // A ceiling so nothing is ever gated behind an unbounded wait…
    const ceiling = window.setTimeout(go, CEILING_MS)
    // …but normally it lifts the moment the browser has genuinely settled.
    const lift = () => {
      if (document.readyState !== 'complete') return
      window.clearTimeout(ceiling)
      // Two frames, so the first painted frame is on screen before we go.
      requestAnimationFrame(() => requestAnimationFrame(go))
    }
    document.fonts?.ready.then(lift).catch(lift)
    window.addEventListener('load', lift)
    lift()
    return () => {
      window.clearTimeout(ceiling)
      window.removeEventListener('load', lift)
    }
  }, [hidden, finish])

  useEffect(() => {
    if (hidden || !bar.current) return
    gsap.to(bar.current, {
      scaleX: Math.max(0.02, pct),
      duration: 0.3,
      ease: 'power2.out',
      overwrite: true,
    })
  }, [hidden, pct])

  if (hidden) return null

  return (
    <div
      className="boot"
      data-failed={failed}
      data-leaving={leaving || undefined}
      role="status"
      aria-live="polite"
    >
      <div className="boot__inner">
        <p className="boot__word">
          itsmesujan<span aria-hidden="true">.</span>
        </p>
        <div className="boot__bar" aria-hidden="true">
          <div className="boot__bar-fill" ref={bar} />
        </div>
        <p className="mono boot__meta">
          <span>{STEPS[step]}</span>
          <span aria-hidden="true">{String(Math.round(pct * 100)).padStart(3, '0')}</span>
        </p>
        {failed && (
          <p className="mono boot__note">
            no webgl — loading the still version
          </p>
        )}
      </div>
    </div>
  )
}
