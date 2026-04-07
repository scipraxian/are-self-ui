# Are-Self UI — Features

What's built and working in the React frontend. Organized by brain region and system component.

## Layout & Navigation

LayoutShell with 3D background, NavBar, Outlet, and ThalamusBubble. NavBar is a persistent 40px bar with
hamburger menu (colored lucide-react icons, human-friendly labels per brain region), Are-Self logo,
breadcrumbs, and environment selector. BreadcrumbProvider with explicit `setCrumbs` per page. GABAProvider
enables ESC to walk backward through the URL chain.

EnvironmentProvider manages global environment context with server-side selection. Changing environment
filters pathways, trains, iterations, tasks, sessions — everything.

ThreePanel layout primitive (left=navigation, center=stage, right=inspector) used by most pages.
Glassmorphic `.glass-surface` utility class on all form containers. All navigation is URL-driven and
bookmarkable.

**Root dashboard (BloodBrainBarrier).** System stats cards (clickable → Identity, Hypothalamus, Frontal
Lobe), latest spikes (filtered by effector name), latest sessions (with identity name), quick nav buttons.
Wired to lightweight stats endpoint.

## CNS (Central Nervous System) — `/cns`

Five levels of drill depth:

1. **Pathway dashboard** — Cards with D3 sparkline activity charts.
2. **Train timeline** — Spike bars with debounced dendrite refresh.
3. **Live execution graph** — ReactFlow with 5 visual states, ghost-to-color overlay, edge animation.
   Sub-graph drill via double-click with parent context through React Router navigation state.
4. **Dual-terminal forensics** — xterm.js showing raw execution and application logs side by side.
5. **Spike set multi-comparison** — xterm grid with correlated timeline and N-way merge.

**Graph editor** with 4 custom neuron node components (Gate, Retry, Delay, Frontal Lobe) — each with
Unreal Engine blueprint-style visuals, inline editing, and PK-based type resolution. Effector palette
grouped by role (Logic/Reasoning/Effectors/Pathways) with search. Default NeuronContext values posted on
drop. Run button fires spike train and navigates to monitor view. Double-click node navigates to Effector
Editor.

**Effector Editor** at `/cns/effector/:effectorId/edit`. Full CRUD on all Effector fields: name,
description, distribution mode, executable (inline editor), switches, argument assignments
(add/remove/reorder), context entries (key/value CRUD), full command preview. Inline argument definition
creation and editing.

**Monitor view** with live dendrite refresh (debounced 500ms coalesce, stops at terminal status).
Effector-type-aware accent colors and icons on monitor nodes.

All real-time via useDendrite. No polling.

## Frontal Lobe — `/frontal`

Session list with inspector. 3D force graph showing reasoning turns as connected nodes. Graph/Chat mode
toggle. SessionChat posts to `/resume/` with swarm_message_queue injection — works while the session is
actively reasoning.

**Reasoning view** with three-tier turn inspector: headline (model/duration/tokens), Parietal Lobe
narrative (semantic tool summaries with thought field + error recovery), collapsed deep dive (filtered input
context + raw payloads). Session overview card when nothing selected (summary, tool stats, token budget,
identity). Parietal Activity tab with all tool calls chronologically, filter chips by tool name. Graph hover
cards on all node types. Turn markers in chat. System prompt deduplication.

**Shared utility:** `toolFormatters.ts` — semantic one-liner rendering for known tools with fallback for
unknown. `summarizeTool()` for structured data, `toolOneLiner()` for compact strings.

## PFC (Prefrontal Cortex) — `/pfc`

Agile board with board/backlog toggle. URL query param filters for status, priority, epic, and assignee.
Single-click opens inspector, double-click drills to full detail page with priority dropdown, tags, and DoR
fields. Inline create for all 3 types (epic/story/task). Filter bar with clear button.

## Temporal Lobe — `/temporal`

Three-panel internal layout (manages own layout, no ThreePanel wrapper). Left sidebar: definitions,
iterations, gestation chamber. Center: shift columns with participant cards and drag-drop targets. Right:
IdentityRoster as drag source.

Drag from roster → drop into shift → auto-forges base identities into discs. Remove disc from shift.
Definition editor with add/remove shift columns, turn limit editing, rename, delete. Incept from definition
creates a live iteration.

## Identity — `/identity`

IdentitySheet with tabbed detail editor:

- **Telemetry tab:** Live disc stats, system prompt template, compiled prompt preview.
- **Loadout tab:** Name, AI model dropdown, tools/addons/tags as toggleable pills. SelectionFilter and
  Budget fields click through to Hypothalamus. Live model preview via routing engine.
- **Memories tab:** Full engram CRUD via EngramEditor.
- **Flight Logs tab:** Reasoning sessions with click-through to `/frontal/{sessionId}`.

**Addon editor** with all IdentityAddon fields: name, description, phase dropdown, function_slug.

**Tool editor** with all fields: name, description, is_async toggle, use_type dropdown, expandable
parameter assignment panel with add/remove, REQ/OPT toggle, prune_after_turns, enum count badges.

Create new identity, spawn disc from base, delete with confirmation.

## Hippocampus — `/hippocampus`

ThreePanel engram browser. Search, tag filter chips, active/inactive toggle. Engram cards with name,
description preview, tags, relevance, creator, date. Full inspector with inline editing, tag pill toggles,
provenance links (creator disc, sessions, spikes), delete with confirmation.

## Hypothalamus — `/hypothalamus`

ThreePanel model catalog with three tabs:

**Catalog tab:** Model cards in grid or list view. Cards show Ollama badge, model name, creator, family,
parameter size, context length, capability/role pills, status dot, Pull/Remove buttons, Free badge. Filter
panel with search, status, family chips, capability chips, role chips. Sort by name, family, size, or
installed first. Sync Local and Fetch Catalog buttons.

**Routing tab:** SelectionFilter list with inspector. Editable failover strategy, preferred/local model
dropdowns, toggleable M2M pills for capabilities, providers, categories, tags, roles.

**Budgets tab:** IdentityBudget list with inspector showing period, cost gates, spend limits (read-only).

**Model Inspector:** Editable description with AIModelDescription CRUD, description relationships panel
(M2M pills), provider status, circuit breaker reset, model enable/disable.

## Environments — `/environments`

Full CRUD editor. Inline context variable editing with "+ Key" button. Set-as-active. Auto-save on blur.

## Thalamus

ThalamusBubble floating chat on every page. ThalamusChat with `@assistant-ui/react` and `useLocalRuntime`.
Real-time sync via dendrite.

## PNS (Peripheral Nervous System) — `/pns`

Fleet overview with Celery worker cards (PID, prefetch, pool concurrency, CPU metrics). Heartbeat controls.
Multi-select with WorkerSetProvider. xterm monitor grid. SystemControlPanel with shutdown/restart.
Live only — no historical view.

## Real-Time Architecture

All updates flow through the Synaptic Cleft via WebSocket. `useDendrite(receptorClass, dendriteId)`
subscribes to typed neurotransmitter events. When an event fires, the hook returns a new ref, triggering
React effects that refetch data. No polling. No `setInterval`. Data fetching uses async functions inside
`useEffect` bodies with dendrite event objects in the dependency array and cancelled-flag cleanup.
