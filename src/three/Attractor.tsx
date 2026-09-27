import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Attractor — a full-screen fragment shader.
 *
 * A Clifford-style iterative attractor evaluated per pixel, accumulated as
 * density and graded to the site palette. One draw call, no geometry, no
 * textures. The visitor controls a single real parameter (`uK`) and the image
 * genuinely resolves differently at both ends, including when paused.
 */

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec2  uRes;
  uniform float uK;
  uniform float uZoom;
  uniform float uTime;
  uniform float uDensity;
  uniform vec3  uInk;
  uniform vec3  uHot;

  void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
    p *= uZoom;

    // Slow, bounded drift so the still frame is alive without being noisy.
    float t = uTime * 0.12;
    p += vec2(sin(t) * 0.06, cos(t * 0.8) * 0.06);

    vec2 z = p;
    float acc = 0.0;
    float w = 0.0;
    const int ITER = 110;

    for (int i = 0; i < ITER; i++) {
      float fi = float(i);
      z = vec2(
        sin(z.y * uK + t) * 1.35,
        cos(z.x * uK - t) * 1.35
      );
      float d = dot(z, z);
      acc += exp(-d * 0.55) * (0.35 + 0.65 * sin(fi * 0.13));
      w += 1.0;
      if (d > 64.0) { acc *= 0.92; }
    }

    float v = clamp(acc / w * uDensity, 0.0, 1.0);
    v = pow(v, 0.78);

    // Film-like dither so the gradient does not band on 8-bit displays.
    float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    v += (dither - 0.5) / 255.0;

    vec3 col = mix(uInk, uHot, smoothstep(0.28, 0.92, v));
    col = mix(col, vec3(0.949, 0.937, 0.910), smoothstep(0.86, 1.0, v) * 0.75);
    col *= 0.35 + 0.75 * v;

    gl_FragColor = vec4(col, 1.0);
  }
`

export function Attractor({
  k,
  zoom,
  motion = true,
  density = 1,
}: {
  k: number
  zoom: number
  motion?: boolean
  density?: number
}) {
  const material = useRef<THREE.ShaderMaterial>(null)
  const size = useRef({ w: 1, h: 1 })

  const uniforms = useMemo(
    () => ({
      uRes: { value: new THREE.Vector2(1, 1) },
      uK: { value: k },
      uZoom: { value: zoom },
      uTime: { value: 0 },
      uDensity: { value: density },
      uInk: { value: new THREE.Color('#0a0c10') },
      uHot: { value: new THREE.Color('#ff4d1c') },
    }),
    // Values are written every frame below; the object identity is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useFrame((state) => {
    const m = material.current
    if (!m) return
    const { viewport } = state
    const dpr = state.gl.getPixelRatio()
    size.current.w = viewport.width * dpr
    size.current.h = viewport.height * dpr
    m.uniforms.uRes.value.set(size.current.w, size.current.h)
    m.uniforms.uK.value = THREE.MathUtils.lerp(
      m.uniforms.uK.value as number,
      k,
      0.08,
    )
    m.uniforms.uZoom.value = THREE.MathUtils.lerp(
      m.uniforms.uZoom.value as number,
      zoom,
      0.08,
    )
    m.uniforms.uDensity.value = density
    if (motion) m.uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    // Pinned straight to clip space: a 2D pass should not be fighting a
    // perspective projection it does not need.
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={material}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}
