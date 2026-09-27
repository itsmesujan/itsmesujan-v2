import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Project } from '@/data/content'
import { getActiveForm, setActiveForm, subscribeActiveForm } from '@/three/forms'
import type { Form } from '@/three/forms'
import { useReveal } from '@/hooks/useReveal'

const STATUS_LABEL: Record<Project['status'], string> = {
  shipped: 'shipped',
  active: 'in progress',
  archived: 'archived',
}

/**
 * Project card.
 *
 * The still image is always in the DOM with real alt text, so a failed
 * context, reduced motion or a keyboard visit all still produce a complete,
 * readable card. The procedural 3D object is a progressive enhancement: it
 * mounts only while a fine pointer is on this card, and it is the only WebGL
 * context on the page at that moment.
 */
export function ProjectCard({
  project,
  index = 0,
  motion = true,
}: {
  project: Project
  index?: number
  motion?: boolean
}) {
  const [mine, setMine] = useState(() => getActiveForm()?.form === project.form)
  const ref = useRef<HTMLElement>(null)
  useReveal([project.slug])

  // Re-render only when the shared active form starts/stops being this card.
  useEffect(
    () =>
      subscribeActiveForm(() => {
        setMine(getActiveForm()?.form === project.form)
      }),
    [project.form],
  )

  const activate = (on: boolean) =>
    setActiveForm(
      on ? { form: project.form, accent: project.accent, at: 1 } : null,
    )

  return (
    <article
      className="pcard reveal"
      data-reveal
      ref={ref}
      data-hovered={mine ? 'true' : 'false'}
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse') activate(true)
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') activate(false)
      }}
      onFocusCapture={() => activate(true)}
      onBlurCapture={() => activate(false)}
    >
      <Link className="pcard__link" to={`/work/${project.slug}`}>
        <div className="pcard__media">
          <img
            src={project.cover}
            alt={project.coverAlt}
            width={1200}
            height={900}
            loading={index < 2 ? 'eager' : 'lazy'}
            decoding="async"
          />
          {motion && mine && (
            <div className="pcard__scene" aria-hidden="true">
              <CardSceneSlot form={project.form} accent={project.accent} />
            </div>
          )}
          <p className="pcard__index mono" aria-hidden="true">
            {String(index + 1).padStart(2, '0')}
          </p>
        </div>

        <div className="pcard__body">
          <h3 className="pcard__name">{project.name}</h3>
          <p className="pcard__kicker mono">{project.kicker}</p>
          <p className="pcard__summary">{project.summary}</p>
          <ul className="pcard__tags">
            {project.stack.slice(0, 3).map((s) => (
              <li key={s} className="chip">
                {s}
              </li>
            ))}
          </ul>
        </div>

        <p className="pcard__meta mono">
          <span>{project.year}</span>
          <span className="pcard__status" data-status={project.status}>
            {STATUS_LABEL[project.status]}
          </span>
          <span className="pcard__go">
            Read <span aria-hidden="true">→</span>
          </span>
        </p>
      </Link>
    </article>
  )
}

/* Lazy so a card that is never hovered never downloads a renderer. */
import { lazy, Suspense } from 'react'
const CardScene = lazy(() =>
  import('@/three/CardScene').then((m) => ({ default: m.CardScene })),
)

function CardSceneSlot(props: { form: Form; accent: [number, number, number] }) {
  return (
    <Suspense fallback={null}>
      <CardScene form={props.form} accent={props.accent} />
    </Suspense>
  )
}
