import { useLayoutEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { randSeq } from '@/three/random'

/**
 * Topology — the site's single visual idea.
 *
 * The previous hero was a monolith: a solid object in a void. That is the most
 * built genre in this category, and it decorates the page without saying
 * anything. This site claims exactly one thing — systems that show their work
 * — so the hero *is* a system: a layered mission graph that routes and lights
 * up as you scroll.
 *
 * The shape is the argument. A mission is a DAG of typed steps, a route is
 * chosen through it, and a failure gets re-routed rather than aborted. You are
 * looking down the layers of a plan, and the pulse head is the run.
 *
 * Performance contract:
 *  - all nodes in ONE InstancedMesh, all edges in ONE LineSegments: 2 draws
 *  - instance matrices written once in a layout effect, never per frame
 *  - the travelling pulse is a uniform, so a frame costs two uniform writes
 *  - zero allocation inside useFrame
 */

const LAYERS = 7
const PER_LAYER = 11
const NODE_COUNT = LAYERS * PER_LAYER

const NODE_VERT = /* glsl */ `
  attribute float aT;
  varying float vT;
  varying float vFacing;
  void main() {
    vT = aT;
    vec4 local = instanceMatrix * vec4(position, 1.0);
    vec4 mv = modelViewMatrix * local;
    vFacing = normalize(normalMatrix * normal).z;
    gl_Position = projectionMatrix * mv;
  }
`

const NODE_FRAG = /* glsl */ `
  precision highp float;
  varying float vT;
  varying float vFacing;
  uniform float uPulse;
  uniform float uBreath;
  uniform float uDim;
  uniform vec3  uInk;
  uniform vec3  uHot;
  uniform vec3  uBone;

  void main() {
    // Distance from this node to the pulse head, in graph space.
    float d = abs(vT - uPulse);
    float head = 1.0 - smoothstep(0.0, 0.16, d);
    // Nodes behind the head have executed; nodes ahead have not.
    float behind = 1.0 - smoothstep(0.0, 0.55, max(0.0, vT - uPulse));
    float live = mix(0.3, 1.0, behind);

    vec3 col = mix(uInk, uHot, head);
    col = mix(col, uBone, head * 0.6);
    col *= live * (0.72 + 0.28 * uBreath);
    // Cheap wrapped-Lambert so spheres read as volumes, not flat discs.
    col *= 0.55 + 0.45 * clamp(vFacing * 0.5 + 0.5, 0.0, 1.0);
    col = mix(col, uInk * 0.55, uDim);

    gl_FragColor = vec4(col, 1.0);
  }
`

const EDGE_VERT = /* glsl */ `
  attribute float aT;
  varying float vT;
  void main() {
    vT = aT;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const EDGE_FRAG = /* glsl */ `
  precision highp float;
  varying float vT;
  uniform float uPulse;
  uniform float uBreath;
  uniform float uDim;
  uniform vec3  uInk;
  uniform vec3  uHot;
  void main() {
    float d = abs(vT - uPulse);
    float head = 1.0 - smoothstep(0.0, 0.10, d);
    float behind = 1.0 - smoothstep(0.0, 0.5, max(0.0, vT - uPulse));
    float live = mix(0.16, 1.0, behind);
    vec3 col = mix(uInk * 1.6, uHot, head);
    col *= live * (0.75 + 0.25 * uBreath);
    col = mix(col, uInk * 0.5, uDim);
    gl_FragColor = vec4(col, 1.0);
  }
`

export interface TopologyProps {
  /** 0..1 scroll progress. Drives the graph's turn and the pulse head. */
  progress: RefObject<number>
  motion?: boolean
  seed?: number
}

export function Topology({ progress, motion = true, seed = 5 }: TopologyProps) {
  const group = useRef<THREE.Group>(null)
  const nodes = useRef<THREE.InstancedMesh>(null)
  const nodeMat = useRef<THREE.ShaderMaterial>(null)
  const edgeMat = useRef<THREE.ShaderMaterial>(null)

  /** Built once: node list, node geometry with per-instance attributes, edges. */
  const { nodeGeometry, edgeGeometry, list } = useMemo(() => {
    // Pure deterministic sequence: identical on every load, and safe to call
    // during render because nothing is left mutated between renders.
    // Each node consumes exactly four values (x jitter, y jitter, z jitter,
    // scale), so the sequence must be sized NODE_COUNT * 4 or the tail reads
    // past the end and produces NaN positions.
    const VALUES_PER_NODE = 4
    const r = randSeq(seed, NODE_COUNT * VALUES_PER_NODE)
    const items: { pos: THREE.Vector3; t: number; scale: number }[] = []
    let c = 0
    // Fail loudly in development if a future edit consumes more values per
    // node than the sequence was sized for. An exhausted sequence yields
    // undefined, which becomes a NaN position and a silent dead scene.
    const next = () => {
      if (c >= r.length) {
        throw new Error(
          `Topology: random sequence exhausted at index ${c} of ${r.length}. ` +
            `Each node consumes ${VALUES_PER_NODE} values; raise the size if that changed.`,
        )
      }
      return r[c++]
    }

    for (let l = 0; l < LAYERS; l++) {
      const lt = l / (LAYERS - 1)
      // Layers fan out in z so the graph reads as a volume, not a flat sheet.
      const z = -6.2 + lt * 11.5
      const spreadX = 5.4 + Math.sin(lt * Math.PI) * 1.8
      const spreadY = 2.6 + Math.cos(lt * Math.PI) * 0.7
      for (let i = 0; i < PER_LAYER; i++) {
        const it = i / (PER_LAYER - 1)
        items.push({
          pos: new THREE.Vector3(
            (it - 0.5) * spreadX * 2 + (next() - 0.5) * 0.34,
            (next() - 0.5) * spreadY * 1.24,
            z + (next() - 0.5) * 0.5,
          ),
          t: lt,
          // The final layer is the goal, so it sits slightly larger.
          scale: 0.055 + next() * 0.03 + (l === LAYERS - 1 ? 0.04 : 0),
        })
      }
    }

    const ng = new THREE.SphereGeometry(1, 12, 10)
    const aT = new Float32Array(items.length)
    const aScale = new Float32Array(items.length)
    items.forEach((n, i) => {
      aT[i] = n.t
      aScale[i] = n.scale
    })
    ng.setAttribute('aT', new THREE.BufferAttribute(aT, 1))
    ng.setAttribute('aScale', new THREE.BufferAttribute(aScale, 1))

    // Sparse DAG: each node links to one or two nodes in the next layer.
    // Sparse is the point — a full mesh would be an unreadable hairball.
    const edgePos: number[] = []
    const edgeT: number[] = []
    for (let l = 0; l < LAYERS - 1; l++) {
      for (let i = 0; i < PER_LAYER; i++) {
        const a = items[l * PER_LAYER + i]
        const targets = 1 + (i % 2)
        for (let k = 0; k < targets; k++) {
          const b = items[l * PER_LAYER + ((i + k * 5 + l) % PER_LAYER)]
          edgePos.push(
            a.pos.x, a.pos.y, a.pos.z,
            b.pos.x, b.pos.y, b.pos.z,
          )
          edgeT.push(a.t, b.t)
        }
      }
    }

    const eg = new THREE.BufferGeometry()
    eg.setAttribute('position', new THREE.Float32BufferAttribute(edgePos, 3))
    eg.setAttribute('aT', new THREE.Float32BufferAttribute(edgeT, 1))

    return { nodeGeometry: ng, edgeGeometry: eg, list: items }
  }, [seed])

  /** Instance matrices written exactly once, after the mesh is attached. */
  useLayoutEffect(() => {
    const mesh = nodes.current
    if (!mesh) return
    const d = new THREE.Object3D()
    list.forEach((n, i) => {
      d.position.copy(n.pos)
      d.scale.setScalar(n.scale)
      d.updateMatrix()
      mesh.setMatrixAt(i, d.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [list])

  const nodeUniforms = useMemo(
    () => ({
      uPulse: { value: 0 },
      uBreath: { value: 0 },
      uDim: { value: 0 },
      uInk: { value: new THREE.Color('#454b55') },
      uHot: { value: new THREE.Color('#ff4d1c') },
      uBone: { value: new THREE.Color('#f2efe8') },
    }),
    [],
  )

  const edgeUniforms = useMemo(
    () => ({
      uPulse: { value: 0 },
      uBreath: { value: 0 },
      uDim: { value: 0 },
      uInk: { value: new THREE.Color('#2e343c') },
      uHot: { value: new THREE.Color('#ff4d1c') },
    }),
    [],
  )

  useFrame((state) => {
    const p = progress.current
    const t = state.clock.elapsedTime

    if (group.current) {
      // The graph turns to face the visitor as they descend.
      group.current.rotation.y =
        -p * 0.85 + Math.sin(t * 0.14) * 0.09 + state.pointer.x * 0.14
      group.current.rotation.x = Math.sin(t * 0.1) * 0.045 - state.pointer.y * 0.07
      group.current.position.y = Math.sin(t * 0.28) * 0.1 - p * 0.35
      group.current.position.z = p * 1.4
    }

    const head = motion ? (p * 1.12) % 1.12 : 0.35
    const breath = 0.5 + 0.5 * Math.sin(t * 1.1)

    if (nodeMat.current) {
      const u = nodeMat.current.uniforms
      u.uPulse.value = head
      u.uBreath.value = breath
      u.uDim.value = p * 0.5
    }
    if (edgeMat.current) {
      const u = edgeMat.current.uniforms
      u.uPulse.value = head
      u.uBreath.value = breath
      u.uDim.value = p * 0.6
    }
  })

  return (
    <group ref={group}>
      <instancedMesh
        ref={nodes}
        args={[nodeGeometry, undefined, NODE_COUNT]}
        frustumCulled={false}
      >
        <shaderMaterial
          ref={nodeMat}
          vertexShader={NODE_VERT}
          fragmentShader={NODE_FRAG}
          uniforms={nodeUniforms}
          toneMapped={false}
        />
      </instancedMesh>

      <lineSegments geometry={edgeGeometry} frustumCulled={false}>
        <shaderMaterial
          ref={edgeMat}
          vertexShader={EDGE_VERT}
          fragmentShader={EDGE_FRAG}
          uniforms={edgeUniforms}
          toneMapped={false}
          transparent
          opacity={0.92}
        />
      </lineSegments>
    </group>
  )
}
