import { SceneCanvas } from './ScenePrimitives'
import { ProjectForm } from './ProjectForm'
import type { Form } from './forms'

/**
 * Hover-preview object for a project card. Deliberately cheap: no shadows, no
 * post-processing, DPR capped. The canvas exists only while the pointer is on
 * a card, so it unmounts — and releases its context — the moment it leaves.
 */
export function CardScene({
  form,
  accent,
}: {
  form: Form
  accent: [number, number, number]
}) {
  return (
    <SceneCanvas className="pcard__canvas" label="" motion>
      <ambientLight intensity={0.85} color="#c8ccd2" />
      <directionalLight position={[3, 4, 5]} intensity={1.7} color="#f2efe8" />
      <pointLight position={[-3, -2, 2]} intensity={6} distance={12} color="#ff4d1c" />
      <ProjectForm form={form} accent={accent} />
    </SceneCanvas>
  )
}
