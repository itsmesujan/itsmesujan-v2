import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PROJECTS, SITE } from '@/data/content'
import { ProjectCard } from '@/components/ProjectCard'
import { useSeo, collectionJsonLd, ORIGIN_SITE } from '@/hooks/useSeo'
import { useReveal } from '@/hooks/useReveal'
import { Backdrop, CameraRig, SceneCanvas, sceneCapability } from '@/three/ScenePrimitives'
import { useIsCompact } from '@/hooks/useEnvironment'

/**
 * Work index.
 *
 * The list is the content; the scene behind it is a slow, continuous camera
 * move through the same monolith material as the home page, so the two routes
 * feel like one world rather than two templates. Filters are real: they
 * narrow the DOM, they do not just restyle it.
 */
export function Work({ motion }: { motion: boolean }) {
  useSeo({
    title: 'Work — itsmesujan',
    description:
      'Six projects explained to the mechanism: a model router, a self-healing mission DAG, an evaluation harness, a 3D inspector, a filmmaker skill and a studio site.',
    path: '/work',
    jsonLd: collectionJsonLd('ItemList', 'Projects', PROJECTS.map((p) => ({
      '@type': 'CreativeWork',
      name: p.name,
      description: p.summary,
      url: `${ORIGIN_SITE}/work/${p.slug}`,
    }))),
  })
  useReveal([motion], motion)
  const compact = useIsCompact()
  const cap = sceneCapability()
  const [filter, setFilter] = useState<'all' | 'active' | 'shipped'>('all')
  const progress = useRef(0)

  const filters = useMemo(
    () => [
      { id: 'all' as const, label: 'Everything' },
      { id: 'active' as const, label: 'In progress' },
      { id: 'shipped' as const, label: 'Shipped' },
    ],
    [],
  )

  const shown = PROJECTS.filter((p) => filter === 'all' || p.status === filter)

  return (
    <>
      <section className="page-head">
        {motion && cap.webgl && (
          <div className="page-head__scene" aria-hidden="true">
            <SceneCanvas label="">
              <Backdrop seed={23} />
              <CameraRig
                motion
                compact={compact}
                progress={progress}
                keys={[
                  { at: 0, pos: [3.4, 0.6, 9], look: [0, 0, 0] },
                  { at: 1, pos: [-2.6, -0.4, 7.2], look: [0, 0, 0] },
                ]}
              />
            </SceneCanvas>
          </div>
        )}
        <div className="shell page-head__inner">
          <p className="eyebrow">Work — {PROJECTS.length} projects</p>
          <h1 className="page-head__title">
            Each one explained to the <em className="ink-signal">mechanism</em>
          </h1>
          <p className="page-head__lede">
            No client logos, no fabricated metrics. What follows is what these
            systems actually do, why they exist, and where the source is.
          </p>
        </div>
      </section>

      <section className="section work-index" aria-labelledby="work-index-title">
        <div className="shell">
          <h2 id="work-index-title" className="visually-hidden">
            Project index
          </h2>

          <div className="filters" role="group" aria-label="Filter projects">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                className="filters__btn"
                aria-pressed={filter === f.id}
                onClick={() => {
                  setFilter(f.id)
                  // Re-run the reveal so newly shown cards resolve in.
                  requestAnimationFrame(() =>
                    document
                      .querySelectorAll('.work-index .pcard')
                      .forEach((n) => n.classList.add('is-in')),
                  )
                }}
              >
                {f.label}
                <span className="mono filters__count">
                  {f.id === 'all'
                    ? PROJECTS.length
                    : PROJECTS.filter((p) => p.status === f.id).length}
                </span>
              </button>
            ))}
          </div>

          <p className="mono work-index__count" aria-live="polite">
            Showing {shown.length} of {PROJECTS.length}
          </p>

          <div className="work-grid">
            {shown.map((p, i) => (
              <ProjectCard key={p.slug} project={p} index={i} motion={motion} />
            ))}
          </div>
        </div>
      </section>

      <section className="section cta" aria-labelledby="work-cta">
        <div className="shell cta__inner">
          <h2 id="work-cta" className="cta__title reveal" data-reveal>
            Want the reasoning behind one of these?
          </h2>
          <p className="cta__body reveal" data-reveal>
            I’m happy to go deeper on the design decisions, the trade-offs and
            the parts I would do differently.
          </p>
          <div className="cta__actions reveal" data-reveal>
            <a className="btn btn--solid" href={`mailto:${SITE.email}`}>
              <span className="btn__dot" aria-hidden="true" />
              Email me
            </a>
            <Link className="btn" to="/lab">
              See the lab
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
