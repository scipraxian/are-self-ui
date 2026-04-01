# Are-Self UI — Task List

Current state of the React frontend + backend. Updated 2026-04-01 (evening).

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

**Backend — Hypothalamus Semantic Parser (2026-04-01):**
- Standalone parser at
  `hypothalamus/parsing_tools/llm_provider_parser/model_semantic_parser.py`
  Django-free, MIT-licensed. 83 tests passing.
- `FAMILY_PATTERNS` now 3-tuples: `(family, parent_family | None, [slugs])`.
  Sub-families ordered before parents (Qwen Coder before Qwen, CodeLlama before Llama, etc).
- `AIModelSemanticParseResult` dataclass returns `parent_family` field.
- Sub-families with parents: Qwen Coder→Qwen, Qwen VL→Qwen, QwQ→Qwen,
  DeepSeek Coder→DeepSeek, CodeLlama→Llama, CodeGemma→Gemma,
  Codestral→Mistral, Devstral→Mistral, Magistral→Mistral, Ministral→Mistral,
  Mixtral→Mistral.
- `FAMILY_TO_CREATOR` updated with sub-family entries.

**Backend — Hypothalamus Resolver & Sync (2026-04-01):**
- `_enrich_from_parser(ai_model, parsed)` accepts `AIModelSemanticParseResult`
  (not a string). Uses `get_or_create` on all reference tables (family, creator,
  version, roles, quantizations, tags). Wires `parent_family` to
  `AIModelFamily.parent` FK. Batches scalar saves.
- `sync_local` stores Ollama's raw name as canonical (no `:latest` stripping).
  Parses once, passes result to `_enrich_from_parser`. Ollama's `details.parameter_size`
  overrides parser's name-extracted value (more precise: 27.2B vs 27B).
- `_process_catalog_entry` parses once with `ollama/` prefix, passes result.
- `fetch_catalog` uses regex scraper (`scrape_ollama_library`), processes via
  `_process_catalog_entry`, fires Acetylcholine.
- 83 tests passing (up from 75 before parser/resolver work).

**Backend — Hypothalamus (prior 2026-04-01):**
- AIModelViewSet: pull, remove, toggle_enabled, sync_local, fetch_catalog actions
- AIModelProviderViewSet: reset_circuit_breaker, toggle_enabled actions
- FailoverTypeViewSet, FailoverStrategyViewSet, AIModelSelectionFilterViewSet
- AIModelDescriptionViewSet with full M2M CRUD
- BudgetPeriodViewSet, IdentityBudgetViewSet in identity app
- AIModelCreatorSerializer nested on AIModelSerializer
- `current_description` SerializerMethodField — resolves model-specific → family fallback
- `parent` FK on AIModelFamily (migration 0015) for subfamily support

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

### Hypothalamus — Dendrite Refresh Bug (BLOCKING UX)
Sync Local, Fetch Catalog, and Pull actions do not auto-refresh the page. Backend fires
`Acetylcholine(receptor_class='AIModel', dendrite_id='hypothalamus')` — frontend subscribes
`useDendrite('Acetylcholine', 'hypothalamus')`. On paper this matches, but the page does
not update. Need to trace the full path: fire_neurotransmitter → Channels consumer →
WebSocket → useDendrite hook → useEffect trigger. Feed the next session:
`SynapticCleft.tsx`, `synaptic_cleft/consumers.py`, and `HypothalamusPage.tsx`.

### Hypothalamus — Fixture Initial State
The 4 fixture AIModelProvider records have `is_enabled: true`, making them show as
"Installed" before sync_local runs. They should either default to `is_enabled: false`
(Available until confirmed by sync) or not exist in fixtures at all (created by sync_local
on first run). Needs fixture edit + DB re-seed.

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

### Hypothalamus — Routing Tab POST Bugs
Changing failover strategies does not POST. Capability pill changes do not POST.
Need to verify the PATCH call in HypothalamusRoutingInspector.tsx is wired correctly
for all M2M fields.


### Prefrontal Cortex - Double clicking drill
Double clicking on a ticket brings you to partial edit, should be full edit.

---

## P1 — Remaining Gaps


### Temporal Lobe — URL-Driven Iteration Selection
Currently selecting an iteration/definition is local state only. Needs URL params
(`/temporal?iteration={id}` or `/temporal?definition={id}`) so refresh preserves context.

### Hypothalamus — Family Filter Sort + Zero-Count Hiding
Family chips in the filter panel need alphabetical sort. Consider hiding families with
zero models to reduce clutter on first load (44 chips, 4 models).

### Hypothalamus — Budgets Tab Editing
Currently read-only. Need inline editing for budget periods, cost gates, spend limits.

### Hypothalamus — Standalone Family/Tag/Category CRUD
No dedicated CRUD for families, tags, or categories as standalone entities. Currently
only manageable via description relationship pills. May need dedicated management UI
or at minimum an admin-accessible list view.

### Identity — Deferred Fields
- Vector embedding visualization (optional, could be a sparkline or badge)

### 3D Engram Relationship Graph


### Hypothalamus — Vectorization After First Sync
After sync_local detects installed models, they need vectors generated for semantic routing.
Could be: a management command, a button on the page, or auto-triggered after sync_local.
The `AIModel.update_vector()` method exists and uses the AIModelDescription fallback chain.
Requires Ollama running with nomic-embed-text installed.

### Hypothalamus — Subfamily Routing
The `parent` FK on AIModelFamily now populated by the parser/resolver. The failover engine
in `hypothalamus.py` (`pick_optimal_model`) needs updating to prefer same-subfamily first,
then parent-family, then vector search. Post-release enhancement.

### Hypothalamus — OpenRouter Sync (Coming Soon)
`hypothalamus.py` has `Hypothalamus.enrich_model_semantics_from_openrouter()` and
`_process_openrouter_model()` — uses the OLD `_get_or_create_enriched_model` which
assigns parser strings directly to FK fields (BROKEN — same bug that was just fixed in
api.py). Needs rewrite to use the new `_enrich_from_parser(ai_model, parsed)` pattern.
No frontend button yet. Deferred to post-release. When ready, adds full cloud model
catalog with real pricing.

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


### 3D Engram relationship graph

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