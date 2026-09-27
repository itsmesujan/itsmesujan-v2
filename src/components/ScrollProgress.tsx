import { useEffect, useRef } from 'react'

/**
 * Hairline scroll progress in the chrome layer. transform + scaleX only, and
 * it writes once per rAF rather than once per scroll event.
 */
export function ScrollProgress({ enabled }: { enabled: boolean }) {
  const bar = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled) {
      bar.current?.style.setProperty('--p', '0')
      return
    }
    let frame = 0
    const update = () => {
      frame = 0
      const max =
        document.documentElement.scrollHeight - window.innerHeight
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0
      bar.current?.style.setProperty('--p', String(p))
    }
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
  }, [enabled])

  return (
    <div className="scroll-progress" aria-hidden="true">
      <div className="scroll-progress__bar" ref={bar} />
    </div>
  )
}
