/**
 * Single source of truth for all site copy and project data.
 *
 * Accuracy rule: every project entry here mirrors a real repository or a real
 * artifact. Nothing about client outcomes, metrics, awards or testimonials is
 * invented — if a field is unknown it is omitted rather than filled in.
 */

export type ProjectStatus = 'shipped' | 'active' | 'archived'

export interface ProjectLink {
  label: string
  href: string
  kind: 'repo' | 'demo' | 'docs'
}

export interface Project {
  slug: string
  name: string
  kicker: string
  year: string
  status: ProjectStatus
  role: string
  stack: string[]
  summary: string
  /** The problem this exists to solve, in the author's words. */
  problem: string
  /** How it actually works — mechanism, not adjectives. */
  mechanism: string[]
  /** What was built, described only in verifiable terms. */
  built: string[]
  openSource: boolean
  license?: string
  repoUrl: string
  demoUrl?: string
  cover: string
  coverAlt: string
  /** Drives the 3D accent used on the card and the case-study hero. */
  accent: [number, number, number]
  /** Geometry family used by the procedural cover mesh. */
  form: 'lattice' | 'rings' | 'slabs' | 'mesh' | 'frames' | 'panels'
}

export const PROJECTS: Project[] = [
  {
    slug: 'devpilot',
    name: 'DevPilot',
    kicker: 'Model router',
    year: '2026',
    status: 'active',
    role: 'Design & engineering',
    stack: ['Dart', 'Flutter', 'Local inference', 'REST + streaming'],
    summary:
      'A router that decides where each request should run — on-device, on a LAN box, or in the cloud — and reports why it made that call.',
    problem:
      'Running a model on your own machine means choosing a model, a runtime, a quantisation and a port, and doing it again for the next model. Most people give up at step two and send everything to a hosted API, paying for tokens they could have run for free.',
    mechanism: [
      'A catalogue of locally available models, each with its own capability profile: parameter count, quantisation, context window, measured tokens per second on the current hardware.',
      'A request is scored against those profiles plus current load and remaining memory, producing a ranked set of targets with the deciding factors attached.',
      'The winning target is executed; a fallback chain is held behind it so a failure mid-stream re-routes instead of surfacing an error.',
      'Every decision is written to a log the user can read, with the profile snapshot that produced it.',
    ],
    built: [
      'A Flutter client that runs the catalogue and the scoring on-device.',
      'A local inference layer with per-model adapters, so a new runtime does not require a new UI.',
      'A decision log that records the score, the candidates it beat, and the reason, per request.',
      'A cloud path used only when no local target clears the bar, and always labelled as such in the log.',
    ],
    openSource: true,
    repoUrl: 'https://github.com/itsmesujan/DevPilot',
    cover: '/media/cover-devpilot.jpg',
    coverAlt:
      'Abstract dark render of many thin routing lines converging on one bright node',
    accent: [1, 0.42, 0.16],
    form: 'lattice',
  },
  {
    slug: 'agent-x',
    name: 'Agent-X',
    kicker: 'Self-healing DAG',
    year: '2026',
    status: 'active',
    role: 'Design & engineering',
    stack: ['Python', 'Async DAG runtime', 'LLM tool calls'],
    summary:
      'A mission graph that re-plans itself. When a step fails, the graph rewrites the route to the goal instead of returning an error.',
    problem:
      'Multi-step agent runs fail in the middle. A static plan has no answer for "step 4 blew up" other than aborting, and the work already done is lost with the run.',
    mechanism: [
      'A mission is a directed acyclic graph of typed steps with declared dependencies, not a linear script.',
      'Each step returns a structured result including an error taxonomy, not just an exception.',
      'On failure the graph is inspected at the failure site: dependent nodes are quarantined, a re-plan is generated over the surviving subgraph, and the new route is diffed against the old one before it is allowed to run.',
      'Every re-plan is recorded, so a run can be replayed against the exact plan sequence that produced it.',
    ],
    built: [
      'An async DAG executor with dependency resolution and cancellation propagation.',
      'A structured failure taxonomy that separates retryable, replanable and fatal conditions.',
      'A re-planner that proposes a new subgraph and emits the diff before execution.',
      'A replay log capturing the plan, each re-plan, and each step result.',
    ],
    openSource: true,
    repoUrl: 'https://github.com/itsmesujan/Agent-X',
    cover: '/media/cover-agentx.jpg',
    coverAlt:
      'Abstract dark render of concentric fracture rings healing along bright seams',
    accent: [1, 0.3, 0.1],
    form: 'rings',
  },
  {
    slug: 'kotoba-x',
    name: 'Kotoba-X',
    kicker: 'Language tooling',
    year: '2026',
    status: 'active',
    role: 'Design & engineering',
    stack: ['Python', 'LLM evaluation', 'CLI'],
    summary:
      'A harness for testing whether a change actually improved a language workflow, rather than whether the output still looked plausible.',
    problem:
      'Prompt changes are usually judged by reading two answers side by side. That tells you which one you prefer, not which one is more correct, and it does not survive a model upgrade.',
    mechanism: [
      'A task is a set of inputs with checkable properties, not a reference answer to match.',
      'Runs are batched across configurations and scored by property, so two prompt versions are compared on the same axes.',
      'Regressions are reported per property per input, which points at the change that caused them.',
    ],
    built: [
      'A task format with property-based checks per input.',
      'A batch runner that evaluates multiple configurations against one task set.',
      'A diff report at the level of individual properties and inputs.',
    ],
    openSource: true,
    repoUrl: 'https://github.com/itsmesujan/kotoba-X',
    cover: '/media/cover-kotobax.jpg',
    coverAlt:
      'Abstract dark render of layered translucent glass slabs compressing into a void',
    accent: [0.95, 0.55, 0.2],
    form: 'slabs',
  },
  {
    slug: 'modelmesh',
    name: 'ModelMesh',
    kicker: '3D for the web',
    year: '2025',
    status: 'shipped',
    role: 'Design & engineering',
    stack: ['TypeScript', 'Three.js', 'WebGL', 'GLSL'],
    summary:
      'A mesh inspection tool for real-time web scenes: draw-call budget, material cost and texture weight, visible while the scene runs.',
    problem:
      'Real-time scenes usually get tuned by guesswork. The three numbers that decide whether a scene holds its frame budget — draw calls, material complexity and texture memory — are usually the three you cannot see while it is running.',
    mechanism: [
      'The scene graph is instrumented at runtime rather than analysed offline, so what is measured is what is actually on screen.',
      'Draw calls are grouped by geometry and material, exposing exactly which meshes are paying for the frame.',
      'Texture weight is read from the real GPU-side allocation, including compressed formats.',
    ],
    built: [
      'A runtime inspector overlay reporting draw calls, triangles and material count per frame.',
      'A mesh ranking view that sorts the scene by cost so the expensive objects are obvious.',
      'A capture mode that exports the current frame with the numbers burned in, for review and for bug reports.',
    ],
    openSource: true,
    repoUrl: 'https://github.com/itsmesujan/ModelMesh',
    cover: '/media/cover-modelmesh.jpg',
    coverAlt:
      'Abstract dark render of a glowing wireframe mesh with a few faces filled black',
    accent: [0.9, 0.7, 0.35],
    form: 'mesh',
  },
  {
    slug: 'universal-ai-filmmaker',
    name: 'Universal AI Filmmaker',
    kicker: 'Agent skill',
    year: '2026',
    status: 'shipped',
    role: 'Design & engineering',
    stack: ['Python', 'Agent skill', 'Image / video / audio models', 'FFmpeg'],
    summary:
      'A reusable agent skill that carries a film from script to finished cut across whichever image, video and audio models are available.',
    problem:
      'Making a short film with generated media means juggling several vendors by hand at every stage, and the continuity between shots is the hard part. The tooling is not the scarce resource; carrying a look from shot to shot is.',
    mechanism: [
      'The skill decomposes a script into shots, then into the exact media call each shot needs.',
      'Look is carried by a persistent set of reference assets and per-shot constraints, so later shots inherit the established palette, lens and grade.',
      'Assembly and rendering are scripted, so a change to one shot re-renders only what depends on it.',
    ],
    built: [
      'Shot decomposition from a script, with per-shot media specifications.',
      'A continuity layer holding reference assets and constraints across a whole production.',
      'A render pass that re-runs only the affected shots and re-assembles the cut.',
    ],
    openSource: true,
    repoUrl: 'https://github.com/itsmesujan/universal-ai-filmmaker',
    cover: '/media/cover-filmmaker.jpg',
    coverAlt:
      'Abstract dark render of a film strip dissolving into a cloud of light particles',
    accent: [1, 0.55, 0.12],
    form: 'frames',
  },
  {
    slug: 'nexgen-ai-studio',
    name: 'NexGen AI Studio',
    kicker: 'Studio site',
    year: '2025',
    status: 'shipped',
    role: 'Design & engineering',
    stack: ['TypeScript', 'React', 'Animation', 'WebAudio'],
    summary:
      'The first public site: a studio identity built as a rendered environment rather than a set of pages.',
    problem:
      'A studio site made of static pages cannot show that the studio can build motion. The site had to be the proof.',
    mechanism: [
      'The landing page is a single continuous scene rather than a stack of sections.',
      'Motion carries the brand; the type is choreographed against the scene rather than placed on top of it.',
      'Everything degrades to a readable, static composition without the renderer.',
    ],
    built: [
      'A single-scene landing experience with choreographed type and audio-reactive elements.',
      'A full static fallback with the complete written content.',
      'A responsive pass that reflows the scene instead of scaling it.',
    ],
    openSource: true,
    repoUrl: 'https://github.com/itsmesujan/NexGen_AI_Studio',
    cover: '/media/cover-nexgen.jpg',
    coverAlt:
      'Abstract dark render of floating etched glass panels in a loose grid, one lit orange',
    accent: [1, 0.35, 0.14],
    form: 'panels',
  },
]

