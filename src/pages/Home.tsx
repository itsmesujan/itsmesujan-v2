import { Suspense, lazy, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Backdrop, CameraRig, SceneCanvas, sceneCapability } from '@/three/ScenePrimitives'
import { Topology } from '@/three/Topology'
import { useSeo, personJsonLd } from '@/hooks/useSeo'
import { useReveal } from '@/hooks/useReveal'
import { useIsCompact } from '@/hooks/useEnvironment'
import { PROJECTS, SITE } from '@/data/content'
import { ProjectCard } from '@/components/ProjectCard'
import { Marquee } from '@/components/Marquee'
import { useScrollProgress } from '@/hooks/useScrollProgress'

/**
 * The post stack is ~40 kB of effects code that only matters once a real frame
 * is already on screen. Loading it lazily keeps it out of the critical chunk,
 * so the first render is not waiting on bloom. The fallback is null because a
 * scene without post still looks correct — it is a finish, not a structure.
 */
const Cinematic = lazy(() =>
  import('@/three/Cinematic').then((m) => ({ default: m.Cinematic })),
)

gsap.registerPlugin(ScrollTrigger)

/**
 * Home.
 *
 * Arc: orientation (who/what/where) → mechanism (the one idea, carried by the
 * mission graph) → evidence (the work) → a single action.
 *
 * Signature moment: the hero is not a decorated panel. It is a running mission
 * graph — a layered DAG with a pulse head travelling through it, which is
 * exactly the claim the rest of the site makes. Scroll turns the graph, walks
 * the head along the route, and pulls the camera in until the type clears.
 */
export function Home({ motion }: { motion: boolean }) {
  useSeo({
    title: 'itsmesujan — AI-native builder, agent systems & real-time 3D',
    description:
      'Portfolio of Sujan Majhi: agent systems, model routing and real-time 3D interfaces — built to be inspected, not just admired.',
    path: '/',
    jsonLd: personJsonLd(),
  })
  useReveal([motion], motion)
  const compact = useIsCompact()
  const cap = sceneCapability()
  const scene = motion && cap.webgl

  const heroRef = useRef<HTMLElement>(null)
  const progress = useRef(0)
  useScrollProgress(heroRef, motion)

  // Camera path + type choreography, both scrubbed by the same scroll.
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
          scrub: 0.6,
        },
      })
      gsap
        .timeline({
          scrollTrigger: {
            trigger: el,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.6,
          },
        })
        .to('.hero__line--1', { yPercent: -140, opacity: 0, ease: 'power2.in' }, 0)
        .to('.hero__line--2', { yPercent: -60, opacity: 0, ease: 'power2.in' }, 0.06)
        .to('.hero__hint', { opacity: 0, duration: 0.4 }, 0)
    }, el)
    return () => ctx.revert()
  }, [motion, compact])

  return (
    <>
      {/* ---------------------------------------------------------- hero -- */}
      <section className="hero" ref={heroRef} aria-labelledby="hero-title">
        <div className="hero__scene" aria-hidden={!scene}>
          {/* Permanent static composition. Painted first, replaced only once
              the renderer has drawn a real frame. */}
          <img
            className="hero__poster"
            src="/media/poster-hero.jpg"
            alt=""
            width={2400}
            height={1350}
            fetchPriority="high"
            data-hidden={scene ? 'true' : 'false'}
          />
          {scene && (
            <SceneCanvas label="A layered mission graph with a pulse of light travelling along the selected route">
              <Backdrop seed={11} />
              <Topology progress={progress} motion={motion} />
              <CameraRig
                motion={motion}
                compact={compact}
                progress={progress}
                keys={[
                  { at: 0, pos: [0, 0.5, 8.4], look: [0, 0, -0.6] },
                  { at: 0.5, pos: [1.7, 1.1, 5.2], look: [0, 0.1, -0.4] },
                  { at: 1, pos: [-1.2, -0.9, 3.4], look: [0, -0.3, -0.2] },
                ]}
              />
              <Suspense fallback={null}>
                <Cinematic seed={0} />
              </Suspense>
            </SceneCanvas>
          )}
        </div>

        <div className="shell hero__content">
          <p className="eyebrow hero__eyebrow">
            {SITE.role} — {SITE.location}
          </p>
          <h1 id="hero-title" className="hero__title">
            <span className="hero__line hero__line--1">Systems that</span>
            <span className="hero__line hero__line--2">
              show their <em className="ink-signal">work</em>
            </span>
          </h1>
          <p className="hero__lede">
            I build agent systems, model routers and real-time 3D interfaces —
            and I show the mechanism, not the claim. Every project page here
            explains how the thing actually works.
          </p>
          <div className="hero__actions">
            <a className="btn btn--solid" href="#work">
              <span className="btn__dot" aria-hidden="true" />
              See the work
            </a>
            <Link className="btn" to="/about">
              How I work
            </Link>
          </div>
          <p className="mono hero__hint" aria-hidden="true">
            scroll to travel
          </p>
        </div>

        <div className="hero__progress" aria-hidden="true">
          <div className="hero__progress-bar" />
        </div>
      </section>

      {/* ------------------------------------------------------ statement -- */}
      <section className="section statement" aria-labelledby="statement-title">
        <div className="shell">
          <h2 id="statement-title" className="visually-hidden">
            What I do
          </h2>
          <p className="statement__lead reveal" data-reveal>
            Most portfolio pages describe a capability. This one shows the
            parts that make the capability credible: the failure it handles,
            the decision it makes, and the numbers — when there are numbers to
            report.
          </p>
          <div className="statement__grid">
            {[
              {
                k: 'AI systems',
                v: 'Agent orchestration, mission graphs that re-plan, model routers that explain themselves.',
              },
              {
                k: 'Real-time 3D',
                v: 'Three.js and WebGL interfaces where depth carries meaning — scroll as the narrative engine.',
              },
              {
                k: 'Interface craft',
                v: 'TypeScript, React, and design systems that survive reduced motion, keyboard and a slow phone.',
              },
            ].map((item) => (
              <article key={item.k} className="statement__cell reveal" data-reveal>
                <h3 className="eyebrow">{item.k}</h3>
                <p>{item.v}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ work -- */}
      <section className="section work" id="work" aria-labelledby="work-title">
        <div className="shell">
          <header className="section-head reveal" data-reveal>
            <p className="eyebrow">Selected work</p>
            <h2 id="work-title" className="section-head__title">
              Six things, each explained to the mechanism.
            </h2>
            <Link className="btn btn--ghost" to="/work">
              All work <span aria-hidden="true">→</span>
            </Link>
          </header>
          <div className="work__grid">
            {PROJECTS.slice(0, 4).map((p) => (
              <ProjectCard key={p.slug} project={p} />
            ))}
          </div>
        </div>
      </section>

      <Marquee
        items={[
          'agent systems',
          'model routing',
          'real-time 3d',
          'evaluation harnesses',
          'accessible interaction',
          'scroll choreography',
        ]}
      />

      {/* ------------------------------------------------------------- cta -- */}
      <section className="section cta" aria-labelledby="cta-title">
        <div className="shell cta__inner">
          <h2 id="cta-title" className="cta__title reveal" data-reveal>
            Have something that keeps breaking?
          </h2>
          <p className="cta__body reveal" data-reveal>
            I work on the systems behind the interface — the routing, the
            failure handling, the rendering budget. Bring the hard part.
          </p>
          <a className="btn btn--solid cta__btn reveal" data-reveal href={`mailto:${SITE.email}`}>
            <span className="btn__dot" aria-hidden="true" />
            {SITE.email}
          </a>
        </div>
      </section>
    </>
  )
}
