import { useEffect, useRef } from 'react'

/**
 * Infinite marquee. The track is duplicated once and translated by exactly
 * -50%, which is what makes the loop seamless without measuring anything.
 * Pauses on hover/focus and stops entirely under reduced motion (CSS), where
 * it becomes a static, readable list of the same terms.
 */
export function Marquee({
  items,
  label = 'Areas',
}: {
  items: readonly string[]
  label?: string
}) {
  const track = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = track.current
    if (!el) return
    // Offset the duplicate by half the track so the two halves tile exactly.
    const sync = () => {
      const half = el.scrollWidth / 2
      if (half > 0) el.style.setProperty('--marquee-half', `${half}px`)
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const run = [...items, ...items]

  return (
    <div className="marquee" role="group" aria-label={label}>
      <p className="visually-hidden">{label}:</p>
      <div className="marquee__track" ref={track}>
        <ul className="marquee__row">
          {run.map((item, i) => (
            <li key={`${item}-${i}`} aria-hidden={i >= items.length}>
              <span className="marquee__item">{item}</span>
              <span className="marquee__sep" aria-hidden="true">
                ✳
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
