import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { gsap } from 'gsap'
import { NAV, SITE } from '@/data/content'

/**
 * Site chrome. Deliberately small: a wordmark, four links, and a single
 * contact action. The 3D is the identity, so the UI stays quiet.
 *
 * The mobile sheet is a real <dialog>-less panel with focus management,
 * Escape to close, and scroll lock — not a hover menu.
 */
export function Header() {
  const { pathname } = useLocation()
  // The sheet's open state is keyed to the route it was opened on. Deriving it
  // this way means a navigation closes the sheet as a consequence of the route
  // changing, instead of via a setState-in-effect that costs an extra render.
  const [openedAt, setOpenedAt] = useState<string | null>(null)
  const open = openedAt === pathname
  // Stable close: Escape and the backdrop only ever need to clear the state,
  // which does not depend on the current route, so this stays referentially
  // stable and does not have to be listed as an effect dependency.
  const close = useCallback(() => setOpenedAt(null), [])
  const barRef = useRef<HTMLElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const firstLink = useRef<HTMLAnchorElement>(null)

  // Lock scroll + trap focus while the sheet is open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    firstLink.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const items = panelRef.current.querySelectorAll<HTMLElement>('a[href]')
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  // Compact header after the first scroll step.
  useEffect(() => {
    const onScroll = () => {
      barRef.current?.classList.toggle('is-scrolled', window.scrollY > 40)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!barRef.current) return
    const ctx = gsap.context(() => {
      gsap.from('.site-header > *', {
        y: -18,
        opacity: 0,
        duration: 0.9,
        ease: 'expo.out',
        stagger: 0.08,
        delay: 0.15,
      })
    }, barRef)
    return () => ctx.revert()
  }, [])

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header" ref={barRef}>
        <Link className="wordmark" to="/" aria-label={`${SITE.name} — home`}>
          <span className="wordmark__text">{SITE.name}</span>
          <span className="wordmark__dot" aria-hidden="true" />
        </Link>

        <nav className="site-nav" aria-label="Primary">
          <ul>
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className="navlink">
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <a className="btn site-header__cta" href={`mailto:${SITE.email}`}>
          <span className="btn__dot" aria-hidden="true" />
          Email
        </a>

        <button
          className="menu-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="mobile-sheet"
          onClick={() => (open ? close() : setOpenedAt(pathname))}
        >
          <span className="menu-toggle__bars" aria-hidden="true" data-open={open}>
            <i />
            <i />
          </span>
          <span className="visually-hidden">{open ? 'Close menu' : 'Open menu'}</span>
        </button>
      </header>

      <div
        id="mobile-sheet"
        className="sheet"
        data-open={open}
        ref={panelRef}
        aria-hidden={!open}
        {...(!open ? { inert: '' as unknown as boolean } : {})}
      >
        <ul className="sheet__list">
          {NAV.map((item, i) => (
            <li key={item.to} style={{ ['--i' as string]: i }}>
              <NavLink
                to={item.to}
                className="sheet__link"
                ref={i === 0 ? firstLink : undefined}
                tabIndex={open ? 0 : -1}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="sheet__foot">
          <a
            className="mono ink-mute"
            href={`mailto:${SITE.email}`}
            tabIndex={open ? 0 : -1}
          >
            {SITE.email}
          </a>
          <a
            className="mono ink-mute"
            href={SITE.github}
            target="_blank"
            rel="noreferrer noopener"
            tabIndex={open ? 0 : -1}
          >
            GitHub ↗
          </a>
        </div>
      </div>
    </>
  )
}
