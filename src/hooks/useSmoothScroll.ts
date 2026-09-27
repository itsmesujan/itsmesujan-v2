import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from './useEnvironment'

gsap.registerPlugin(ScrollTrigger)

/**
 * One Lenis instance for the whole app, driving GSAP's ticker so ScrollTrigger
 * and the smooth scroll share a single clock (two rAF loops drift and cause
 * jitter). Torn down completely on unmount.
 *
 * Under reduced motion Lenis is never created: native scrolling is faster and
 * is what the user asked for.
 */
export function useSmoothScroll(enabled: boolean) {
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    if (!enabled) {
      ScrollTrigger.refresh()
      return
    }

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
      // Native touch scroll stays native; hijacking it on a phone feels wrong.
      syncTouch: false,
    })
    lenisRef.current = lenis

    lenis.on('scroll', ScrollTrigger.update)

    const raf = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    // Fonts change metrics; recompute trigger positions once they land.
    document.fonts?.ready.then(() => ScrollTrigger.refresh())

    return () => {
      gsap.ticker.remove(raf)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [enabled])

  return lenisRef
}

/** Scrolls to the top on every route change (and honours ?static=1). */
export function useScrollToTopOnNavigate() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (prefersReducedMotion()) {
      window.scrollTo(0, 0)
      return
    }
    // Lenis is restored on the next frame, after the new route commits.
    const id = requestAnimationFrame(() => window.scrollTo(0, 0))
    return () => cancelAnimationFrame(id)
  }, [pathname])
}
