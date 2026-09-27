/**
 * Deterministic pseudo-random helpers for procedural scene geometry.
 *
 * Both generators are deliberately free of closure mutation: every value is
 * derived by a pure function of the index and the seed, so calling them during
 * a render (inside a useMemo) can never leave a half-mutated variable behind
 * for a later render to observe. A stateful LCG inside a memo is the kind of
 * thing that works until a component re-renders and silently regenerates.
 */

/** Mulberry32: small, fast, good enough distribution for scene dressing. */
export function rand1(seed: number, i: number): number {
  let t = (seed + i * 0x6d2b79f5) >>> 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** A sequence of `n` deterministic values in [0, 1) for one seed. */
export function randSeq(seed: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => rand1(seed, i))
}
