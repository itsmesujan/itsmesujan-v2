import { Link } from 'react-router-dom'
import { PROJECTS } from '@/data/content'
import { useSeo, collectionJsonLd, ORIGIN_SITE } from '@/hooks/useSeo'

/** 404. Not decorative: it offers the two things a lost visitor wants. */
export function NotFound() {
  useSeo({
    title: 'Not found — itsmesujan',
    description: 'That page does not exist. Here is the work instead.',
    // Real pages 404; pointing the canonical at a URL that isn't served is
    // just a lie to the crawler.
    path: '/',
    jsonLd: collectionJsonLd(
      'ItemList',
      'Projects',
      PROJECTS.slice(0, 4).map((p) => ({
        '@type': 'CreativeWork',
        name: p.name,
        url: `${ORIGIN_SITE}/work/${p.slug}`,
      })),
    ),
  })

  return (
    <section className="notfound">
      <div className="shell notfound__inner">
        <p className="eyebrow">Error 404</p>
        <h1 className="notfound__title">
          Nothing here<span aria-hidden="true">.</span>
        </h1>
        <p className="notfound__lede">
          That URL doesn&rsquo;t resolve to a page on this site. The work is
          still here, and so is everything else.
        </p>
        <div className="notfound__actions">
          <Link className="btn btn--solid" to="/">
            <span className="btn__dot" aria-hidden="true" />
            Back to the start
          </Link>
          <Link className="btn" to="/work">
            See the work
          </Link>
        </div>
        <ul className="notfound__list">
          {PROJECTS.slice(0, 4).map((p) => (
            <li key={p.slug}>
              <Link to={`/work/${p.slug}`}>
                <span>{p.name}</span>
                <span className="mono">{p.kicker}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
