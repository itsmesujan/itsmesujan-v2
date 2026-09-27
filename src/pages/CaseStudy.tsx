import { useEffect, useRef } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { gsap } from 'gsap'
import { projectBySlug, PROJECTS, SITE } from '@/data/content'
import { ProjectCard } from '@/components/ProjectCard'
import { useSeo } from '@/hooks/useSeo'
import { useReveal } from '@/hooks/useReveal'
import { useIsCompact } from '@/hooks/useEnvironment'
import { Backdrop, CameraRig, SceneCanvas, sceneCapability } from '@/three/ScenePrimitives'
import { ProjectForm as ProjectScene } from '@/three/ProjectForm'

/**
 * Case study.
 *
 * The signature moment lives here: the project object is always present in the
 * hero, and on scroll the camera closes in and the surrounding type falls away
 * so the mechanism is the only thing on screen. It is a camera move, not a
 * page transition — the visitor travels to the work instead of opening it.
 */
export function CaseStudy({ motion }: { motion: boolean }) {
  const { slug = '' } = useParams()
  const project = projectBySlug(slug)
  const compact = useIsCompact()
  const cap = sceneCapability()
  const heroRef = useRef<HTMLElement>(null)
  const progress = useRef(0)
  useReveal([slug], motion)

  useSeo({
    title: project
      ? `${project.name} — ${project.kicker} — itsmesujan`
      : 'Project not found — itsmesujan',
    description: project?.summary ?? 'That project does not exist.',
    path: `/work/${slug}`,
    jsonLd: project
      ? {
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          name: project.name,
          description: project.summary,
          url: `https://itsmesujan.me/work/${project.slug}`,
          author: { '@type': 'Person', name: SITE.person },
          dateCreated: project.year,
          keywords: project.stack.join(', '),
          ...(project.openSource
            ? {
                isAccessibleForFree: true,
                license: 'https://opensource.org/licenses/MIT',
              }
            : {}),
        }
      : undefined,
  })

  // Camera approach, scrubbed against the same progress the hero uses.
  useEffect(() => {
    if (!motion) return
    const el = heroRef.current
    if (!el) return
    const ctx = gsap.context(() => {
      gsap.to(progress, {
        current: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.5,
        },
      })
      gsap
        .timeline({
          scrollTrigger: {
            trigger: el,
            start: 'top top',
            end: '70% top',
            scrub: 0.5,
          },
        })
        .to('.case__kicker, .case__summary, .case__stack', {
          opacity: 0,
          y: -40,
          ease: 'power2.in',
        }, 0)
    }, el)
    return () => ctx.revert()
  }, [motion, slug])

  if (!project) return <Navigate to="/work" replace />

  const others = PROJECTS.filter((p) => p.slug !== project.slug).slice(0, 3)

  return (
    <article className="case">
      <section className="case__hero" ref={heroRef} aria-labelledby="case-title">
        <div className="case__scene" aria-hidden="true">
          <img className="case__poster" src={project.cover} alt="" width={1200} height={900} />
          {motion && cap.webgl && (
            <SceneCanvas label={`Procedural object representing ${project.name}`}>
              <Backdrop seed={31} />
              <ProjectScene form={project.form} accent={project.accent} />
              <CameraRig
                motion={motion}
                compact={compact}
                progress={progress}
                keys={[
                  { at: 0, pos: [0, 0.2, 6.4], look: [0, 0, 0] },
                  { at: 0.55, pos: [1.7, 0.9, 3.6], look: [0, 0.1, 0] },
                  { at: 1, pos: [-1.2, -0.6, 2.2], look: [0, -0.1, 0] },
                ]}
              />
            </SceneCanvas>
          )}
        </div>

        <div className="shell case__content">
          <nav aria-label="Breadcrumb" className="case__crumb">
            <Link to="/work">Work</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{project.name}</span>
          </nav>

          <p className="eyebrow case__kicker">
            {project.kicker} — {project.year}
          </p>
          <h1 id="case-title" className="case__title">
            {project.name}
          </h1>
          <p className="case__summary">{project.summary}</p>

          <ul className="case__stack">
            {project.stack.map((s) => (
              <li key={s} className="chip">
                {s}
              </li>
            ))}
          </ul>

          <div className="case__actions">
            {project.openSource && (
              <span className="chip chip--live">
                <span className="chip__dot" aria-hidden="true" />
                open source
              </span>
            )}
            <a
              className="btn btn--solid"
              href={project.repoUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              <span className="btn__dot" aria-hidden="true" />
              Source on GitHub ↗
            </a>
          </div>
        </div>
      </section>

      <section className="section case__prose">
        <div className="shell case__prose-grid">
          <div className="case__block">
            <h2 className="eyebrow">The problem</h2>
            <p className="case__lede">{project.problem}</p>
          </div>

          <div className="case__block">
            <h2 className="eyebrow">How it works</h2>
            <ol className="case__steps">
              {project.mechanism.map((step, i) => (
                <li key={i} className="case__step reveal" data-reveal>
                  <span className="mono case__step-n" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="case__block">
            <h2 className="eyebrow">What was built</h2>
            <ul className="case__built">
              {project.built.map((b, i) => (
                <li key={i} className="reveal" data-reveal>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <aside className="case__facts" aria-label="Project facts">
            <dl>
              <div>
                <dt className="eyebrow">Role</dt>
                <dd>{project.role}</dd>
              </div>
              <div>
                <dt className="eyebrow">Status</dt>
                <dd>{project.status}</dd>
              </div>
              <div>
                <dt className="eyebrow">Year</dt>
                <dd>{project.year}</dd>
              </div>
              <div>
                <dt className="eyebrow">Source</dt>
                <dd>
                  <a href={project.repoUrl} target="_blank" rel="noreferrer noopener">
                    github ↗
                  </a>
                </dd>
              </div>
            </dl>
            <p className="mono case__disclaimer">
              Described from the source. Where a measured number is not
              published, none is claimed here.
            </p>
          </aside>
        </div>
      </section>

      <section className="section case__more" aria-labelledby="more-title">
        <div className="shell">
          <h2 id="more-title" className="section-head__title">
            Other work
          </h2>
          <div className="work-grid">
            {others.map((p, i) => (
              <ProjectCard key={p.slug} project={p} index={i} motion={motion} />
            ))}
          </div>
        </div>
      </section>
    </article>
  )
}
