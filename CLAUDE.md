# CLAUDE.md — Are-Self UI

This file is the single source of truth for any AI agent working on the are-self-ui codebase.
Read it completely before making any changes. Every prompt, every session, every fix starts here.

## What This Is

A React + Vite + TypeScript frontend for **Are-Self**, an open-source AI reasoning engine with a
neurologically-inspired architecture. Every UI component maps to a brain region. The backend is
Django REST Framework (repo: `talos`). The frontend consumes the DRF API.

**Mission:** Empower underprivileged youth in remote areas with free access to AI technology.
MIT licensed. The interface must be approachable, intuitive, and beautiful.

## The Complete App Flow

This is how Are-Self works end-to-end. Every UI view exists to support this lifecycle.
If you don't understand this flow, you will build the wrong thing.

### 1. Identity Creation → `/identity`
The user creates an **Identity** — a persistent AI persona. An identity has a system prompt
template, enabled tools (M2M to ToolDefinition), addon phases (IDENTIFY, CONTEXT, HISTORY,
TERMINAL) that layer context during prompt assembly, and a **Hypothalamus AIModelSelectionFilter**
that determines which LLM backs this persona. The Identity is a blueprint — it doesn't do
work until it's forged into a disc.

### 2. Model Configuration → `/hypothalamus`
The **Hypothalamus** manages AI models. The user configures which models are available, sets
budget constraints, circuit breakers, and failover strategies. The AIModelSelectionFilter on
each Identity determines model routing: vector-similarity matching between identity embeddings
and model catalog embeddings, cost filters, provider preferences. Without this configured, an
identity can't reason.

### 3. Iteration Setup → `/temporal`
The user creates an **Iteration** from a blueprint (e.g., "Standard Agile Sprint") tied to a
specific **Environment**. The iteration has **Shifts** (Sifting → Pre-Planning → Planning →
Executing → Post-Execution). Each shift has a turn limit.

The user drags Identities from the roster into shift columns. This **forges** the Identity into
an **IdentityDisc** — a deployed instance scoped to this iteration, with its own level, XP, and
session history. The disc is the worker.

**Two-phase UI flow:**
- Phase 1: Left panel shows iteration list. Center shows gestation chamber (select environment +
  blueprint to create) or the selected iteration's shift matrix.
- Phase 2: When an iteration is selected, left panel switches to IdentityRoster for drag-and-drop
  assignment of identities into shift columns.

`TemporalMatrix.tsx` manages both phases internally with its own layout. Do NOT wrap it in
ThreePanel — it handles its own sidebar and main area.

### 4. Task Assignment → `/pfc`
The **Prefrontal Cortex** is the project manager. Epics → Stories → Tasks. Tasks get assigned to
IdentityDiscs. The PFC decides who works on what during which shift. This is a kanban board with
drag-and-drop, status columns, and an inspector for ticket detail.

### 5. The Tick Cycle (Automated Execution)
The **PNS** (Peripheral Nervous System) ticks via Celery Beat (the heartbeat). That tick:

1. Wakes the **Temporal Lobe**, which checks the current iteration's active shift.
2. The Temporal Lobe fires a **SpikeTrain** through the **CNS** (Central Nervous System).
   A SpikeTrain is a running instance of a **NeuralPathway** — the execution graph.
3. **Spikes** cascade through **Neurons** in the graph. Each spike executes an **Effector**
   (the action). The **provenance** chain tracks which spike triggered which.
4. One spike reaches the **Frontal Lobe**, which starts a **ReasoningSession**: it takes the
   IdentityDisc + PFC Task + system prompt + addons and runs the `while True` reasoning loop.
5. The reasoning loop calls tools via the **Parietal Lobe** (MCP gateway), stores memories via
   the **Hippocampus**, and selects models via the **Hypothalamus**.
6. When the session concludes (`mcp_done`) or yields (`mcp_respond_to_user` with
   `yield_turn=True`), control returns up the spike chain.

### 6. Monitoring (What the UI Shows)

| Route | What it shows | What it answers |
|-------|--------------|-----------------|
| `/cns` | Pathway dashboard with sparkline cards | "Which pathways are healthy?" |
| `/cns/pathway/:pathwayId` | Train timeline with spike bars | "What happened recently?" |
| `/cns/monitor/:pathwayId/:trainId` | Live graph with spike overlay | "How is this execution flowing?" |
| `/cns/spike/:spikeId` | Dual-terminal log forensics | "What exactly did this spike do?" |
| `/frontal` | Session list | "What reasoning sessions exist?" |
| `/frontal/:sessionId` | 3D graph OR chat view | "What did this session think/do?" |
| `/pfc` | Agile board | "What's assigned? What's in progress?" |
| `/temporal` | Iteration matrix | "Who's working in which shift?" |
| `/pns` | Fleet status | "What's ticking? What terminals are alive?" |

