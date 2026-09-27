import { useEffect } from 'react'

/**
 * IntersectionObserver-driven reveal. One observer instance per call, torn down
 * on unmount, `unobserve` after the first intersection so elements never keep
 * re-animating. Runs only when motion is allowed — otherwise CSS shows
 * everything immediately and this hook does not attach at all.
 */
export function useReveal(deps: unknown[] = [], enabled = true): void {
  useEffect(() => {
    if (!enabled) return
    const nodes = document.querySelectorAll<HTMLElement>('[data-reveal]')
    if (!nodes.length) return

    if (!('IntersectionObserver' in window)) {
      nodes.forEach((n) => n.classList.add('is-in'))
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const el = entry.target as HTMLElement
          // Stagger siblings so a grid resolves left-to-right, not all at once.
          const group = el.parentElement
          if (group) {
            const siblings = Array.from(group.children).filter((c) =>
              (c as HTMLElement).hasAttribute('data-reveal'),
            )
            const i = siblings.indexOf(el)
            if (i > 0) el.style.setProperty('--reveal-delay', `${i * 70}ms`)
          }
          el.classList.add('is-in')
          io.unobserve(el)
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
    )

    nodes.forEach((n) => io.observe(n))
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps])
}