export const projectBySlug = (slug: string) =>
  PROJECTS.find((p) => p.slug === slug)

/* ---------------------------------------------------------------- about -- */

export const STACK = [
  {
    group: 'Interface',
    items: ['TypeScript', 'React', 'Vite', 'Next.js', 'CSS architecture', 'Design systems'],
  },
  {
    group: 'Real-time 3D',
    items: ['Three.js', 'React Three Fiber', 'GLSL', 'GSAP', 'Scroll choreography', 'Draco / KTX2 budgets'],
  },
  {
    group: 'AI systems',
    items: ['Agent orchestration', 'DAG runtimes', 'Model routing', 'Local inference', 'Evaluation harnesses'],
  },
  {
    group: 'Shipping',
    items: ['Playwright', 'Lighthouse budgets', 'CI typecheck + lint', 'Accessible interaction', 'Structured data'],
  },
]

export const PRINCIPLES = [
  {
    title: 'Show the mechanism',
    body: 'An interface claims a capability. Showing the mechanism that produces it removes the need to claim. Every project page here explains how the thing works, not how it looks.',
  },
  {
    title: 'Real numbers, or none',
    body: 'A latency figure or a token count is worth stating when it was measured, and worth omitting when it was not. Invented metrics are worse than an empty field, because they are unverifiable.',
  },
  {
    title: 'The fallback is part of the design',
    body: 'Reduced motion, a failed renderer, a slow phone, a keyboard. These are ordinary conditions, not edge cases, so the static composition is designed at the same time as the animated one.',
  },
  {
    title: 'Depth carries meaning',
    body: 'A 3D scene earns its frame budget by showing something a flat layout could not: a route, a structure, a change of state. If the third dimension adds nothing, it is deleted.',
  },
]

