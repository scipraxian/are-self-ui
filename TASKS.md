# Are-Self UI — Task List

Current state of the React frontend. Updated 2026-03-31.

---

## What's Done

**Layout & Navigation** — LayoutShell, ThreePanel, NavBar with breadcrumbs + environment
selector, BreadcrumbProvider (explicit setCrumbs per page), GABAProvider (ESC navigation),
EnvironmentProvider (global context, server-side selection). All URL-driven, all bookmarkable.
Glassmorphic `.glass-surface` utility class applied to all form containers.

**CNS (Central Nervous System)** — Complete drill chain: pathway dashboard with D3 sparklines
→ train timeline with spike bars (500ms debounced refetch via useDendrite) → live execution
graph (ReactFlow with 5 visual states, ghost-to-color overlay, edge animation) →
dual-terminal forensics (xterm.js) → spike set multi-comparison (xterm grid + correlated
timeline with N-way merge). Sub-graph drill via double-click. SpikeSetProvider for
multi-select with shift+click. Real-time via useDendrite. No polling.

**Frontal Lobe** — Session list, 3D force graph, inspector, Graph/Chat mode toggle,
SessionChat posting to /resume/ with swarm_message_queue injection. All polling replaced
with useDendrite subscriptions (ReasoningSession, ReasoningTurn). No setInterval.

**PFC (Prefrontal Cortex)** — Board/backlog toggle with URL query param filters (status,
priority, epic, assignee). Two-panel layout (stage + optional inspector, no left nav tree).
Single-click → inspector, double-click → full detail page. Epic/story detail drill pages.
Inline create. Filter bar with clear button. Proper flex height chain for column scrolling.

**Temporal Lobe** — Three-panel internal layout: left sidebar (definitions list + iterations
list + gestation chamber), center (shift columns with participants + drag-drop targets),
right (IdentityRoster). Drag from roster → drop into shift column → calls slot_disc
(auto-forges base identities into discs). Remove disc from shift. Definition editor with
add/remove shift columns, turn limit editing, rename, delete. New definitions auto-populate
with all 6 shift types. Incept from definition → creates live iteration. Initiate iteration.
Real-time via useDendrite (no polling). Manages own layout (no ThreePanel).

**Identity** — IdentitySheet with tabbed detail editor: Telemetry (live disc stats, system
prompt template, compiled prompt), Loadout (name, AI model, tools/addons/tags as toggleable
pills showing ALL available items in edit mode), Memories (full engram CRUD via EngramEditor),
Flight Logs (reasoning sessions with click-through to /frontal/{sessionId}). Create new
identity, spawn disc from base, delete with inline confirmation. Save on explicit save button.
AI model dropdown pulls from `/api/v2/ai-models/`.

**Hippocampus** — ThreePanel engram browser at `/hippocampus`. Left: search input + tag
filter chips + active/inactive toggle + count. Center: engram card list with name,
description preview, tags, relevance, creator, date. Right: full inspector with inline
editing (save on blur), tag pill toggles with "+" to create new tags, is_active switch,
provenance links (creator disc, sessions → /frontal, spikes → /cns/spike), delete with
confirmation. URL-driven selection (`/hippocampus?selected={id}`). Real-time via useDendrite.

**Environments** — Full CRUD editor page. Inline context variable editing. Set-as-active.
Auto-save on blur.

**Thalamus** — ThalamusBubble floating chat on every page. ThalamusChat with assistant-ui.

**PNS (Peripheral Nervous System)** — Fleet overview with Celery worker cards, heartbeat
controls, WorkerSetProvider for multi-select, xterm monitor grid at /pns/monitor. Real-time
via Norepinephrine through Synaptic Cleft. Live only — no historical view.

**Backend (recent)** — Norepinephrine neurotransmitter + celery_signals.py (in-process),
NorepinephrineHandler (log streaming with async/sync detection), CeleryWorkerViewSet,
NeuroMuscularJunction rename + quality pass (f-string loggers fixed, lingering "Caster"
removed), N-way spike log merge API with cursor-based delta updates,
CELERY_WORKER_SEND_TASK_EVENTS enabled. Engram rename (TalosEngram → Engram,
TalosEngramTag → EngramTag, TalosHippocampus → Hippocampus) with RenameModel migration.
Engram revectorization signal (on description change + tag M2M change). Engram query param
filtering on EngramViewSet (`?identity_discs=`). Identity M2M write fix (PrimaryKeyRelatedField
write-only counterparts for enabled_tools, addons, tags on both serializers). ShiftViewSet
(read-only reference data). Auto-populate definitions with all 6 shift types on create.
IterationShiftDefinition FK write fix (shift_id PrimaryKeyRelatedField).

---

## In Progress

