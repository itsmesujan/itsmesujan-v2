import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { PROJECTS, SITE } from '@/data/content'

/** Resolved once per bundle load; the footer year cannot change at runtime. */
const BUILD_YEAR = new Date().getFullYear()

/**
 * Site footer. Doubles as the sitemap: every route is reachable from here,
 * which is also the primary internal-linking structure for search engines.
 */
export function Footer() {
  // The build year is a constant for the life of the bundle, so it is
  // computed once at module scope. A ref here would be read during render,
  // which React 19 correctly flags: refs are not render-time values.
  const year = BUILD_YEAR
  const top = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    top.current?.focus({ preventScroll: true })
  }, [])

  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="site-footer__top">
          <div>
            <p className="eyebrow">Let’s build something inspectable</p>
            <p className="site-footer__pitch">
              If you have a system that keeps breaking, a model that is too
              expensive to run, or an interface that needs to feel like
              something — <a href={`mailto:${SITE.email}`}>write to me</a>.
            </p>
          </div>
          <a className="btn btn--solid site-footer__cta" href={`mailto:${SITE.email}`}>
            <span className="btn__dot" aria-hidden="true" />
            {SITE.email}
          </a>
        </div>

        <hr className="rule" />

        <div className="site-footer__grid">
          <nav aria-label="Footer">
            <h2 className="eyebrow">Pages</h2>
            <ul className="site-footer__list">
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                <Link to="/work">Work</Link>
              </li>
              <li>
                <Link to="/lab">Lab</Link>
              </li>
              <li>
                <Link to="/about">About</Link>
              </li>
              <li>
                <Link to="/contact">Contact</Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Projects">
            <h2 className="eyebrow">Work</h2>
            <ul className="site-footer__list">
              {PROJECTS.map((p) => (
                <li key={p.slug}>
                  <Link to={`/work/${p.slug}`}>{p.name}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="eyebrow">Elsewhere</h2>
            <ul className="site-footer__list">
              <li>
                <a href={SITE.github} target="_blank" rel="noreferrer noopener">
                  GitHub ↗
                </a>
              </li>
              <li>
                <a href={`mailto:${SITE.email}`}>Email</a>
              </li>
              <li className="ink-mute">{SITE.location}</li>
            </ul>
          </div>
        </div>

        <div className="site-footer__base">
          <p className="mono">
            © {year} {SITE.person} — {SITE.name}
          </p>
          <a
            className="mono"
            href="#main"
            ref={top}
            onClick={(e) => {
              e.preventDefault()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >
            Back to top ↑
          </a>
        </div>
      </div>
    </footer>
  )
}
