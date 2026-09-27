export type Form = 'lattice' | 'rings' | 'slabs' | 'mesh' | 'frames' | 'panels'

export interface ActiveForm {
  form: Form
  accent: [number, number, number]
  /** 0..1 fade-in target for the shared preview object. */
  at: number
}

let active: ActiveForm | null = null
const listeners = new Set<() => void>()

/**
 * One shared preview object for the whole site.
 *
 * Six cards each owning a WebGL context would cost six renderers, six GPU
 * memory pools and six chances to hit the browser's context limit. Instead a
 * single canvas lives in <CardSceneHost> and only ever renders the form the
 * visitor is currently pointing at.
 */
export function setActiveForm(next: ActiveForm | null) {
  const prev = active
  const unchanged =
    next === null && prev === null
      ? true
      : next !== null &&
        prev !== null &&
        next.form === prev.form &&
        next.accent.every((c, i) => c === prev.accent[i])
  if (unchanged) return
  active = next
  listeners.forEach((fn) => fn())
}

export function getActiveForm(): ActiveForm | null {
  return active
}

export function subscribeActiveForm(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
