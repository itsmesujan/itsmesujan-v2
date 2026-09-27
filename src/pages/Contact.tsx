import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { SITE } from '@/data/content'
import { useSeo, contactJsonLd } from '@/hooks/useSeo'
import { useReveal } from '@/hooks/useReveal'
import { Backdrop, Monolith, SceneCanvas, sceneCapability } from '@/three/ScenePrimitives'

type Errors = Partial<Record<'name' | 'email' | 'message', string>>

/**
 * Contact.
 *
 * There is no server behind this form and the page does not pretend otherwise:
 * on submit it composes a real RFC 6068 mailto with the message already
 * written, and says so in the UI. A fake "message sent" would be a lie about
 * a capability the site does not have. Validation is client-side for
 * immediacy; nothing is transmitted anywhere.
 */
export function Contact({ motion }: { motion: boolean }) {
  useSeo({
    title: 'Contact — itsmesujan',
    description: `Email ${SITE.person} about agent systems, model routing, real-time 3D interfaces, or the system behind your product that keeps breaking.`,
    path: '/contact',
    jsonLd: contactJsonLd(SITE.email),
  })
  useReveal([motion], motion)
  const cap = sceneCapability()

  const [values, setValues] = useState({ name: '', email: '', message: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [copied, setCopied] = useState(false)
  const [sent, setSent] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const set = (k: keyof typeof values) => (v: string) => {
    setValues((prev) => ({ ...prev, [k]: v }))
    setErrors((prev) => ({ ...prev, [k]: undefined }))
  }

  const validate = (): Errors => {
    const next: Errors = {}
    if (!values.name.trim()) next.name = 'Add a name so I know who I’m replying to.'
    if (!values.email.trim()) next.email = 'An email address is required for a reply.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim()))
      next.email = 'That address doesn’t look complete — check for a typo.'
    if (values.message.trim().length < 12)
      next.message = 'A sentence or two about the problem helps me answer usefully.'
    return next
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const next = validate()
    setErrors(next)
    const firstBad = Object.keys(next)[0]
    if (firstBad) {
      formRef.current
        ?.querySelector<HTMLElement>(`[name="${firstBad}"]`)
        ?.focus()
      return
    }
    const subject = encodeURIComponent(`Project enquiry — ${values.name.trim()}`)
    const body = encodeURIComponent(
      `${values.message.trim()}\n\n—\n${values.name.trim()}\n${values.email.trim()}`,
    )
    window.location.href = `mailto:${SITE.email}?subject=${subject}&body=${body}`
    setSent(true)
  }

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SITE.email)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2400)
    } catch {
      // Clipboard permission denied — the address is still visible and
      // selectable on the page, so this is not a dead end.
      setCopied(false)
    }
  }

  return (
    <>
      <section className="contact">
        {motion && cap.webgl && (
          <div className="contact__scene" aria-hidden="true">
            <SceneCanvas label="">
              <Backdrop seed={59} />
              <Monolith />
            </SceneCanvas>
          </div>
        )}

        <div className="shell contact__inner">
          <div className="contact__intro">
            <p className="eyebrow">Contact</p>
            <h1 className="contact__title">
              Tell me what <em className="ink-signal">keeps breaking</em>
            </h1>
            <p className="contact__lede">
              The more specific the failure, the more useful my reply. Which
              model, which runtime, which device, what the error actually says.
            </p>

            <div className="contact__direct">
              <p className="eyebrow">Direct</p>
              <a className="contact__email" href={`mailto:${SITE.email}`}>
                {SITE.email}
              </a>
              <div className="contact__actions">
                <button className="btn" type="button" onClick={copyEmail}>
                  <span className="btn__dot" aria-hidden="true" />
                  {copied ? 'Copied' : 'Copy address'}
                </button>
                <a
                  className="btn"
                  href={SITE.github}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  GitHub ↗
                </a>
              </div>
              <p className="mono contact__meta">
                {SITE.location} · replies within a few days
              </p>
            </div>
          </div>

          <div className="contact__form-wrap">
            <form
              className="contact__form"
              ref={formRef}
              onSubmit={onSubmit}
              noValidate
              aria-describedby="contact-form-note"
            >
              <h2 className="eyebrow">Write it out</h2>

              <div className="field">
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={values.name}
                  onChange={(e) => set('name')(e.target.value)}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                  required
                />
                {errors.name && (
                  <p className="field__error" id="name-error">
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={values.email}
                  onChange={(e) => set('email')(e.target.value)}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  required
                />
                {errors.email && (
                  <p className="field__error" id="email-error">
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="field">
                <label htmlFor="message">What’s going on</label>
                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  value={values.message}
                  onChange={(e) => set('message')(e.target.value)}
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby={errors.message ? 'message-error' : undefined}
                  required
                />
                {errors.message && (
                  <p className="field__error" id="message-error">
                    {errors.message}
                  </p>
                )}
              </div>

              <button className="btn btn--solid contact__submit" type="submit">
                <span className="btn__dot" aria-hidden="true" />
                {sent ? 'Opening your mail app' : 'Send it'}
              </button>

              <p className="mono contact__note" id="contact-form-note">
                This form has no server behind it. Submitting opens your own
                mail app with everything already written, so nothing is stored
                on this site.
                {sent && ' Check your mail app to finish sending.'}
              </p>
            </form>
          </div>
        </div>
      </section>

      <section className="section contact__next">
        <div className="shell">
          <p className="eyebrow">Or keep reading</p>
          <ul className="contact__next-list">
            <li>
              <Link to="/work">Work</Link>
              <span>Six projects, explained to the mechanism.</span>
            </li>
            <li>
              <Link to="/lab">Lab</Link>
              <span>Real-time graphics experiments with their costs stated.</span>
            </li>
            <li>
              <Link to="/about">About</Link>
              <span>How I work, and the four rules I hold to.</span>
            </li>
          </ul>
        </div>
      </section>
    </>
  )
}