### Navigation + Identity Layout + Engram Attach
- Hamburger menu + 3D sphere clickthroughs for all brain regions
- Identity ledger: remove always-open empty right panel when nothing selected
- EngramEditor: "Attach Existing" flow to link existing engrams to a disc

---

## P0 — Ship-Blocking

### Hypothalamus (`/hypothalamus`)
Model management dashboard. The last major feature gap before release. Backend APIs exist:

- `/api/v2/ai-models/` — model catalog
- `/api/v2/model-providers/` — provider list (Ollama, OpenRouter, etc.)
- `/api/v2/llm-providers/` — LLM provider reference
- `/api/v2/model-categories/` — model categories
- `/api/v2/model-modes/` — model modes
- `/api/v2/model-families/` — model families
- `/api/v2/model-pricing/` — pricing data
- `/api/v2/usage-records/` — cost tracking
- `/api/v2/model-ratings/` — ELO ratings
- `/api/v2/sync-status/` — sync status
- `/api/v2/sync-logs/` — sync logs

View should show: model cards with provider, cost, rating, circuit breaker status.
Filter by provider, sort by rating/cost. Usage chart over time. Click → inspector with
full model detail + recent usage records.

Also gates Identity fields: AIModelSelectionFilter assignment and IdentityBudget
constraints cannot be built until the Hypothalamus UI exists.


### 3D Engram relationship graph

---

## P1 — Remaining Gaps

### Temporal Lobe — URL-Driven Iteration Selection
Currently selecting an iteration/definition is local state only. Needs URL params
(`/temporal?iteration={id}` or `/temporal?definition={id}`) so refresh preserves context.

### Identity — Deferred Fields
- Hypothalamus AIModelSelectionFilter assignment (blocked on Hypothalamus)
- Budget constraints (blocked on Hypothalamus)
- Vector embedding visualization (optional, could be a sparkline or badge)

---

## P2 — Polish & Real-Time

### PNS Historical View
Currently live-only. Add: ability to view past worker activity, task history from
`django_celery_results` tables, completed task list with duration/status. The Celery
results backend is already `django-db` so the data exists.

### Environment Filtering Everywhere
EnvironmentProvider exists and NavBar has the selector. But not all views actually filter
by environment yet. Ensure: temporal, PFC, frontal, identity views all pass environment
to their API calls.

### WebSocket Coverage Audit
- CNS dashboard may need live card updates when pathways run
- Verify all views that show status use Dendrite, not polling

### Backend URL Naming Standardization
Most routes use hyphens (`identity-discs`, `tool-definitions`) but some use underscores
(`engram_tags`, `reasoning_sessions`, `reasoning_turns`, `nerve_terminal_*`). Standardize
to hyphens post-release. Coordinated frontend+backend sweep.

---

## P3 — Visual

### Brain Mesh 3D Background
Replace the abstract 3D background with actual brain region meshes using FBX assets.
Regions: PreFrontal, Hippocampus, CNS, Parietal, Pons, Occipital, Hypothalamus,
Peripheral, Reptilian — left and right hemispheres. Interactive on root route,
static/subtle on inner routes.

### Glassmorphic Styling Audit
Consistent treatment across all views. Card styles, panel borders, hover states,
selection highlights. Document in a UI style guide.

---

## URL Structure (Current)

```
/                                   → BrainView (3D landing)
/frontal                            → FrontalIndex (session list)
/frontal/:sessionId                 → FrontalSession (3D graph + chat toggle)
/cns                                → CNSPage (pathway dashboard)
/cns/pathway/:pathwayId             → CNSTrainTimeline (spike bars)
/cns/pathway/:pathwayId/edit        → CNSEditPage (ReactFlow editor)
/cns/spiketrain/:spiketrainId      → CNSMonitorPage (live execution graph)
/cns/spike/:spikeId                 → CNSSpikeForensics (dual terminal)
/cns/spikeset?s1=uuid&s2=uuid      → CNSSpikeSet (raw terminals + correlated timeline)
/pfc                                → PFCPage (board/backlog toggle)
/pfc/epic/:epicId                   → PFCDetailPage (epic with child items)
/pfc/story/:storyId                 → PFCDetailPage (story with child tasks)
/temporal                           → TemporalMatrix (definition editor + iteration board)
/identity                           → IdentityLedger (disc list + IdentitySheet)
/identity/:discId                   → IdentityDetail (disc configuration)
/hippocampus                        → HippocampusPage (engram browser)
/pns                                → PNSPage (fleet overview)
/pns/monitor?w1=host&w2=host        → PNSMonitorPage (xterm grid)
/hypothalamus                       → (TODO) Model management
/environments                       → EnvironmentEditor (CRUD)
```