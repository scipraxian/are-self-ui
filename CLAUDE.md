# CLAUDE.md — Are-Self UI

The single source of truth for any AI agent working on the are-self-ui codebase.
Read completely before making any changes.

## The Developer

Michael is a 30+ year programming veteran building Are-Self as an MIT-licensed AI reasoning
engine. The project's mission is providing free AI technology to underserved youth, with
academic interest from MIT and a PhD student collaborator at UPA. Michael has exceptional
product instincts and will actively correct architectural drift. He values ergonomics over
cleverness, biological naming over mechanical metaphors, and URL-driven navigation above all.

**Workflow:** Claude (this project) for planning and architecture → Claude Code for
implementation via self-contained prompts. Each Claude Code session gets a fresh prompt with
all necessary context. The CLAUDE.md file is read first by Claude Code every session.

## What This Is

A React + Vite + TypeScript frontend for **Are-Self**, an open-source AI reasoning engine with
neurologically-inspired architecture. Every UI component maps to a brain region. The backend is
Django REST Framework (repo: `talos`, private under `scipraxian` on GitHub). The frontend
consumes the DRF API.

**Mission:** Empower underprivileged youth in remote areas with free access to AI technology.
MIT licensed. The interface must be approachable, intuitive, and beautiful.

## The Complete App Flow

Every UI view exists to support this lifecycle. Build the wrong flow, build the wrong thing.

### 1. Identity Creation → `/identity`
The user creates an **Identity** — a persistent AI persona with system prompt template, enabled
tools (M2M to ToolDefinition), addon phases (IDENTIFY, CONTEXT, HISTORY, TERMINAL), and a
**Hypothalamus AIModelSelectionFilter** for LLM routing. The Identity is a blueprint — it
doesn't work until forged into a disc.

### 2. Model Configuration → `/hypothalamus`
The **Hypothalamus** manages AI models: catalog, budget constraints, circuit breakers, failover
strategies. The AIModelSelectionFilter on each Identity determines model routing via
vector-similarity matching, cost filters, provider preferences.

### 3. Iteration Setup → `/temporal`
The user creates an **Iteration** from a blueprint tied to an **Environment**. Iterations have
**Shifts** (Sifting → Pre-Planning → Planning → Executing → Post-Execution) with turn limits.
Dragging Identities into shift columns **forges** them into **IdentityDiscs** — deployed
instances with their own level, XP, and session history.

`TemporalMatrix.tsx` manages its own two-phase layout internally (iteration list → identity
roster). Do NOT wrap it in ThreePanel.

### 4. Task Assignment → `/pfc`
The **Prefrontal Cortex** is the project manager. Epics → Stories → Tasks assigned to
IdentityDiscs. Kanban board with drag-and-drop, status columns, inspector for ticket detail.

### 5. The Tick Cycle (PNS → Temporal → CNS → Frontal)
The **PNS** ticks via Celery Beat → wakes **Temporal Lobe** → fires a **SpikeTrain** through
the **CNS** → **Spikes** cascade through **Neurons** → reaches the **Frontal Lobe** → starts
a **ReasoningSession** with the IdentityDisc + PFC Task → reasoning loop calls tools via
**Parietal Lobe**, stores memories via **Hippocampus**, selects models via **Hypothalamus** →
session concludes or yields → control returns up the spike chain.

### 6. Monitoring

| Route | View | Question Answered |
|-------|------|-------------------|
| `/cns` | Pathway dashboard (sparkline cards) | "Which pathways are healthy?" |
| `/cns/pathway/:pathwayId` | Train timeline (spike bars) | "What happened recently?" |
| `/cns/spiketrain/:spiketrainId` | Live graph (spike overlay on ReactFlow) | "How is this execution flowing?" |
| `/cns/spike/:spikeId` | Dual-terminal forensics | "What exactly did this spike do?" |
| `/cns/spikeset?s1=&s2=` | Multi-spike comparison | "How do these streams compare?" |
| `/frontal` | Session list | "What sessions exist?" |
| `/frontal/:sessionId` | 3D graph or chat view | "What did this session think/do?" |
| `/pfc` | Agile board | "What's assigned? In progress?" |
| `/temporal` | Iteration matrix | "Who's in which shift?" |
| `/pns` | Fleet status | "What's ticking?" |

### 7. Memory & Learning
The **Hippocampus** stores **Engrams** — vector-embedded facts (pgvector, 768-dim). Sessions
produce engrams; future sessions retrieve them during HISTORY addon phase.

## The URL Is the Single Source of Truth

**Every user action that changes what you're looking at MUST change the URL.** Non-negotiable.
Bookmarkable, refreshable, shareable. F5 returns exactly where you were.

### Current URL Structure (After Step 12)
```
/                                   → BrainView (3D landing, interactive)
/frontal                            → FrontalIndex (session list)
/frontal/:sessionId                 → FrontalSession (3D graph + inspector)
/cns                                → CNSPage (pathway dashboard with sparklines)
/cns/pathway/:pathwayId             → CNSTrainTimeline (spike bars)
/cns/pathway/:pathwayId/edit        → CNSEditPage (ReactFlow graph editor)
/cns/spiketrain/:spiketrainId      → CNSMonitorPage (live execution graph)
/cns/spike/:spikeId                 → CNSSpikeForensics (dual terminal)
/cns/spikeset?s1=uuid&s2=uuid      → CNSSpikeSet (multi-spike comparison)
/pfc                                → PFCPage (agile board)
/temporal                           → TemporalStub (iteration matrix)
/identity                           → IdentityStub
/identity/:discId                   → IdentityDetailStub
/pns                                → PNSStub (heartbeat)
```

