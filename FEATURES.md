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
identity). Parietal Activity tab with all tool calls chronologically (sourced from each turn's
`tool_calls_summary` once the LLM responds), filter chips by tool name. Graph hover cards on all node
types. Turn markers in chat. System prompt deduplication.

**In-flight turn rendering.** A turn shows up on the 3D graph the moment the Frontal Lobe persists its
pending ledger — well before the LLM round-trip completes. Mechanics: the backend now saves the
`AIModelProviderUsageRecord` with `request_payload` populated *before* the LLM call, attaches it to the
turn, and the existing `post_save(ReasoningTurn)` signal fires the same `ReasoningTurnDigest`
Acetylcholine vesicle the UI already subscribes to. The digest broadcasts twice per turn — once at
turn-start (status `'Active'`, empty `excerpt`, empty `tool_calls_summary`, zero tokens) and once at
LLM completion (populated, status `'Completed'` or terminal-non-success). Both broadcasts share
`turn_id` so the UI just upserts. There is **no separate ghost stream** and **no extra dendrites** —
in-flight rendering is purely a render-time distinction keyed off `status_name`. F5 mid-flight is
covered by the same `graph_data/?since_turn_number=-1` pull-fallback (it returns the in-flight digest
on the same wire). When the user clicks an in-flight turn, the existing per-turn fetch
(`/api/v2/reasoning_turns/<id>/`) returns the row with `model_usage_record.request_payload` populated,
and the inspector renders it immediately with the WHAT THE AGENT SAW accordion open by default plus a
"Waiting for response…" placeholder.

**Time-based visual encoding (restored).** Sphere size and color both ride elapsed time, sourced from
`digest.delta` (Django `DurationField` wire shape, parsed via `parseDelta()`) on completed turns and
from `Date.now() - new Date(digest.created).getTime()` on in-flight turns via the animate loop.
Continuous HSL gradient: green = fastest, orange = slowest. Same `0.3x – 4.0x` clamp as the pre-April-18
visual. Tokens still appear in the inspector as reference but no longer key the geometry.

**Session-view header timers.** Two self-rescheduling `setTimeout` clocks above the graph:
session-elapsed (anchored on `session.created`, stops at terminal status) and current-turn-elapsed
(anchored on the most-recent in-flight digest's `created`, hidden when none). NEVER `setInterval`.

**Shared utility:** `toolFormatters.ts` — semantic one-liner rendering for known tools with fallback for
unknown. `summarizeTool()` for structured data, `toolOneLiner()` for compact strings.
`reasoningGraphHelpers.ts` — pure helpers (`parseDelta`, `digestElapsedMs`, `elapsedToRatio`,
`elapsedToColor`, `isInFlight`, plus the `IN_FLIGHT_STATUS_NAMES` constant set mirroring the backend's
`TURN_IN_FLIGHT_STATUS_IDS`) extracted for unit testing.

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
creates a live iteration. After every base→disc auto-forge, the embedded `IdentityRoster` is nudged to
refetch via a `refreshKey` prop so the new disc shows up immediately, even if the backend hasn't
broadcast `IdentityDisc` yet.

## Identity — `/identity`

IdentitySheet with tabbed detail editor:

- **Telemetry tab:** Live disc stats, system prompt template, compiled prompt preview.
- **Loadout tab:** Name, AI model dropdown, tools/addons/tags as toggleable pills. SelectionFilter and
  Budget fields click through to Hypothalamus. Live model preview via routing engine.
- **Memories tab:** Full engram CRUD via EngramEditor.
- **Flight Logs tab:** Reasoning sessions with click-through to `/frontal/{sessionId}`. Re-pulls the
  disc detail (which carries `reasoning_session[]`) whenever a `ReasoningTurnDigest` or
  `ReasoningSession` vesicle lands for this disc, so flight logs update live during a running session.

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

## Neuroplasticity — `/modifiers`

The bundle install / lifecycle surface for `NeuralModifier` (Are-Self's word for an installable
extension bundle) plus the cross-cutting genome editor that lets any owned row be reassigned to a
different bundle.

### Modifier Garden — `/modifiers`

ThreePanel page with status filter chips and search on the left, sortable table in the center
(slug / name / version / status / contribution count / last event / actions), and an inspector on the
right. Inspector shows manifest dump and recent installation events via `ModifierEventList`.
`ModifierStatusPill` renders the lifecycle pill. `ModifierInstallButton` is a zip picker that POSTs the
multipart install. Uninstall fetches `/impact/` and opens a confirmation dialog showing the contribution
breakdown by ContentType before the final POST. Live-updates via `useDendrite('NeuralModifier', null)`.

**Edit-target mutex.** Exactly one bundle is the active workspace at a time, marked
`selected_for_edit = true` on the `NeuralModifier` row. The garden table exposes a "workspace" affordance
per row — clicking it PATCHes `{selected_for_edit: true}`; the backend flips every other row to false in
the same transaction. New rows stamped via the begin-play genome dropdown land in whichever bundle is
currently the workspace. Save serializes the workspace bundle's owned rows back into its archive (always
patch-bumps the manifest version).