### 7. Memory & Learning
The **Hippocampus** stores **Engrams** — vector-embedded facts (pgvector, 768-dim,
nomic-embed-text). 90% cosine similarity dedup on save. Sessions produce engrams; future
sessions retrieve relevant engrams during the HISTORY addon phase. The user can browse, edit,
and search engrams at `/hippocampus`.

## The URL Is the Single Source of Truth

**Every user action that changes what you're looking at MUST change the URL.** This is
non-negotiable. If clicking something doesn't update the URL, it's a bug. The URL must be
bookmarkable, refreshable, and shareable. Pressing F5 must return you to exactly where you were.

This means:
- Clicking a pathway card → navigates to `/cns/pathway/:pathwayId`
- Clicking a spike bar segment → navigates to `/cns/spike/:spikeId`
- Clicking a train header → navigates to `/cns/monitor/:pathwayId/:trainId`
- Selecting an iteration → mangles the URL (e.g., `/temporal/:iterationId` or query param)
- Selecting a session → navigates to `/frontal/:sessionId`
- Selecting an identity disc → navigates to `/identity/:discId`
- Clicking a PFC ticket → could use URL or local state (inspector is a side panel, not a page)

**ESC walks backward through the URL chain.** Each ESC pops one segment. The `GABAProvider`
escape handler system manages this. ESC from `/cns/spike/:id` → `/cns/pathway/:pathwayId` →
`/cns` → `/`.

**Breadcrumbs reflect the URL.** The `NavBar` builds breadcrumbs from `useLocation().pathname`.
Dynamic segments (UUIDs) are resolved to human-readable names via `BreadcrumbProvider` context.
Structural segments like "spike", "pathway", "edit", "monitor" are skipped in the display.

## Environment Is Global Context

The **Environment** selector lives in the NavBar and filters EVERYTHING downstream:
- Which pathways appear on the CNS dashboard
- Which spike trains appear in timelines
- Which iterations appear in the Temporal Lobe
- Which tasks appear in the PFC
- Which sessions appear in the Frontal Lobe

The `EnvironmentProvider` context (`src/context/EnvironmentProvider.tsx`) manages this state.
All views consume `useEnvironment()` and pass the selected environment ID to their API calls.

## Architecture

### Layout
- `LayoutShell.tsx` is the root layout: 3D background + `NavBar` + `<Outlet />`.
- `NavBar.tsx` is the persistent 40px top bar: hamburger, logo, breadcrumbs, environment selector.
- `ThreePanel.tsx` is the layout primitive for most lobe pages (left/center/right columns).
- Some views manage their own layout (TemporalMatrix, CNSSpikeForensics) and render directly
  into the Outlet without ThreePanel.
- State lives in the PAGE component, not in the shell or ThreePanel.

### Three-Panel Convention
- **Left = Control Panel.** Navigation within the lobe. Drives what the center shows.
- **Center = Stage.** The primary view (3D graph, matrix, editor, board, terminals).
- **Right = Inspector.** Empty until something on stage is clicked. Fills with detail.

### Data Flow
- The frontend adapts to the API, NOT the reverse. Never modify backend serializers for the UI.
- All API calls use relative paths through `apiFetch` (`src/api.ts`). The Vite dev proxy routes
  `/api/*` and `/ws/*` to `http://127.0.0.1:8000`. **Never hardcode 127.0.0.1 URLs.**

### Real-Time (Synaptic Cleft)
- `SynapticCleft.tsx` is the WebSocket provider. Typed neurotransmitter events.
- `useDendrite(receptorClass, dendriteId)` subscribes to events. Use instead of polling.
- Neurotransmitter types: Dopamine (success), Cortisol (error/halt), Acetylcholine (data sync),
  Glutamate (log streaming).
- **Never use `setInterval` polling.** Always use `useDendrite` with a manual refresh fallback.

## Style Rules (Non-Negotiable)

### No Inline Styles
Every style lives in a `.css` file. No `style={{}}` props. The ONLY exceptions:
- Dynamically computed positions (e.g., graph node coordinates from 3D projection).
- CSS custom property injection (e.g., `style={{ '--accent': color }}`).
- `flexGrow` proportional to data values (e.g., spike bar segments).

