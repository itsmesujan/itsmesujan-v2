import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LAB_EXPERIMENTS, SITE } from '@/data/content'
import { useSeo, collectionJsonLd, ORIGIN_SITE } from '@/hooks/useSeo'
import { useReveal } from '@/hooks/useReveal'
import { Attractor } from '@/three/Attractor'
import { SceneCanvas, sceneCapability } from '@/three/ScenePrimitives'

/**
 * Lab.
 *
 * The real interaction: one shader, one parameter, both ends visibly
 * different. The slider changes the pattern itself, not a label — and under
 * reduced motion the same control still works, the loop just stops.
 */
export function Lab({ motion }: { motion: boolean }) {
  useSeo({
    title: 'Lab — itsmesujan',
    description:
      'Four small real-time graphics experiments: a fragment-shader attractor, scroll-linked displacement, instancing at ten thousand, and a raymarched volume.',
    path: '/lab',
    jsonLd: collectionJsonLd(
      'ItemList',
      'Experiments',
      LAB_EXPERIMENTS.map((x) => ({
        '@type': 'SoftwareSourceCode',
        name: x.title,
        description: x.line,
        url: `${ORIGIN_SITE}/lab`,
      })),
    ),
  })
  useReveal([motion], motion)

  const cap = sceneCapability()
  const [k, setK] = useState(1.62)
  const [density, setDensity] = useState(1.05)
  const rangeRef = useRef<HTMLInputElement>(null)

  // Keyboard arrows work natively on the range input; this just keeps the
  // readout in sync when they are used.
  useEffect(() => {
    const el = rangeRef.current
    if (!el) return
    const onInput = () => setK(Number(el.value))
    el.addEventListener('input', onInput)
    return () => el.removeEventListener('input', onInput)
  }, [])

  const active = LAB_EXPERIMENTS[0]

  return (
    <>
      <section className="page-head page-head--lab">
        <div className="shell page-head__inner">
          <p className="eyebrow">Lab — experiments, not products</p>
          <h1 className="page-head__title">
            Small things, built to <em className="ink-signal">prove a technique</em>
          </h1>
          <p className="page-head__lede">
            Each experiment exists to answer one question: what is this
            technique actually costing, and what can it do that CSS cannot? The
            cost is stated next to the thing.
          </p>
        </div>
      </section>

      <section className="section lab" aria-labelledby="lab-title">
        <div className="shell">
          <h2 id="lab-title" className="visually-hidden">
            Featured experiment
          </h2>
          <div className="lab__stage">
            <div className="lab__canvas-wrap">
              {/* Permanent still: a real generated plate, so the stage is never
                  an empty box without a renderer. */}
              <img
                className="lab__poster"
                src="/media/cover-agentx.jpg"
                alt="Abstract dark render of concentric rings, shown while the shader is unavailable"
                width={1200}
                height={900}
              />
              {motion && cap.webgl && (
                <SceneCanvas className="lab__canvas" label={active.title}>
                  <Attractor k={k} zoom={1.15} density={density} motion />
                </SceneCanvas>
              )}
            </div>

            <div className="lab__controls">
              <p className="eyebrow">{active.title}</p>
              <p className="lab__line">{active.line}</p>

              <div className="lab__control">
                <label htmlFor="lab-k">
                  <span className="mono">k</span>
                  <span className="mono lab__value">{k.toFixed(2)}</span>
                </label>
                <input
                  id="lab-k"
                  ref={rangeRef}
                  type="range"
                  min={0.6}
                  max={2.4}
                  step={0.01}
                  value={k}
                  onChange={(e) => setK(Number(e.target.value))}
                />
              </div>

              <div className="lab__control">
                <label htmlFor="lab-d">
                  <span className="mono">density</span>
                  <span className="mono lab__value">{density.toFixed(2)}</span>
                </label>
                <input
                  id="lab-d"
                  type="range"
                  min={0.4}
                  max={2}
                  step={0.01}
                  value={density}
                  onChange={(e) => setDensity(Number(e.target.value))}
                />
              </div>

              <p className="mono lab__cost">
                {active.cost} · one fragment shader · no geometry, no textures
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section lab-index" aria-labelledby="lab-index-title">
        <div className="shell">
          <h2 id="lab-index-title" className="section-head__title">
            The other three
          </h2>
          <ul className="lab-index__list">
            {LAB_EXPERIMENTS.slice(1).map((x, i) => (
              <li key={x.id} className="lab-index__item reveal" data-reveal>
                <span className="mono lab-index__n" aria-hidden="true">
                  {String(i + 2).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="lab-index__title">{x.title}</h3>
                  <p className="lab-index__line">{x.line}</p>
                </div>
                <p className="chip lab-index__kind">{x.kind}</p>
                <p className="mono lab-index__cost">{x.cost}</p>
              </li>
            ))}
          </ul>
          <p className="mono lab-index__note">
            These are study pieces, not shipped features. Source for each lives
            on <a href={SITE.github}>GitHub</a>.
          </p>
        </div>
      </section>

      <section className="section cta" aria-labelledby="lab-cta">
        <div className="shell cta__inner">
          <h2 id="lab-cta" className="cta__title reveal" data-reveal>
            Want this applied to something real?
          </h2>
          <a className="btn btn--solid cta__btn reveal" data-reveal href={`mailto:${SITE.email}`}>
            <span className="btn__dot" aria-hidden="true" />
            {SITE.email}
          </a>
          <Link className="btn reveal" data-reveal to="/work">
            Or see the shipped work
          </Link>
        </div>
      </section>
    </>
  )
}
