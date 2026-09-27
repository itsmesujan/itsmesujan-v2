let booted = false

export const isBooted = () => booted

export function markBooted() {
  booted = true
}

/**
 * Real load progress, published to CSS as --boot-progress. Only observed
 * values are written — the boot gate never fabricates a percentage.
 */
export function setBootProgress(value: number) {
  const v = Math.min(1, Math.max(0, value))
  document.documentElement.style.setProperty('--boot-progress', String(v))
}
