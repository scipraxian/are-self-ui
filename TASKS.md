# Are-Self UI — Task List

Current state of the React frontend. Updated 2026-03-30.

## Completed Work

### Step 1 — Layout Shell & Routing ✅
Decomposed BloodBrainBarrier God Component. Nested React Router. ThreePanel layout primitive.

### Step 2 — Frontal Lobe Data Fix ✅
types.ts updated for nested model_usage_record. Inspector shows real data. CSS classes renamed.

### Step 3 — PFC Agile Board ✅
Inspector scroll. Card blink fix. PFCNavTree. Expand/collapse toggle. CSS classes renamed.

### Step 4 — CNS Overview Rebuild ✅
CNSTrainList with expandable rows. CNSSpikeDetail right panel. Dead code deleted.

### Step 5 — Layout Height Fix ✅
100vh constraint. min-height: 0 on flex chain. flex-shrink: 0 on train rows.

### Step 6a — CNS Pathway Dashboard ✅
Responsive card grid with D3 sparklines. CNSDashboardSidebar with search, tags, starred.
Zero-run cards hidden.

### Step 6b — CNS Train Timeline ✅
Spike bars with proportional segments. Train sidebar with stats. Begin Play filtered.

### Step 6d — CNS Spike Forensics ✅
Dual terminal view. CNSTerminalPane with xterm.js + toolbar (copy/download/search/autoscroll).

### Step 7 — Unified Navigation Bar ✅
NavBar with breadcrumbs + environment selector. BreadcrumbProvider context. document.title updates.

### Step 8 — Bug Fixes ✅
Background canvas pointer capture fixed. Temporal left panel restored. Identity views confirmed.
PFC scroll arrows confirmed. xterm.css import confirmed.

### Step 9 — Environment Wiring + Multi-Fix ✅
Global EnvironmentProvider context. NavBar consumes it. CNS dashboard/timeline filter by env.
Temporal two-phase flow restored (TemporalMatrix renders directly, no ThreePanel wrapper).
Spike forensics pointer-events fixed. Breadcrumb nuclear rewrite (explicit setCrumbs per page).

### Step 10 — CNS Live Execution Graph ✅
NeuronMonitorNode with 5 visual states (unrun/running/success/failed/pending). Ghost-to-color
overlay. Edge traversal animation. Auto-pan toggle. Right panel spike inspector. useDendrite
real-time updates. ReactFlow read-only monitor mode.

### Step 11 — Spike Set + Breadcrumb Fix ✅
SpikeSetProvider context for multi-spike selection. SpikeSetBar below navbar with chips.
Shift+click on spike bars and monitor nodes adds to set. CNSSpikeSet page with CSS grid
terminal layout. Breadcrumbs rewritten: each page sets explicit crumb chain via setCrumbs.
Sub-graph drill via double-click on monitor nodes.

### Step 12 — CNS Route Restructure ✅
URL-as-truth enforcement. /cns/edit/:pathwayId → /cns/pathway/:pathwayId/edit.
/cns/monitor/:pathwayId → /cns/spiketrain/:spiketrainId. Train dropdown removed from monitor
sidebar (train IS the URL). All navigation links updated. SpikeSet compare button fixed
(Lucide icon). Full breadcrumb chains with train→pathway lookup.

### Step 13 — Environment Editor + Selector Fix ✅
EnvironmentProvider upgraded: selectEnvironment() calls POST /select/ on backend, auto-detects
active environment on load, refreshEnvironments() for mutations. NavBar uses selectEnvironment.
Full CRUD EnvironmentEditor page at /environments: environment list, detail editor with
auto-save on blur, context variable table with inline editing/add/delete, Set as Active button,
new/delete environment actions.

### Step 14 — Frontal Session Chat + Thalamus Bubble ✅
Graph/Chat mode toggle on FrontalSession: tab bar switches between ReasoningGraph3D and
SessionChat. ThalamusBubble: floating chat icon (bottom-right, every page) expands to 400×500
glassmorphic panel with ThalamusChat. ThalamusChat cleaned: hardcoded URLs removed, Tailwind
classes moved to CSS.

### Backend Fix — V2 SpikeTrainViewSet Filter ✅
V2 viewset was missing filter_backends and filterset_class. Added DjangoFilterBackend +
SpikeTrainFilter. ?pathway= filtering now works correctly.

### Backend Fix — Spike Serializer ✅
SpikeSerializer now includes spike_train field. Enables breadcrumb chain: spike → train → pathway.

