# Are-Self UI — Task List

Current state of the React frontend. Updated 2026-03-31.

---

## What's Done

**Layout & Navigation** — LayoutShell, ThreePanel, NavBar with breadcrumbs + environment
selector, BreadcrumbProvider (explicit setCrumbs per page), GABAProvider (ESC navigation),
EnvironmentProvider (global context, server-side selection). All URL-driven, all bookmarkable.

**CNS (Central Nervous System)** — Complete drill chain: pathway dashboard with D3 sparklines
→ train timeline with spike bars → live execution graph (ReactFlow with 5 visual states,
ghost-to-color overlay, edge animation) → dual-terminal forensics (xterm.js) → spike set
multi-comparison (xterm grid + correlated timeline with N-way merge). Sub-graph drill via
double-click. SpikeSetProvider for multi-select with shift+click. Real-time via useDendrite.

**Frontal Lobe** — Session list, 3D force graph, inspector, Graph/Chat mode toggle,
SessionChat posting to /resume/ with swarm_message_queue injection.

**PFC (Prefrontal Cortex)** — Three-panel: epic tree left, kanban center, inspector right.
Cards with status, drag intent. Basic functional but needs significant UX work (see below).

**Temporal Lobe** — Two-phase TemporalMatrix (iteration list → identity roster). Manages
own layout (no ThreePanel). Working but missing key features (see below).

**Identity** — Left panel list of discs, start of detail editor on right. Stub-level.

**Environments** — Full CRUD editor page. Inline context variable editing. Set-as-active.
Auto-save on blur.

**Thalamus** — ThalamusBubble floating chat on every page. ThalamusChat with assistant-ui.

**PNS (Peripheral Nervous System)** — Fleet overview with Celery worker cards, heartbeat
controls, WorkerSetProvider for multi-select, xterm monitor grid at /pns/monitor. Real-time
via Norepinephrine through Synaptic Cleft. Live only — no historical view.

**Backend (recent)** — Norepinephrine neurotransmitter + celery_signals.py (in-process),
NorepinephrineHandler (log streaming with async/sync detection), CeleryWorkerViewSet,
NeuroMuscularJunction rename (was GenericEffectorCaster), N-way spike log merge API with
cursor-based delta updates, CELERY_WORKER_SEND_TASK_EVENTS enabled.

---

## P0 — Ship-Blocking

### PFC Rework (`/pfc`)
The PFC needs to feel like a real project management tool. Not Jira — but the same ability
to browse, create, and manage work at every level of the hierarchy.

**What works:** Three-panel layout, epic tree, kanban columns, inspector panel.

**What's missing:**

- **Backlog/list view.** A flat, sortable, filterable list of ALL items (epics, stories,
  tasks) with status badges, priority, assignee. Toggle between kanban and list view.
  Similar to Jira's backlog but without the sprint ceremony. This is how you find things
  when you have 50+ items.

- **Epic detail drill.** Click an epic → center panel shows its child stories/tasks in a
  list (not kanban). Shows completion percentage, child count, status breakdown. The
  inspector shows the epic's own fields. URL: `/pfc/epic/:epicId`.

- **Story detail drill.** Click a story → center panel shows its child tasks. Same pattern.
  URL: `/pfc/story/:storyId`.

- **Inline create.** "+ Task" / "+ Story" / "+ Epic" buttons that expand an inline form
  (not a modal). Minimal fields: name, status, priority. Create and it appears in the list.

- **Inline edit.** Click a field in the inspector → it becomes editable. Save on blur
  (same pattern as EnvironmentEditor). Fields: name, description, status, priority,
  assignee (IdentityDisc), environment.

- **URL-driven selection.** Currently clicking a card updates inspector via local state.
  Needs to update URL: `/pfc?selected=taskId` or `/pfc/task/:taskId`. F5 returns to
  exactly what you were looking at.

### Glassmorphic Form Backgrounds
Every form/editor surface across the app needs a tinted glass backdrop. Currently the 3D
background bleeds through and makes text unreadable on: EnvironmentEditor, Identity detail,
PFC inspector, and any other view with form inputs.

