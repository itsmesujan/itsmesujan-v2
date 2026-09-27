import { useMemo, useRef } from 'react'
import type { Form } from './forms'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export type { Form }

const useMemoColor = (accent: [number, number, number]) =>
  useMemo(() => new THREE.Color(...accent), [accent])

/**
 * Procedural cover object per project. Deterministic from the form name, so a
 * card and its case study always show the same object. Small enough to run
 * inside a hover-preview canvas without dropping frames.
 */
export function ProjectForm({
  form,
  accent,
  motion = true,
}: {
  form: Form
  accent: [number, number, number]
  motion?: boolean
}) {
  const group = useRef<THREE.Group>(null)
  const color = useMemoColor(accent)

  useFrame((state) => {
    const g = group.current
    if (!g || !motion) return
    const t = state.clock.elapsedTime
    g.rotation.y = t * 0.18
    g.rotation.x = Math.sin(t * 0.22) * 0.18
    g.position.y = Math.sin(t * 0.55) * 0.08
  })

  const hot = (
    <meshStandardMaterial
      color={color}
      metalness={0.72}
      roughness={0.3}
      emissive={color}
      emissiveIntensity={0.28}
    />
  )
  const cold = <meshStandardMaterial color="#191d22" metalness={0.5} roughness={0.45} />

  switch (form) {
    case 'lattice':
      return (
        <group ref={group}>
          {Array.from({ length: 30 }, (_, i) => {
            const a = (i / 30) * Math.PI * 2
            const r = 0.5 + (i % 5) * 0.2
            return (
              <mesh key={i} position={[Math.cos(a) * r, Math.sin(a) * r * 0.75, 0]}>
                <boxGeometry args={[0.04, 0.04, 1.3 - (i % 5) * 0.18]} />
                {i % 5 === 0 ? hot : cold}
              </mesh>
            )
          })}
          <mesh>
            <sphereGeometry args={[0.17, 18, 18]} />
            <meshBasicMaterial color="#f2efe8" toneMapped={false} />
          </mesh>
        </group>
      )

    case 'rings':
      return (
        <group ref={group}>
          {Array.from({ length: 9 }, (_, i) => (
            <mesh key={i} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -i * 0.14]}>
              <torusGeometry args={[0.45 + i * 0.12, 0.015 - i * 0.0007, 8, 72]} />
              {i % 3 === 0 ? hot : cold}
            </mesh>
          ))}
        </group>
      )

    case 'slabs':
      return (
        <group ref={group} rotation={[0, 0, Math.PI / 2]}>
          {Array.from({ length: 10 }, (_, i) => (
            <mesh key={i} position={[0, 0, -i * 0.12]} scale={[1, 1 - i * 0.06, 1]}>
              <boxGeometry args={[1.8, 0.05, 1]} />
              <meshStandardMaterial
                color={i % 4 === 0 ? color : '#16191e'}
                metalness={0.4}
                roughness={0.18}
                transparent
                opacity={i % 4 === 0 ? 0.85 : 1}
              />
            </mesh>
          ))}
        </group>
      )

    case 'mesh':
      return (
        <group ref={group}>
          {Array.from({ length: 6 }, (_, x) =>
            Array.from({ length: 6 }, (_, y) => {
              const d = Math.hypot(x - 2.5, y - 2.5) / 3.5
              return (
                <mesh
                  key={`${x}-${y}`}
                  position={[(x - 2.5) * 0.34, (y - 2.5) * 0.34, -d * 0.8]}
                  rotation={[0, 0, d * 0.4]}
                >
                  <boxGeometry args={[0.28, 0.28, 0.28]} />
                  {d < 0.35 ? hot : cold}
                </mesh>
              )
            }),
          )}
        </group>
      )

    case 'frames':
      return (
        <group ref={group}>
          {Array.from({ length: 7 }, (_, i) => {
            const t = i / 6
            return (
              <mesh key={i} position={[(t - 0.5) * 2.8, Math.sin(t * 3) * 0.35, -t * 1.8]}>
                <boxGeometry args={[0.5, 0.64, 0.5]} />
                {i % 3 === 0 ? hot : cold}
              </mesh>
            )
          })}
          <mesh position={[0, 0, -2.4]}>
            <sphereGeometry args={[0.28, 16, 16]} />
            <meshBasicMaterial color="#f2efe8" toneMapped={false} />
          </mesh>
        </group>
      )

    case 'panels':
    default:
      return (
        <group ref={group}>
          {Array.from({ length: 3 }, (_, x) =>
            Array.from({ length: 3 }, (_, y) => {
              const hot_ = x === 1 && y === 1
              return (
                <mesh
                  key={`${x}-${y}`}
                  position={[(x - 1) * 0.9, (y - 1) * 0.9, -(x + y) * 0.25]}
                  rotation={[0, 0, (x - y) * 0.08]}
                >
                  <boxGeometry args={[0.74, 0.74, 0.05]} />
                  <meshStandardMaterial
                    color={hot_ ? color : '#171a1f'}
                    metalness={0.5}
                    roughness={0.2}
                    emissive={hot_ ? color : '#0a0c0f'}
                    emissiveIntensity={hot_ ? 0.55 : 0.1}
                    transparent
                    opacity={0.95}
                  />
                </mesh>
              )
            }),
          )}
        </group>
      )
  }
}