### No Tailwind Mixed with CSS Files
The project uses `.css` files. Do not add Tailwind utility classes to components.

### Semantic CSS Class Names
`{component}-{element}` convention. Examples: `cns-spike-segment--success`,
`sidebar-session-card`, `inspector-badge--turn`. NEVER auto-generated names.

### Biological Naming
User-facing text uses biological metaphors. No "Mission Control", "Command Center", "Spellbook".
- "Neural Pathways" not "Spellbooks"
- "Spike Trains" not "Missions"
- "Cognitive Threads" not "Reasoning Sessions" (in UI labels)

### Component File Structure
```
src/
  components/    → Reusable components (ThreePanel, NavBar, CNSSparkline, etc.)
  pages/         → Route-level page components (FrontalSession, CNSPage, PFCPage, etc.)
  hooks/         → Custom hooks (useTerminal, useSynapticCleft, useDuration, etc.)
  context/       → React contexts (GABAProvider, BreadcrumbProvider, EnvironmentProvider)
```
Each component gets a `.tsx` and a `.css` file.

### Imports
React/stdlib first, then third-party, then project imports. Alphabetical within each group.

## Common Pitfalls (Things That Have Broken Before)

### Flex Height Chain
Every flex container from `layout-shell` down to the panels MUST have `min-height: 0`.
Without it, flex items default to `min-height: auto` (content height) and panels overflow
the viewport instead of scrolling.

### pointer-events: none Inheritance
`layout-ui` has `pointer-events: none` so clicks pass through to the 3D background on the
root route. Every view that renders into the Outlet MUST set `pointer-events: auto` on its
root element. `ThreePanel` does this automatically. Custom layouts (TemporalMatrix,
CNSSpikeForensics) must do it themselves. **If buttons aren't clickable or terminals don't
respond to mouse, check the pointer-events chain.**

### xterm.js
- **MUST import `xterm/css/xterm.css`** in any component that renders a terminal.
- **MUST defer `terminal.open(container)` until the container has non-zero dimensions.** Use a
  `ResizeObserver` to wait for layout.

### BackgroundCanvas
- On non-root routes, `interactive={false}` disables OrbitControls and pointer events.
- Without this, the canvas steals scroll and click events from every panel.

### TemporalMatrix Owns Its Layout
`TemporalMatrix.tsx` has its own internal `.temporal-matrix-layout` with sidebar and main area.
It manages a two-phase flow (iteration list → identity roster) internally. Do NOT wrap it in
ThreePanel. Render it directly as the Outlet content.

### PFC Inspector Scroll
The PFC inspector must NOT be a flex-constrained scroll container. Set `.pfc-inspector` and
`.pfc-inspector-body` to `flex: none; overflow: visible` — let the right panel (ThreePanel)
be the scroll container. Otherwise textareas and accordion content get squished.

### API Response Shapes
- `ReasoningTurn` has nested `model_usage_record`. Tokens/timing/thoughts are inside
  `response_payload.choices[0].message`, not flat on the turn.
- `SpikeTrain` has nested `spikes` array.
- `Spike` has `neuron` FK, `effector` FK, `provenance` FK (parent spike), `application_log`,
  `execution_log`, `result_code`, `target_hostname`.
- Always hit the endpoint in browser to verify field names before assuming.

## Dependencies
- `react-force-graph-3d` + `three` — 3D force graph (Frontal Lobe).
- `reactflow` — Graph editor (CNS Neural Pathway editing).
- `@assistant-ui/react` — Chat UI (Thalamus and Session chat).
- `d3` — Sparkline charts (CNS pathway dashboard).
- `xterm` + `xterm-addon-fit` + `xterm-addon-search` — Terminal emulator (spike logs).
- `@react-three/fiber` + `@react-three/drei` — 3D background canvas.
- `lucide-react` — Icons.

## What NOT to Do
- Do not modify backend serializers to fix frontend display issues.
- Do not add global state management (Redux, Zustand). Use local state + context.
- Do not add new CSS frameworks or utility-class libraries.
- Do not use `useEffect` to sync URL state. React Router handles routing.
- Do not put state in LayoutShell or ThreePanel. State lives in page components.
- Do not wrap TemporalMatrix in ThreePanel.
- Do not use `setInterval` for data refresh. Use `useDendrite`.
- Do not introduce auto-generated CSS class names.