### Backend Fix — Spike Provenance Fields ✅
SpikeSerializer now includes: invoked_pathway, child_trains, provenance, provenance_train.
Enables sub-graph drill-through and parent context navigation.

### Manual Fixes ✅
- xterm.css import added to CNSTerminalPane
- flex-shrink: 0 on .cns-train-row
- PFC inspector: flex: none + overflow: visible on .pfc-inspector and .pfc-inspector-body
- V2 SpikeViewSet missing filter configuration (backend, not frontend parameter naming)
- types.ts: Spike/SpikeTrain IDs changed to string (UUIDs), all new API fields added, `any`
  types replaced with proper interfaces
- CNSMonitorPage: removed all `any` types, proper ReactFlow node typing, ESLint-compliant
  data fetching pattern (async inside effect, dendrite events as deps)
- Sub-graph drill passes parent context via React Router navigation state for breadcrumbs
- SessionChat endpoint fixed: /resume/ not /interact/, body key: reply not message
- Backend environment endpoints added: context-variables, context-keys, environment-types,
  environment-statuses (all CRUD)

## Known Bugs (Current)

- [ ] **Spike Set terminals empty.** The Spike Set view fetches data (network calls visible)
  but xterm terminals don't render content. Likely the same ResizeObserver/xterm init issue
  or a missing xterm.css import in the Spike Set page context.

- [ ] **Sub-graph drill not working in monitor.** Double-clicking a neuron with
  `invoked_pathway_id` should navigate to `/cns/spiketrain/` for a child train, but the child
  train ID isn't available from just the pathway. Needs to find the child SpikeTrain that was
  spawned from the parent spike (via `parent_spike` FK on SpikeTrain model).

- [ ] **Breadcrumbs still incomplete on some views.** The CLAUDE.md route table still references
  old `/cns/monitor/:pathwayId/:trainId` format — needs to match actual routes.

## P0 — Immediate Priorities

- [ ] **Fix Spike Set terminal rendering.** Either xterm.css missing, ResizeObserver not firing,
  or pointer-events blocking.

- [ ] **Fix sub-graph drill on monitor.** When a neuron has `invoked_pathway_id`, find the child
  SpikeTrain spawned by that spike (SpikeTrain.parent_spike FK) and navigate to
  `/cns/spiketrain/:childTrainId`.

- [ ] **Frontal Lobe Session Chat toggle.** Two modes for `/frontal/:sessionId`: Graph Mode
  (current 3D force graph) and Chat Mode (SessionChat takes over center stage). Toggle via
  tab bar. Re-integrate ThalamusChat as floating bubble or navbar action.

## P1 — Remaining Lobe Views

### Hypothalamus (`/hypothalamus`)
AI Model management. Backend API: `/api/v2/ai-models/`, `/api/v2/model-providers/`,
`/api/v2/usage-records/`, `/api/v2/model-ratings/`. Model catalog, circuit breakers, cost
tracking, ELO ratings, selection configuration.

### Hippocampus (`/hippocampus`)
Engram browser/editor. Backend API: `/api/v2/engrams/`, `/api/v2/engram_tags/`. Search,
vector similarity visualization, tag filtering, timeline view, create/edit.

### PNS Fleet (`/pns`)
Expand beyond heartbeat: neural terminal registry, Celery workers, telemetry, process
launch/kill. APIs: `/api/v2/nerve_terminal_registry/`, `/api/v2/nerve_terminal_telemetry/`.

### Temporal Lobe (`/temporal`)
Working but needs URL-driven iteration selection (`/temporal/:iterationId` or query param).
Currently iteration selection is internal state — lost on refresh.

### Identity Ledger (`/identity`)
Working stubs. Needs proper detail view with full disc configuration editing.

## P2 — WebSocket & Real-Time

- [ ] Replace polling in ReasoningGraph3D with useDendrite.
- [ ] Verify CNS dashboard real-time with live execution.
- [ ] Environment filtering on all views (temporal, PFC, frontal, identity).

## P3 — Visual & UX

- [ ] Brain mesh 3D background using FBX assets (PreFrontal, Hippo, CNS, Parietal, Pons,
  Occipital, Hypothalamus, Peripheral, Reptilian — left and right hemispheres).
- [ ] Consistent glassmorphic styling audit across all views.
- [ ] UI Style Guide document.

## URL Structure (Current After Step 12)

```
/                                   → BrainView (3D landing)
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
/environments                       → EnvironmentEditor (CRUD + context variables)
```
