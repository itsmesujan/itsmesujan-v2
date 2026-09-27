import { useMemo } from 'react'
import * as THREE from 'three'
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Noise,
  Vignette,
} from '@react-three/postprocessing'
import { BlendFunction, KernelSize } from 'postprocessing'
import { sceneCapability } from '@/three/ScenePrimitives'

/**
 * Cinematic post stack.
 *
 * This is the difference between "a WebGL demo" and "a rendered frame". Four
 * passes, all cheap, all resolution-aware:
 *
 *   Bloom          - only the emissive seam and the hot highlight blow out,
 *                    which is what makes the orange read as light rather
 *                    than as a painted rectangle.
 *   Chromatic      - a sub-pixel amount of fringing. Scaled by resolution so
 *      aberration     a phone does not get a smeared edge.
 *   Vignette       - pulls the eye to the centre of the subject.
 *   Noise          - a real film grain, in linear-ish luminance, so the
 *                    large dark areas of the palette do not band.
 *
 * Everything is disabled on the low tier: the research is unambiguous that
 * postprocessing is the first thing to go when a device is struggling, and a
 * 20fps hero is worse than an unfiltered one.
 */

export interface CinematicProps {
  /** Vary per scene so the grain does not look like a static overlay. */
  seed?: number
  /** Master strength, 0 disables the whole stack. */
  intensity?: number
}

export function Cinematic({ seed = 0, intensity = 1 }: CinematicProps) {
  const cap = sceneCapability()

  // Aberration offset in screen space; signed per scene so two adjacent
  // scenes do not share a direction.
  const offset = useMemo(
    () => new THREE.Vector2(0.0006, 0.0004 * (seed % 2 === 0 ? 1 : -1)),
    [seed],
  )

  if (!cap.webgl || intensity <= 0) return null
  const lowTier = cap.dpr <= 1.5

  return (
    <EffectComposer
      // MSAA is only affordable when we are not already at a reduced pixel
      // ratio; on the low tier geometry edges rely on the lower dpr instead.
      multisampling={lowTier ? 0 : 4}
      enableNormalPass={false}
    >
      <Bloom
        intensity={0.62 * intensity}
        luminanceThreshold={0.62}
        luminanceSmoothing={0.28}
        kernelSize={KernelSize.LARGE}
        mipmapBlur
      />
      <ChromaticAberration
        offset={offset}
        radialModulation={false}
        modulationOffset={0}
        blendFunction={BlendFunction.NORMAL}
      />
      <Vignette
        eskil={false}
        offset={0.28}
        darkness={0.72 * intensity}
        blendFunction={BlendFunction.NORMAL}
      />
      {!lowTier && (
        <Noise premultiply opacity={0.032} blendFunction={BlendFunction.OVERLAY} />
      )}
    </EffectComposer>
  )
}