Fix: Add a `.glass-surface` utility class with `background: rgba(15, 15, 30, 0.85);
backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08);` and apply it
to all form containers. This is a single CSS class applied in multiple places, not
per-component fixes.

### Frontal Lobe Polling Removal (`/frontal`)
FrontalIndex and FrontalSession currently poll on intervals regardless of session status.
Replace ALL polling with useDendrite subscriptions:
- Session list: `useDendrite('ReasoningSession', null)` triggers refetch
- Session detail: `useDendrite('ReasoningSession', sessionId)` for status updates
- ReasoningGraph3D: `useDendrite('ReasoningTurn', null)` for new turns
- No setInterval anywhere in frontal lobe code

### CNS Pathway View Throttling (`/cns/pathway/:pathwayId`)
When a pathway is actively running, the train timeline view hammers the backend with
repeated fetches. Needs: debounced refetch on Dendrite events (500ms minimum between
API calls), or better — only refetch when a SpikeTrain status change event arrives for
trains belonging to this pathway.

---

## P1 — Core Feature Gaps

### Temporal Lobe Identity Drag-and-Drop (`/temporal`)
The iteration matrix used to support dragging IdentityDiscs into shift columns to forge
them into deployed instances. This was lost in the React rebuild.

Restore:
- Identity roster panel (right side or bottom) showing available IdentityDiscs
- Drag from roster → drop into shift column → calls forge API
- Visual feedback during drag (ghost card, drop target highlight)
- URL-driven iteration selection (`/temporal/:iterationId` or query param) so refresh
  doesn't lose context

### Identity Ledger CRUD (`/identity`, `/identity/:discId`)
Left panel shows disc list (working). Detail view needs full editing:
- System prompt template (textarea with syntax highlighting or at least monospace)
- Enabled tools (M2M to ToolDefinition — checkbox list or transfer list)
- Addon phases (IDENTIFY, CONTEXT, HISTORY, TERMINAL — toggle/configure)
- Hypothalamus AIModelSelectionFilter assignment
- Budget constraints
- Vector embedding visualization (optional, could be a sparkline or badge)
- Create new disc, delete disc

### Hypothalamus (`/hypothalamus`)
Model management dashboard. Backend APIs exist:
- `/api/v2/ai-models/` — model catalog
- `/api/v2/model-providers/` — provider list (Ollama, OpenRouter, etc.)
- `/api/v2/usage-records/` — cost tracking
- `/api/v2/model-ratings/` — ELO ratings

**Note:** Frontend currently hits `/api/v2/model_registry/` which 404s. The correct
endpoints are above.

View should show: model cards with provider, cost, rating, circuit breaker status.
Filter by provider, sort by rating/cost. Usage chart over time. Click → inspector with
full model detail + recent usage records.

### Hippocampus (`/hippocampus`)
Engram browser. Backend APIs exist:
- `/api/v2/engrams/` — vector-embedded memory records
- `/api/v2/engram_tags/` — tag system

View should show: searchable engram list, tag cloud or filter chips, timeline view of
when engrams were created. Click → inspector showing full text, associated sessions/spikes,
tags, vector similarity to selected engram.

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
- ReasoningGraph3D still polls — replace with useDendrite
- CNS dashboard may need live card updates when pathways run
- Verify all views that show status use Dendrite, not polling

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
/pfc                                → PFCPage (agile board)
/pfc/epic/:epicId                   → (TODO) Epic detail with child items
/pfc/story/:storyId                 → (TODO) Story detail with child tasks
/temporal                           → TemporalMatrix (iteration matrix)
/identity                           → IdentityLedger (disc list + editor)
/identity/:discId                   → IdentityDetail (disc configuration)
/pns                                → PNSPage (fleet overview)
/pns/monitor?w1=host&w2=host        → PNSMonitorPage (xterm grid)
/hypothalamus                       → (TODO) Model management
/hippocampus                        → (TODO) Engram browser
/environments                       → EnvironmentEditor (CRUD)
```