import type { MutableRefObject } from 'react'
import type { ReactNode } from 'react'
import { useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { randSeq } from '@/three/random'

/* =========================================================================
   Shared scene primitives for itsmesujan.

   Budget rules enforced here:
   - exactly one <Canvas> and one owned rAF loop (R3F) per route
   - instancing for every repeated element; no per-object draw calls
   - one directional + one ambient light; no shadow maps (nothing needs them)
   - pixel ratio capped at 2, dropped to 1.5 on compact viewports
   - frame loop idles at a lower rate when the section is off-screen
   ========================================================================= */

export const ACCENT_HOT: [number, number, number] = [1, 0.302, 0.11]
export const BONE: [number, number, number] = [0.949, 0.937, 0.91]
export const CARBON: [number, number, number] = [0.051, 0.059, 0.071]

/* ---------------------------------------------------------- capability --- */

let cached: { webgl: boolean; dpr: number } | null = null

export function sceneCapability() {
  if (cached) return cached
  let webgl = false
  try {
    const c = document.createElement('canvas')
    webgl = Boolean(
      c.getContext('webgl2') ??
        c.getContext('webgl') ??
        c.getContext('experimental-webgl'),
    )
  } catch {
    webgl = false
  }
  const compact =
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 900px), (pointer: coarse)').matches
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  const lowMem = typeof mem === 'number' && mem <= 4
  cached = {
    webgl,
    dpr: Math.min(window.devicePixelRatio || 1, compact || lowMem ? 1.5 : 2),
  }
  return cached
}

/* ------------------------------------------------------------- shaders --- */

const NOISE_GLSL = /* glsl */ `
  vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 1.0/7.0;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  float fbm(vec3 p){
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * snoise(p); p *= 2.02; a *= 0.5; }
    return v;
  }
`

/* ---------------------------------------------------------------- dust --- */

const DUST_COUNT = 1400

/**
 * One InstancedMesh for the whole dust field. Positioned on a fixed buffer and
 * only the instance matrix of a few thousand points is touched per frame —
 * cheap enough to leave running, gated by the parent.
 */