### Breadcrumb Chain (Every Segment Clickable)
```
ARE-SELF › Central Nervous System › Pre-Release Run › Train #1661A1 › Pre-Release Build #0D8A52
  /          /cns                    /cns/pathway/uuid  /cns/spiketrain/uuid  /cns/spike/uuid
```

Each page sets its breadcrumbs explicitly via `setCrumbs([{label, path}, ...])` from the
`BreadcrumbProvider` context. NavBar renders what it's given — no URL parsing.

**ESC walks backward** through the URL chain via GABAProvider.

## Environment Is Global Context

The `EnvironmentProvider` context manages environment selection. The selector lives in the
NavBar. All views consume `useEnvironment()` and pass the selected environment ID to API calls.
Changing environment filters pathways, trains, iterations, tasks, sessions — everything.

## Architecture

### Layout
- `LayoutShell.tsx`: 3D background + NavBar + `<Outlet />`
- `NavBar.tsx`: 40px persistent bar — hamburger, logo, breadcrumbs, environment selector
- `ThreePanel.tsx`: Layout primitive for most pages (left/center/right)
- Some views own their layout: TemporalMatrix, CNSSpikeForensics, CNSSpikeSet

### Three-Panel Convention
- **Left** = Control/Navigation. Drives what center shows.
- **Center** = Stage. Primary view.
- **Right** = Inspector. Empty until something is clicked.

### Data Flow
- Frontend adapts to API, never the reverse.
- All API calls via `apiFetch` with relative paths. Vite proxy handles base URL.
- **Never hardcode 127.0.0.1.**

### Real-Time (Synaptic Cleft)
- `useDendrite(receptorClass, dendriteId)` for event subscriptions. **Never use setInterval.**
- Neurotransmitters: Dopamine (success), Cortisol (error), Acetylcholine (sync), Glutamate (streaming)

## Style Rules (Non-Negotiable)

- **No inline styles.** CSS files only. Exceptions: dynamic positions, CSS custom properties, flexGrow from data.
- **No Tailwind mixed with CSS files.** Project uses `.css` files.
- **Semantic CSS class names.** `{component}-{element}` convention. Never auto-generated.
- **Biological naming.** No "Mission Control", "Battle Station", "Spellbook", or military jargon.
- **Component structure:** `.tsx` + `.css` per component. Pages in `src/pages/`, components in `src/components/`, hooks in `src/hooks/`, contexts in `src/context/`.
- **Imports:** React/stdlib → third-party → project. Alphabetical within groups.

## Common Pitfalls

### Flex Height Chain
Every flex container from `layout-shell` to panels MUST have `min-height: 0`. Without it,
panels overflow viewport instead of scrolling.

### pointer-events: none Inheritance
`layout-ui` has `pointer-events: none`. Every view rendering into Outlet MUST set
`pointer-events: auto` on its root. ThreePanel does this automatically. Custom layouts
(TemporalMatrix, CNSSpikeForensics, CNSSpikeSet) must do it themselves.

### xterm.js
- MUST import `xterm/css/xterm.css`.
- MUST defer `terminal.open()` via ResizeObserver until container has non-zero dimensions.
- Multiple xterm instances on same page need independent container refs.

### BackgroundCanvas
On non-root routes, `interactive={false}` disables OrbitControls and pointer events.

### PFC Inspector Scroll
`.pfc-inspector` and `.pfc-inspector-body`: `flex: none; overflow: visible`. Let ThreePanel's
right panel scroll, not the inspector body.

### API Response Shapes
- `Spike` returns: id, status, status_name, neuron, effector, effector_name, spike_train,
  created, modified, target_hostname, result_code, application_log, execution_log, blackboard.
- `SpikeTrain` has nested `spikes` array, `pathway` FK, `pathway_name`.
- `ReasoningTurn` has nested `model_usage_record` with response_payload deep inside.
- Always verify fields by hitting the endpoint in browser before assuming.

## Dependencies
- `react-force-graph-3d` + `three` — 3D force graph (Frontal Lobe)
- `reactflow` — Graph editor (CNS)
- `@assistant-ui/react` — Chat UI (Thalamus)
- `d3` — Sparkline charts (CNS dashboard)
- `xterm` + `xterm-addon-fit` + `xterm-addon-search` — Terminal emulator
- `@react-three/fiber` + `@react-three/drei` — 3D background
- `lucide-react` — Icons

## What NOT to Do
- Do not modify backend serializers for frontend display issues.
- Do not add Redux/Zustand. Use local state + context.
- Do not add CSS frameworks or utility-class libraries.
- Do not use useEffect to sync URL state. React Router handles routing.
- Do not put state in LayoutShell or ThreePanel.
- Do not wrap TemporalMatrix in ThreePanel.
- Do not use setInterval for data refresh.
- Do not use the word "battle" or military jargon anywhere.
- Do not introduce auto-generated CSS class names.