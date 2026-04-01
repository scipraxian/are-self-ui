# Are-Self UI — Task List

Current state of the React frontend + backend. Updated 2026-04-01.

---

## What's Done

**Layout & Navigation** — LayoutShell, ThreePanel, NavBar with breadcrumbs + environment
selector + hamburger menu (Hippocampus + Hypothalamus links added 4/1), BreadcrumbProvider
(explicit setCrumbs per page), GABAProvider (ESC navigation), EnvironmentProvider (global
context, server-side selection). All URL-driven, all bookmarkable. Glassmorphic
`.glass-surface` utility class applied to all form containers.

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

**Hypothalamus (`/hypothalamus`)** — ThreePanel model catalog with three tabs:

*Catalog tab (default):*
- Model cards in grid or list view (toggle in header). Cards show: Ollama badge, model
  name, creator, family, parameter size, context length, capability/role pills, status
  dot (Installed/Available/Disabled/Breaker), Pull/Remove buttons, Free badge.
- Filter panel: search, status filter (All/Installed/Available), family chips with counts,
  capability chips, role chips.
- Sort: Name, Family, Size, Installed First (default).
- Sync Local button — hits local Ollama /api/tags, creates/enables models.
- Fetch Catalog button — scrapes ollama.com/library for available models.
- URL-driven selection: `/hypothalamus?model={uuid}`.

*Routing tab (`?tab=routing`):*
- SelectionFilter list + cards. Inspector with editable: failover strategy dropdown,
  preferred model dropdown, local failover dropdown, toggleable pills for required
  capabilities, banned providers, preferred categories/tags/roles. Explicit save button.

*Budgets tab (`?tab=budgets`):*
- IdentityBudget list + cards. Inspector shows period, cost gates, spend limits. Read-only v1.

*Model Inspector (extracted: HypothalamusModelInspector.tsx):*
- Editable description (textarea + save, creates/updates AIModelDescription records).
- Description relationships panel: M2M pill management for linked models, families, tags,
  categories with add/remove.
- Provider status with enable/disable toggle.
- Circuit breaker panel with reset button.
- Model enable/disable toggle.
- Pricing display.

*Routing Inspector (extracted: HypothalamusRoutingInspector.tsx):*
- Editable failover strategy, preferred/local model dropdowns, toggleable M2M pills.
- Saves via PATCH to `/api/v2/selection-filters/{id}/`.

**Backend — Hypothalamus (2026-04-01):**
- AIModelViewSet: pull, remove, toggle_enabled, sync_local actions
- AIModelProviderViewSet: reset_circuit_breaker, toggle_enabled actions
- FailoverTypeViewSet, FailoverStrategyViewSet, AIModelSelectionFilterViewSet (new)
- AIModelDescriptionViewSet with full M2M CRUD (new)
- BudgetPeriodViewSet, IdentityBudgetViewSet in identity app (new)
- AIModelCreatorSerializer nested on AIModelSerializer
- `current_description` SerializerMethodField — resolves model-specific → family fallback
- `parent` FK on AIModelFamily (migration 0015) for subfamily support
- 28+ new tests across test_api.py, test_description_and_family.py, test_sync.py
- Standalone model semantic parser at
  `hypothalamus/parsing_tools/llm_provider_parser/model_semantic_parser.py`
  (1121 lines, 98.4% accuracy on 2863 models, Django-free, MIT-licensed)

**Fixtures — Hypothalamus (2026-04-01):**
- `hypothalamus/fixtures/initial_data.json` — 167 entries. Pre-seeded catalog.
  4 starter models (nomic-embed-text, llama3.2:3b, qwen2.5-coder:7b, gemma3:4b) with
  providers + $0 pricing as baseline. 44 families with descriptions. 35 creators.
  48 AIModelDescription records (44 family-level fallbacks + 4 model-specific). Full
  routing engine (3 strategies, 4 failover types, 8 steps, 3 selection filters wired to
  starter models). AIModel.description is null — canonical source is AIModelDescription.
  User clicks "Sync Local" to detect actual installed models; "Fetch Catalog" to browse
  the full Ollama library.
- `hypothalamus/fixtures/ollama_popular.json` — 39 additional models (tier 2 catalog).
- `hypothalamus/fixtures/ollama_complete.json` — 74 additional models (tier 3 catalog).
- Identity budgets already in `identity/fixtures/initial_data.json` (3 periods, 4 budgets).

**Backend (prior):** — Norepinephrine neurotransmitter + celery_signals.py (in-process),
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

### Hypothalamus — fetch_catalog Rewrite
The fetch_catalog backend action needs rewriting. The current OllamaLibraryParser
(HTMLParser subclass) was REJECTED for poor code quality (nested class, untestable).
Must be replaced with: simple regex-based HTML scraping + enrichment via the standalone
parser at `hypothalamus/parsing_tools/llm_provider_parser/model_semantic_parser.py`.
Prompt is ready. sync_local works and is committed.

### Navigation + Identity Layout + Engram Attach
- Hamburger menu: Hippocampus + Hypothalamus added (4/1). Remaining brain regions TBD.
- Identity ledger: remove always-open empty right panel when nothing selected
- EngramEditor: "Attach Existing" flow to link existing engrams to a disc

---

## P0 — Ship-Blocking

### Identity — SelectionFilter + Budget Dropdowns
Add SelectionFilter dropdown and Budget dropdown to the Identity Loadout tab.
Backend endpoints exist (`/api/v2/selection-filters/`, `/api/v2/identity-budgets/`).
The `selection_filter` FK already exists on IdentityFields (abstract base).
Budget assignment goes through `IdentityBudgetAssignment` junction model.
Unblocked now that Hypothalamus page exists with browsable reference data.

### 3D Engram Relationship Graph

---

## P1 — Remaining Gaps

### Temporal Lobe — URL-Driven Iteration Selection
Currently selecting an iteration/definition is local state only. Needs URL params
(`/temporal?iteration={id}` or `/temporal?definition={id}`) so refresh preserves context.

### Identity — Deferred Fields
- Vector embedding visualization (optional, could be a sparkline or badge)

### Hypothalamus — Vectorization After First Sync
After sync_local detects installed models, they need vectors generated for semantic routing.
Could be: a management command, a button on the page, or auto-triggered after sync_local.
The `AIModel.update_vector()` method exists and uses the AIModelDescription fallback chain.
Requires Ollama running with nomic-embed-text installed.

### Hypothalamus — Subfamily Routing
The `parent` FK on AIModelFamily exists (migration 0015). The failover engine in
`hypothalamus.py` (`pick_optimal_model`) needs updating to prefer same-subfamily
first, then parent-family, then vector search. Post-release enhancement.

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

### Hypothalamus — Standalone Parser Integration
Integrate the standalone `model_semantic_parser.py` into the Django sync pipeline
(`hypothalamus.py`). Replace the old DB-driven parser. Run against all models to
populate family, creator, roles, quantizations. Would improve vector quality for the
full cloud catalog (OpenRouter sync). Deferred until after local-first release.

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
/hypothalamus                       → HypothalamusPage (model catalog + routing + budgets)
/pns                                → PNSPage (fleet overview)
/pns/monitor?w1=host&w2=host        → PNSMonitorPage (xterm grid)
/environments                       → EnvironmentEditor (CRUD)
```