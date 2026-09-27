import { PRINCIPLES, SITE, STACK } from '@/data/content'
import { useSeo, personJsonLd } from '@/hooks/useSeo'
import { useReveal } from '@/hooks/useReveal'
import { Backdrop, CameraRig, Monolith, SceneCanvas, sceneCapability } from '@/three/ScenePrimitives'
import { useIsCompact } from '@/hooks/useEnvironment'
import { useRef } from 'react'

/**
 * About. The written page is the point; the scene is a corridor of slabs the
 * camera drifts through, quiet on purpose so it never competes with the type.
 */
export function About({ motion }: { motion: boolean }) {
  useSeo({
    title: 'About — itsmesujan',
    description:
      'How Sujan Majhi works: show the mechanism, real numbers or none, design the fallback alongside the animation, and let depth carry meaning.',
    path: '/about',
    jsonLd: personJsonLd(),
  })
  useReveal([motion], motion)
  const compact = useIsCompact()
  const cap = sceneCapability()
  const progress = useRef(0)

  return (
    <>
      <section className="page-head page-head--about">
        {motion && cap.webgl && (
          <div className="page-head__scene" aria-hidden="true">
            <SceneCanvas label="">
              <Backdrop seed={47} />
              <Monolith />
              <CameraRig
                motion
                compact={compact}
                progress={progress}
                keys={[
                  { at: 0, pos: [0, 0, 9.5], look: [0, 0, 0] },
                  { at: 1, pos: [2.2, -1.2, 5.4], look: [0, -0.4, 0] },
                ]}
              />
            </SceneCanvas>
          </div>
        )}
        <div className="shell page-head__inner">
          <p className="eyebrow">About — {SITE.person}</p>
          <h1 className="page-head__title">
            I build the part that has to <em className="ink-signal">keep working</em>
          </h1>
          <p className="page-head__lede">
            I&rsquo;m an AI-native builder working on the systems behind
            interfaces: the router that decides where a model runs, the graph
            that re-plans when a step fails, the renderer that holds its frame
            budget on a phone.
          </p>
          <p className="page-head__lede">
            I care about the part most portfolio pages skip — what happens when
            the model is unavailable, when the context is lost, when the visitor
            has reduced motion turned on. That part is where the quality is.
          </p>
        </div>
      </section>

      <section className="section principles" aria-labelledby="principles-title">
        <div className="shell">
          <h2 id="principles-title" className="section-head__title">
            Four rules I work by
          </h2>
          <ol className="principles__list">
            {PRINCIPLES.map((p, i) => (
              <li key={p.title} className="principle reveal" data-reveal>
                <span className="mono principle__n" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="principle__title">{p.title}</h3>
                <p className="principle__body">{p.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section stack" aria-labelledby="stack-title">
        <div className="shell">
          <h2 id="stack-title" className="section-head__title">
            What I reach for
          </h2>
          <div className="stack__grid">
            {STACK.map((g) => (
              <div key={g.group} className="stack__group reveal" data-reveal>
                <h3 className="eyebrow">{g.group}</h3>
                <ul>
                  {g.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mono stack__note">
            Listed by what I actually use in shipped work, not by what I have
            read about.
          </p>
        </div>
      </section>
    </>
  )
}
