import { useEffect, useRef } from 'react'

/**
 * Scroll progress of one element (0..1).
 *
 * The value is written to a ref so a render loop (GSAP, R3F) can read it
 * without triggering React renders, and mirrored to the element's `--sp`
 * custom property so CSS can consume it too.
 *
 * It deliberately does NOT return the number. A ref read during render is a
 * value that only updates when something else forces a re-render, so the
 * returned number would be frozen at whatever the progress happened to be on
 * first paint — worse than not returning it, because the caller would trust a
 * stale value. Both real consumers are outside React: the hero camera rig
 * reads the ref in useFrame, and the CSS reads --sp.
 */
export function useScrollProgress(
  target: React.RefObject<HTMLElement | null>,
  enabled = true,
): void {
  const ref = useRef(0)

  useEffect(() => {
    const el = target.current
    if (!el) return

    const update = () => {
      const rect = el.getBoundingClientRect()
      const travel = rect.height - window.innerHeight
      const p = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0
      ref.current = p
      el.style.setProperty('--sp', String(p))
    }

    if (!enabled) {
      update()
      return
    }

    let frame = 0
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [target, enabled])
}
