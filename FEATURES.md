# Are-Self UI — Features

What's built and working in the React frontend. Organized by brain region and system component.

## Layout & Navigation

LayoutShell with 3D background, NavBar, Outlet, and ThalamusBubble. NavBar is a persistent 40px bar with hamburger
menu, logo, breadcrumbs, and environment selector. BreadcrumbProvider with explicit `setCrumbs` per page — NavBar
renders what it's given, no URL parsing. GABAProvider enables ESC to walk backward through the URL chain.

EnvironmentProvider manages global environment context with server-side selection. Changing environment filters
pathways, trains, iterations, tasks, sessions — everything.

ThreePanel layout primitive (left=navigation, center=stage, right=inspector) used by most pages. Some views own their
layout: TemporalMatrix, CNSSpikeForensics, CNSSpikeSet.

Glassmorphic `.glass-surface` utility class applied to all form containers. All navigation is URL-driven and
bookmarkable. F5 returns exactly where you were.

## CNS (Central Nervous System) — `/cns`

Complete drill chain with five levels of depth:

1. **Pathway dashboard** — Cards with D3 sparkline activity charts showing pathway health.
2. **Train timeline** — Spike bars with 500ms debounced refetch via useDendrite.
3. **Live execution graph** — ReactFlow with 5 visual states, ghost-to-color overlay, edge animation. Sub-graph drill
   via double-click with parent context passed through React Router navigation state.
4. **Dual-terminal forensics** — xterm.js showing raw execution log and application log side by side.
5. **Spike set multi-comparison** — xterm grid with correlated timeline and N-way merge. SpikeSetProvider for
   multi-select with shift+click.

All real-time via useDendrite. No polling.

## Frontal Lobe — `/frontal`

Session list with inspector. 3D force graph showing reasoning turns as connected nodes. Graph/Chat mode toggle.
SessionChat posts to `/resume/` with `swarm_message_queue` injection — works even while the session is actively
reasoning. Message injection lets you talk to the AI mid-thought.

All polling replaced with useDendrite subscriptions (ReasoningSession, ReasoningTurn). No setInterval.

## PFC (Prefrontal Cortex) — `/pfc`

Agile board with board/backlog toggle. URL query param filters for status, priority, epic, and assignee. Two-panel
layout (stage + optional inspector, no left nav tree). Single-click opens inspector, double-click drills to full
detail page.

Epic and story detail drill pages. Inline create. Filter bar with clear button. Proper flex height chain for column
scrolling.

## Temporal Lobe — `/temporal`

Three-panel internal layout (manages own layout, no ThreePanel wrapper):

- **Left sidebar:** Definitions list, iterations list, and gestation chamber.
- **Center:** Shift columns with participant cards and drag-drop targets.
- **Right:** IdentityRoster as drag source.

Drag from roster → drop into shift column → calls `slot_disc` (auto-forges base identities into discs). Remove disc
from shift. Definition editor with add/remove shift columns, turn limit editing, rename, delete. New definitions
auto-populate with all 6 shift types.

Incept from definition creates a live iteration. Initiate sets iteration to Running. Real-time via useDendrite.

## Identity — `/identity`

IdentitySheet with tabbed detail editor:

- **Telemetry tab:** Live disc stats, system prompt template, compiled prompt preview.
- **Loadout tab:** Name, AI model dropdown (from `/api/v2/ai-models/`), tools/addons/tags as toggleable pills showing
  ALL available items in edit mode. Save on explicit save button.
- **Memories tab:** Full engram CRUD via EngramEditor component.
- **Flight Logs tab:** Reasoning sessions with click-through to `/frontal/{sessionId}`.

Create new identity, spawn disc from base, delete with inline confirmation.

## Hippocampus — `/hippocampus`

ThreePanel engram browser. Left panel: search input, tag filter chips, active/inactive toggle, count. Center: engram
card list with name, description preview, tags, relevance, creator, date. Right: full inspector with inline editing
(save on blur), tag pill toggles with "+" to create new tags, is_active switch, provenance links (creator disc,
sessions → /frontal, spikes → /cns/spike), delete with confirmation.

URL-driven selection (`/hippocampus?selected={id}`). Real-time via useDendrite.

## Hypothalamus — `/hypothalamus`

ThreePanel model catalog with three tabs:

**Catalog tab (default):** Model cards in grid or list view (toggle in header). Cards show Ollama badge, model name,
creator, family, parameter size, context length, capability/role pills, status dot
(Installed/Available/Disabled/Breaker), Pull/Remove buttons, Free badge. Filter panel with search, status filter,
family chips with counts, capability chips, role chips. Sort by name, family, size, or installed first. Sync Local
and Fetch Catalog buttons. URL-driven selection: `/hypothalamus?model={uuid}`.

**Routing tab (`?tab=routing`):** SelectionFilter list with cards. Inspector with editable failover strategy dropdown,
preferred model dropdown, local failover dropdown, toggleable M2M pills for capabilities, providers, categories, tags,
roles. Explicit save button.

**Budgets tab (`?tab=budgets`):** IdentityBudget list with cards. Inspector shows period, cost gates, spend limits.
Read-only v1.

**Model Inspector (HypothalamusModelInspector.tsx):** Editable description (textarea + save, creates/updates
AIModelDescription records), description relationships panel (M2M pill management for linked models, families, tags,
categories), provider status with enable/disable toggle, circuit breaker panel with reset button, model enable/disable
toggle, pricing display.

**Routing Inspector (HypothalamusRoutingInspector.tsx):** Editable failover strategy, preferred/local model dropdowns,
toggleable M2M pills. Saves via PATCH.

## Environments — `/environments`

Full CRUD editor page. Inline context variable editing. Set-as-active. Auto-save on blur.

## Thalamus

ThalamusBubble floating chat on every page. ThalamusChat with `@assistant-ui/react` and `useLocalRuntime`. Real-time
sync via `useDendrite('SynapseResponse', null)`.

## PNS (Peripheral Nervous System) — `/pns`

Fleet overview with Celery worker cards. Heartbeat controls. WorkerSetProvider for multi-select. xterm monitor grid at
`/pns/monitor`. Real-time via Norepinephrine through Synaptic Cleft. Live only — no historical view.

## Real-Time Architecture

All real-time updates flow through the Synaptic Cleft via WebSocket. The `useDendrite(receptorClass, dendriteId)` hook
subscribes to typed neurotransmitter events. When an event fires, the hook returns a new ref, triggering React effects
that refetch data. No polling anywhere in the system. No `setInterval`.

Data fetching follows a strict pattern: async functions defined inside `useEffect` bodies with dendrite event objects
in the dependency array. Cancelled-flag cleanup pattern for race conditions. This pattern exists because
`eslint-plugin-react-hooks` with `react-hooks/set-state-in-effect` is enabled.
