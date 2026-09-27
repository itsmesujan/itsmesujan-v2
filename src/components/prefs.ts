const params = new URLSearchParams(
  typeof window === 'undefined' ? '' : window.location.search,
)

/** `?static=1` — skip smooth scroll, pinning and the render loop. */
export const forceStatic = params.get('static') === '1'
