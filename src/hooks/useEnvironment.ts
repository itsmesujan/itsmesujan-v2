import { useEffect, useState } from 'react'

/**
 * Tracks prefers-reduced-motion and stays subscribed, so a change made while
 * the page is open takes effect immediately instead of at next navigation.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return reduced
}

/** True on coarse pointers / narrow viewports — used to shorten camera paths. */
export function useIsCompact(): boolean {
  const [compact, setCompact] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 900px), (pointer: coarse)').matches
  })

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px), (pointer: coarse)')
    const onChange = (e: MediaQueryListEvent) => setCompact(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return compact
}

/** `?static=1` forces the no-motion composition for QA and low-power devices. */
export function useForceStatic(): boolean {
  const [forced] = useState(() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).has('static')
  })
  return forced
}

/** Live matchMedia check outside React (read at call time, not render time). */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