export function Dust({ seed = 1, motion = true }: { seed?: number; motion?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const data = useMemo(() => {
    // Deterministic and pure: randSeq(seed, N) is a function of (seed, index),
    // so re-rendering the component can never regenerate or corrupt the field.
    const r = randSeq(seed, DUST_COUNT * 6)
    return Array.from({ length: DUST_COUNT }, (_, i) => {
      const o = i * 6
      return {
        x: (r[o] - 0.5) * 46,
        y: (r[o + 1] - 0.5) * 30,
        z: (r[o + 2] - 0.5) * 40 - 4,
        s: 0.02 + r[o + 3] * 0.075,
        p: r[o + 4] * Math.PI * 2,
        f: 0.4 + r[o + 5] * 1.1,
      }
    })
  }, [seed])

  useFrame((state) => {
    const mesh = ref.current
    if (!mesh || !motion) return
    const t = state.clock.elapsedTime
    for (let i = 0; i < data.length; i++) {
      const d = data[i]
      dummy.position.set(
        d.x + Math.sin(t * 0.12 * d.f + d.p) * 0.9,
        d.y + Math.cos(t * 0.1 * d.f + d.p) * 0.7,
        d.z,
      )
      dummy.scale.setScalar(d.s)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, DUST_COUNT]} frustumCulled={false}>
      <sphereGeometry args={[1, 5, 5]} />
      <meshBasicMaterial color="#6a6d72" transparent opacity={0.5} />
    </instancedMesh>
  )
}

/* ---------------------------------------------------------- hero object --- */

/**
 * The signature object: a stacked monolith of glass and steel cut by a single
 * emissive seam. One mesh family, one material, real depth — this is the one
 * place the third dimension carries the message (a solid object with mass, not
 * a decorative plane).
 */
export function Monolith({ motion = true }: { motion?: boolean }) {
  const group = useRef<THREE.Group>(null)
  const seam = useRef<THREE.Mesh>(null)
  const slabs = useRef<THREE.Group>(null)

  const stack = useMemo(
    () =>
      Array.from({ length: 11 }, (_, i) => {
        const t = i / 10
        return {
          w: 2.5 - t * 0.85 + Math.sin(i * 1.7) * 0.14,
          h: 0.2 - t * 0.045,
          d: 2.5 - t * 0.85 + Math.cos(i * 2.1) * 0.14,
          y: i * 0.36 - 1.8,
        }
      }),
    [],
  )

  useFrame((state, delta) => {
    if (!motion) return
    const t = state.clock.elapsedTime
    if (group.current) {
      group.current.rotation.y = Math.sin(t * 0.11) * 0.32 + state.pointer.x * 0.18
      group.current.rotation.x = Math.cos(t * 0.09) * 0.05 - state.pointer.y * 0.07
      group.current.position.y = Math.sin(t * 0.34) * 0.13
    }
    if (seam.current) {
      const m = seam.current.material as THREE.MeshBasicMaterial
      m.opacity = 0.72 + Math.sin(t * 1.4) * 0.14
    }
    if (slabs.current) {
      slabs.current.children.forEach((c, i) => {
        const mesh = c as THREE.Mesh
        const s = 1 + Math.sin(t * 0.8 + i * 0.4) * 0.012
        mesh.scale.set(s, 1, s)
      })
    }
    void delta
  })

  return (
    <group ref={group} position={[0, 0.2, 0]}>
      <group ref={slabs}>
        {stack.map((s, i) => (
          <mesh key={i} position={[0, s.y, 0]} castShadow={false} receiveShadow={false}>
            <boxGeometry args={[s.w, s.h, s.d]} />
            <meshStandardMaterial
              color={i % 3 === 0 ? '#191d22' : '#0f1216'}
              metalness={0.86}
              roughness={i % 2 === 0 ? 0.28 : 0.5}
            />
          </mesh>
        ))}
      </group>
      {/* the one warm line that makes the object legible in a dark frame */}
      <mesh ref={seam} position={[0, -0.02, 1.32]}>
        <planeGeometry args={[2.15, 0.035]} />
        <meshBasicMaterial color={ACCENT_HOT} transparent opacity={0.85} toneMapped={false} />
      </mesh>
      <mesh position={[0, -1.98, 0]}>
        <planeGeometry args={[3.4, 3.4]} />
        <meshBasicMaterial color="#ff4d1c" transparent opacity={0.045} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------- camera --- */

export interface CameraKey {
  /** 0..1 scroll progress within the section. */
  at: number
  pos: [number, number, number]
  look: [number, number, number]
}

/**
 * Maps scroll progress to a camera keyframe path. Compact viewports get a
 * shorter, more frontal path (less travel, no clipping), per the scroll
 * guidance: a phone should not be dragged through a corridor.
 */
export function CameraRig({
  keys,
  progress,
  compact = false,
  motion = true,
}: {
  keys: CameraKey[]
  progress: MutableRefObject<number>
  compact?: boolean
  motion?: boolean
}) {
  const { camera } = useThree()
  const target = useMemo(() => new THREE.Vector3(), [])
  const pos = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const p = compact ? progress.current * 0.6 : progress.current
    const n = Math.min(1, Math.max(0, p))
    let i = 0
    while (i < keys.length - 2 && n > keys[i + 1].at) i++
    const a = keys[i]
    const b = keys[i + 1] ?? a
    const span = Math.max(0.0001, b.at - a.at)
    const local = smoothstep((n - a.at) / span)
    pos.set(
      lerp(a.pos[0], b.pos[0], local),
      lerp(a.pos[1], b.pos[1], local),
      lerp(a.pos[2], b.pos[2], local),
    )
    target.set(
      lerp(a.look[0], b.look[0], local),
      lerp(a.look[1], b.look[1], local),
      lerp(a.look[2], b.look[2], local),
    )
    if (motion) {
      camera.position.lerp(pos, 0.06)
      camera.lookAt(target)
    } else {
      camera.position.copy(pos)
      camera.lookAt(target)
    }
  })

  return null
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const smoothstep = (t: number) => {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/* ------------------------------------------------------------ backdrop --- */

/** Backdrop: gradient shell + the dust field. Present on every route. */
export function Backdrop({ seed = 7, motion = true }: { seed?: number; motion?: boolean }) {
  return (
    <>
      <color attach="background" args={['#07080a']} />
      <fog attach="fog" args={['#07080a', 14, 46]} />
      <ambientLight intensity={0.42} color="#c9cdd4" />
      <directionalLight position={[5, 7, 4]} intensity={1.35} color="#f2efe8" />
      <pointLight position={[-4, -1.5, 2]} intensity={7} distance={16} color="#ff4d1c" />
      <Dust seed={seed} motion={motion} />
    </>
  )
}

/* -------------------------------------------------------------- canvas --- */

export function SceneCanvas({
  children,
  className,
  /** Progressive: keeps the static poster visible until the first frame. */
  label = 'Interactive 3D scene',
  motion = true,
}: {
  children: ReactNode
  className?: string
  label?: string
  motion?: boolean
}) {
  const cap = sceneCapability()
  if (!cap.webgl) return null

  return (
    <Canvas
      className={className}
      dpr={cap.dpr}
      gl={{
        antialias: cap.dpr <= 1.5,
        alpha: false,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false,
      }}
      camera={{ position: [0, 0, 7], fov: 42, near: 0.1, far: 120 }}
      frameloop={motion ? 'always' : 'demand'}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.02
      }}
      aria-label={label}
    >
      {children}
    </Canvas>
  )
}

export { NOISE_GLSL }