/* ----------------------------------------------------------------- site -- */

export const SITE = {
  name: 'itsmesujan',
  person: 'Sujan Majhi',
  role: 'AI-native builder',
  location: 'Japan',
  email: 'hello@itsmesujan.me',
  github: 'https://github.com/itsmesujan',
  description:
    'Agent systems, model routing and real-time 3D interfaces — built to be inspected, not just admired.',
} as const

export const NAV = [
  { label: 'Work', to: '/work' },
  { label: 'Lab', to: '/lab' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
] as const

export const LAB_EXPERIMENTS = [
  {
    id: 'attractor',
    title: 'Attractor',
    kind: 'GLSL',
    line: 'A single fragment shader. The pattern is iterated, not authored, and the parameter that controls it is the one thing on the page you can move.',
    cost: 'One full-screen pass',
  },
  {
    id: 'deform',
    title: 'Deform',
    kind: 'Scroll-linked',
    line: 'Geometry displaced by scroll position along a noise field, so the same surface resolves differently as you move through it.',
    cost: '1 mesh, 1 uniform',
  },
  {
    id: 'strata',
    title: 'Strata',
    kind: 'Instanced',
    line: 'Ten thousand instanced slabs in one draw call, with per-instance colour and a cull that follows the camera path.',
    cost: '1 draw call',
  },
  {
    id: 'volume',
    title: 'Volume',
    kind: 'Raymarch',
    line: 'A distance field marched in a fragment shader. No geometry, no textures, one pass and a real material response.',
    cost: 'No geometry',
  },
] as const