### `/modifiers/:slug`

`ModifierDetailPage` — full manifest dump plus the bundle's installation history via `ModifierEventList`.

### Genome editor (cross-cutting)

Owned-model rows (Effector, Executable, NeuralPathway, EffectorContext, EffectorArgumentAssignment,
ExecutableArgumentAssignment, ExecutableSupplementaryFileOrPath, etc.) carry a writable `genome` UUID FK
exposed by their V2 serializers, paired with a read-only `genome_slug` mirror. The frontend edits genome
via plain V2 PATCH on the row's existing viewset — no special action endpoint:

```
PATCH /api/v2/<viewset>/<row-id>/    body: { "genome": "<uuid>" }
```

**`GenomeRowControl`** (`src/components/GenomeRowControl.tsx`) — reusable per-row genome editor.
`compact` and `full` variants. CANONICAL is filtered out of the dropdown. If the row itself is on
CANONICAL, the dropdown is replaced by an inline "canonical — read-only" block (matches the backend's
read-only refusal without making the user trigger it). 400 `{"detail": "..."}` from the backend is
surfaced inline. The parent owns the shared installed-bundle list (one fetch per page, not per control)
and is notified via `onGenomeChanged` so it can mirror the new state without refetching. Currently
integrated on `EffectorEditorPage`; spreads to other owned-model editors as those land.

**Pathway-level genome control** lives directly in `CNSInspector.tsx` — PATCHing `genome` on the pathway
promotes the pathway *and* fans the new genome out to its direct cascade children (Neurons, Axons,
NeuronContexts) atomically server-side. Children that are themselves leaf rows (e.g. an
`EffectorArgumentAssignment` added to a canonical Effector) promote independently via their own row
control.

**`GENOME` constants** (`src/components/genomeConstants.ts`) — `CANONICAL` and `INCUBATOR` UUIDs
mirrored from `NeuralModifier.CANONICAL` / `.INCUBATOR` on the Python side. Same convention as
`nodeConstants.ts` for canonical effectors. Helpers `isCanonical(id)` / `isIncubator(id)`.

### Restart overlay (cross-cutting)

`install`, `uninstall`, `catalog_install`, `save`, and any `genome` PATCH that actually changes the FK
return `restart_imminent: true` on the response body. The frontend catches that flag globally and raises
a blocking overlay that polls `GET /api/v2/health/` until Daphne is back, then dismisses itself.

- **`RestartOverlayProvider`** (`src/context/RestartOverlayProvider.tsx`) — wraps the app in
  `LayoutShell`. Exposes `triggerRestart()`, `dismissRestart()`, and the `isRestarting` flag.
- **`maybeFlagRestart(payload, trigger)`** — dependency-free helper any handler runs against its
  response body. Detects the boolean `restart_imminent: true` and triggers the overlay.
- **`RestartOverlay`** (`src/components/RestartOverlay.tsx`) — the blocking UI itself. Self-rescheduling
  `setTimeout` probe loop (750ms, follows the no-`setInterval` rule) hitting `/api/v2/health/`. After the
  first 200 OK, waits a 250ms settle delay before dismissing — gives other dendrite subscribers room to
  reconnect cleanly.

## Environments — `/environments`

Full CRUD editor. Inline context variable editing with "+ Key" button. Set-as-active. Auto-save on blur.
Subscribes to `useDendrite('NeuralModifier', null)` so a graft install/uninstall that ships a
`ProjectEnvironment` shows up live without a page refresh.

## Thalamus

ThalamusBubble floating chat on every page. ThalamusChat with `@assistant-ui/react` and `useLocalRuntime`.
Real-time sync via dendrite. Header strip carries two badges (standing-thread message count + resolved
model context window in tokens) and a clear-history button (probes the backend `/clear/` endpoint via
OPTIONS — disabled with tooltip when not yet exposed). Assistant text parts go through a sanitized-HTML
renderer (DOMPurify) when the model emits markup, plain-text otherwise — never raw
`dangerouslySetInnerHTML`.

## PNS (Peripheral Nervous System) — `/pns`

Fleet overview with Celery worker cards (PID, prefetch, pool concurrency, CPU metrics). Heartbeat controls.
Multi-select with WorkerSetProvider. xterm monitor grid. SystemControlPanel with shutdown/restart.
Live only — no historical view.

## Real-Time Architecture

All updates flow through the Synaptic Cleft via WebSocket. `useDendrite(receptorClass, dendriteId)`
subscribes to typed neurotransmitter events. When an event fires, the hook returns a new ref, triggering
React effects that refetch data. No polling. No `setInterval`. Data fetching uses async functions inside
`useEffect` bodies with dendrite event objects in the dependency array and cancelled-flag cleanup.
