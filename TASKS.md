# Are-Self UI — Tasks

Remaining work, sifted for the frontend. See FEATURES.md for what's built.

## In Progress — PNS Dashboard Churn (April 11, 2026)

**Status:** Blocked on backend regression fix (see are-self-api/TASKS.md → "In Progress —
Nerve Terminal Scan Reconcile"). Frontend has no code changes yet but there are frontend
follow-ups queued once the backend lands.

**Symptoms reported by Michael:**
- Agent cards in PNS blink online/offline constantly (not true — they're stable).
- Refresh button blinks constantly.
- Logs show relentless polling of `/vital-signs/vitals/`, `/vital-signs/status/`,
  `/spikes/?is_active=true`, `/beat/status/`, `/celery-workers/` (that last one taking ~3s).

**Diagnosis:** The backend scan fires per-row acetylcholine during reconcile, and
`PNSPage.tsx:220` subscribes to `NerveTerminalRegistry` and calls `handleRefresh()` on every
broadcast. `handleRefresh()` is monolithic — it refetches all five endpoints on ANY
subscription event — so a terminal save also rehits celery-workers and beat for no reason.

**Frontend follow-ups (queued, not started):**
- [ ] **Split `handleRefresh` into per-topic refetchers.** A `NerveTerminalRegistry`
  broadcast should only refetch `/nerve_terminal_registry/`. A `CeleryWorker` broadcast
  should only refetch `/celery-workers/`. Etc. Today (`PNSPage.tsx:133-212`) it's one blob.
- [ ] **Debounce dendrite-triggered refetches.** Even per-topic, a backend scan that flips
  N rows in quick succession will N times call the same refetch. Coalesce with a short
  (100-200ms) trailing-edge debounce per topic.
- [ ] **Vitals push instead of poll.** `PNSPage.tsx:125` has a 3s `setInterval` for
  `/vital-signs/vitals/` — the "ONE polling exception." Once the backend vitals collector
  fires a neurotransmitter, subscribe via `useDendrite` and drop the interval. Browser does
  NOT already have CPU/GPU data — it's server-side from psutil.
- [ ] **Beat status & spikes via subscription.** `/beat/status/` and `/spikes/?is_active=true`
  should likewise be event-driven — they only change when beat restarts or spikes start/end.

## Recently Done — Engram nodes back on graph + tool-node inspector fix (April 18, 2026)

Two fixes tied to the digest cutover. Backend companion committed the same
day: `?sessions=<uuid>` filter on `EngramViewSet` and stable `id:
str(call.id)` on every `tool_calls_summary` entry.

- **Engrams are back on the 3D graph** (approach-(b) override of the
  original cutover approach-(a) decision; Michael's call — engrams are
  core domain data, not inspector-only). `ReasoningGraph3D.tsx` now fires
  a thin dedicated fetch `GET /api/v2/engrams/?sessions={sessionId}` in
  parallel with the digest cold-start. Engrams render as purple
  octahedrons (`#a855f7`, `OctahedronGeometry(5)`) linked to each of
  their `source_turns` that's already rendered, link-type `'memory'`
  (existing link-color branch). On every incoming digest vesicle the
  vesicle's `engram_ids[]` is compared against the running
  `engramsRef: Map<id, TalosEngramData>`; if any id is unseen, a
  250ms trailing-edge debounced refetch of the engram layer fires.
  Mount-fetch + vesicle-driven refresh only — no polling, same
  contract as the turn digests.
- **Tool-node inspector fix.** Tool sub-nodes are built from
  `tool_calls_summary` entries — `{id, tool_name, success, target}` —
  so clicking one used to render an empty inspector because the branch
  was reading `arguments` / `result_payload` / `traceback` off the
  node, and the digest deliberately doesn't carry them. Fix: each tool
  sub-node now carries `turn_id` (parent turn UUID) and `tool_call_id`
  (the ToolCall pk as a string); the per-turn fetch effect in
  `ReasoningPanels.tsx` now fires for both `type === 'turn'` and
  `type === 'tool'` (reading `node.turn_id`); the tool-inspector
  branch looks the matching `ToolCall` up by
  `String(c.id) === node.tool_call_id` on the fetched turn's
  `tool_calls[]` and renders arguments/result/traceback from there,
  falling back to a "Data loading..." state while the fetch is in
  flight. Stable-id lookup instead of array index, so retries /
  deletions / reorders don't mis-match.
- **`types.ts`** — added `id: string` to `ReasoningToolCallSummary`;
  fleshed out `TalosEngramData` to match what
  `EngramSerializer(fields=ALL_FIELDS)` actually returns (
  `is_active`, `created`, `modified`, `sessions`, `source_turns`,
  `spikes`, `tags`, `tasks`, `identity_discs`, `creator`). `source_turns`
  corrected from `number[]` → `string[]` (ReasoningTurn is UUID-keyed).
- **Build state.** `npm run build` — zero net-new type errors from
  this change. The same 10 pre-existing `EffectorEditorPage.tsx`
  errors (from the prior CNS UUID migration) still block a clean
  `tsc -b`; unrelated to this work.

**Standing decisions:** approach-(a) scope (goals + conclusion stay
inspector-only, not on the graph) is unchanged — only engrams got
promoted back to approach-(b). If goals or conclusion are later
overridden the same way, they'd get their own dedicated thin fetch
(not put on the digest vesicle).

## Recently Done — ReasoningTurnDigest frontend cutover (April 18, 2026)

Paired with the backend digest side-car + push-first broadcast landed
earlier the same day. Frontend has swapped off the full-session
`graph_data/` blob in all five reasoning views.

- **`ReasoningGraph3D.tsx`** — one-shot cold-start against
  `GET /api/v2/reasoning_sessions/{id}/graph_data/?since_turn_number=-1`
  (DigestSerializer list) + live `useDendrite('ReasoningTurnDigest', null)`
  with a client-side `vesicle.session_id` filter. Digests are upserted
  into a `Map<turn_id, ReasoningTurnDigest>` so reconnect replay merges
  cleanly. Dropped the local `extractThoughtFromUsageRecord` and the
  `ReasoningTurn` / `ReasoningSession` dendrites.
- **Scope decision (goals/engrams/conclusion):** narrowed the 3D graph
  to **turn-only nodes** (approach (a) from the prompt). Goal, engram,
  and conclusion nodes/links removed. Those surfaces now live on the
  right-side inspector (`ReasoningInspector`), which has its own
  session-level fetch. Cleanest in a digest-only world and avoids extra
  per-session secondary fetches on the hot path.
- **Size-ratio heuristic:** replaced the old `avgDelta`
  (query_time-based) heuristic with **tokens_out normalized against the
  session's running mean** (clamped 0.3x–4.0x). `query_time`/`delta`
  aren't on the digest. Verbose turns render as bigger spheres; chatty
  one-liners shrink.
- **`ReasoningPanels.tsx`** — duplicate
  `extractThoughtFromUsageRecord` deleted. `ReasoningInspector` now
  does three separate fetches: minimal session GET
  (`/api/v2/reasoning_sessions/{id}/`), digest pull-fallback
  (`graph_data?since_turn_number=-1`) with live vesicle upsert, and an
  **on-demand per-turn fetch** (`/api/v2/reasoning_turns/{id}/`) keyed
  off `node.turn_id` when a turn node is selected. Full ModelUsageRecord
  and ToolCall bodies are never cached on the session object — they
  re-fetch every time the user opens a turn. Session overview card
  aggregates token totals and tool-call counts from digests.
- **`FrontalLobeDetail.tsx`** — dropped the 3-second
  `setInterval(fetchCortexStream, 3000)` poll. Now: cold-start digest
  pull + `useDendrite('ReasoningTurnDigest', null)` for live upserts +
  explicit "Show full payloads" button per turn that triggers the
  on-demand per-turn fetch. Goals/engrams right-column panels removed
  to stay consistent with `ReasoningGraph3D`'s turn-only scope.
- **`FrontalLobeView.tsx`** — dropped the 3-second
  `setInterval(fetchSessions, 3000)` poll. Now:
  `useDendrite('ReasoningSession', null)` + one-shot mount fetch.
- **`SessionChat.tsx`** — zero changes needed (already on `/api/v2/`,
  doesn't read `response_payload`).
- **`types.ts`** — added `ReasoningTurnDigest` and
  `ReasoningToolCallSummary` interfaces matching the vesicle shape
  byte-for-byte. Extended `GraphNode` with explicit optional digest
  fields so TypeScript catches rename typos. Marked
  `ReasoningSessionData.turns` / `.engrams` / `.current_level` /
  `.current_focus` / `.max_focus` / `.total_xp` as optional, since
  the minimal serializer at `/api/v2/reasoning_sessions/{id}/` doesn't
  populate them.

**Deferred follow-ups:**
- `ParietalActivityPanel` (on the /frontal/:sessionId Parietal tab)
  still reads `sessionData.turns` for the all-calls flattened list.
  With the digest cutover, `turns` is no longer populated on the
  session object, so the panel renders empty. Not in the prompt's
  5-file scope; queued as its own task. Either migrate it to consume
  digests (`tool_calls_summary` gives the same flat list without args)
  or have it fetch each turn on-demand when expanded.
- Tool sub-node inspector in `ReasoningPanels` (clicking a `tool`
  node in the 3D graph) shows summary-only fields now — the sub-node
  doesn't carry `arguments` / `result_payload` / `traceback`. Full
  tool details still reachable by clicking the parent turn and
  expanding **RAW PAYLOADS**.
- 10 pre-existing `EffectorEditorPage.tsx` type errors from the prior
  CNS UUID migration are still blocking `npm run build`. Unrelated to
  this cutover — own task.

## Recently Done — Cognitive-threads delete + turn count + ago (April 18, 2026)

Cowork session. Michael asked for three things off the session view:

- **Delete on threads (all-or-nothing, UI button only).** `ReasoningPanels.tsx`
  gained a `Trash2` button on each session card. Click → `stopPropagation` +
  `confirm()` → `DELETE /api/v1/reasoning_sessions/{id}/` with CSRF → local
  state filter → `onSelectSession('')` if the active thread was the one
  deleted. v1 and v2 mount the same `ModelViewSet` registry, so no backend
  change was needed. Pruning (pick a turn and trim forward) is deferred —
  you can't just lop turns when side effects have already fired downstream.
- **Turn count + datetime + relative "ago" on each thread card.** New
  `formatAgo()` helper (multi-unit: s / m / h / d / w / mo / y) feeds a
  "Status · N turns · 5m ago" meta line; ISO datetime rendered below.
  `ReasoningSessionData` gained `turns_count?: number` and `modified?: string`.
  `ReasoningSessionMinimalSerializer` already exposed both, so no backend
  work was needed. Line 339 also fixed — `activeSession?.turns_count ??
  activeSession?.turns?.length ?? 0` — so the header count is right for
  both digest-populated and blob-populated sessions.
- **CSS touch-ups** in `ReasoningPanels.css`: `.sidebar-session-card-header`
  (flex justify-between), `.sidebar-session-delete` (transparent → red on
  hover, opacity 0.55), `.sidebar-session-datetime` (small, muted).

Backend side of the same session: `ReasoningTurnDigest` side-car + push-first
broadcast (see `are-self-api/TASKS.md` → "In Progress — ReasoningTurnDigest").
The frontend cutover from `graph_data/` blob to
`useDendrite('ReasoningTurnDigest', null)` is tracked under "Open Tasks →
ReasoningGraph3D" below.

## Recently Done — Hypothalamus UUID propagation (April 17, 2026)

Backend flipped all 28 hypothalamus models to UUID PKs (commit `1e98e303`). Frontend
type-tightening pass: narrowed `number | string` unions to `string` on all hypothalamus
ID fields across SelectionFilterEditor, HypothalamusRoutingInspector,
HypothalamusModelInspector, HypothalamusPage, and IdentitySheet.selection_filter_id.
Dropped the `Number()` coercion in the RoutingInspector save handler (would have
`NaN`'d on UUIDs). No SyncStatus lookups existed in UI. Follow-up: 10 pre-existing
type errors in `EffectorEditorPage.tsx` from the prior CNS UUID migration
(`fetchDetail(id?: number)` called with a string) still block `npm run build` — out of
scope for this pass, needs its own fix.

## Top Priority — PNS Expansion

## Top Priority — PNS Expansion

- [ ] **Multiple Ollama endpoints UI.** Hypothalamus needs an affordance to add/edit AIModelProvider
  endpoints (host:port for secondary Ollama machines). Scanner UI similar to the executable scanner.
  **Paired with backend task.**
- [ ] **Live agent monitoring.** PNS should show active reasoning agents — which IdentityDiscs are
  currently in a session, what they're doing, session duration, turn count. Real-time via dendrite.

## Ship-Blocking

- [ ] **Session chat — messages not delivered or persisted.** Typing in the Thalamus chat window of a
  running Frontal Lobe session does not deliver the message (swarm_message_queue not receiving). On page
  refresh, the typed message is gone — not persisted as a ReasoningTurn. Two bugs: delivery + persistence.
  **Paired with backend task.**
- [ ] **Shutdown / restart controls — CSS and lifecycle.** Backend endpoints done
  (`/api/v2/system-control/`). SystemControlPanel exists on PNSPage. Restart works. **Remaining:** CSS
  layout fix (huge empty spaces), full app lifecycle (close browser windows, restart webserver). Consider
  moving controls to a global header/nav position instead of PNS-only.
- [ ] **Rename `SystemControlPanel` — off style guide.** "System Control" is mechanical/military-adjacent
  and violates the biological-naming rule. Candidates: `HomeostasisPanel`, `BrainstemPanel`,
  `MedullaPanel`, `AutonomicPanel`. Coordinated rename: component file, CSS class prefix, PNSPage import,
  any tests. Pair with the backend endpoint rename (`/api/v2/system-control/` → something biological) so
  the name maps cleanly front-to-back.
- [x] **~~Frontend <<h>> tag stripping in chat display.~~** `src/utils/humanTag.ts` with `HUMAN_TAG`
  constant and `stripHumanTag()`. Wired into `getRawText()` in both `SessionChat.tsx` and
  `ThalamusChat.tsx`. Strips a single leading `<<h>>` or `<<h>>\n`. Backend TODO to move the constant
  server-side still open (it lives in `river_of_six_addon.py`).

## Open Tasks

- [ ] **Neural Pathway Graph Editor — right-click context menu.** Demo feedback: "in Unreal you can
  right-click." Add right-click functionality with search of available items (neurons, effectors) for
  adding to the pathway. Backend already supports the item catalog — this is a frontend UX feature.
- [ ] **Neural Pathway Graph Editor — node inspector data reorganization.** The right-panel data when
  clicking a node isn't useful enough. Needs organizational rethink — what data matters at a glance vs
  what's detail.
- [ ] **CNS Neuron admin link.** Node click-through to Django admin shows black screen. The access DB
  record link is broken — verify the admin URL pattern for neurons.
- [ ] **Temporal Lobe — delete iteration verification.** Delete button with confirmation dialog added
  (TemporalMatrix.tsx). **Verify it works** — wired to `DELETE /api/v2/iterations/{id}/`.
- [ ] **Temporal Lobe — URL-driven iteration selection.** Currently selecting an iteration/definition is
  local state only. Needs URL params (`/temporal?iteration={id}` or `/temporal?definition={id}`) so
  refresh preserves context.
- [ ] **PNS worker preview — fill card area.** Worker preview cards on /pns should show more data.
  Implementation started — verify and expand.
- [ ] **PNS page layout.** SystemControlPanel at top of PNSPage creates large empty spaces. Needs CSS
  work to make it compact/inline with the beat bar or styled as a minimal header strip.
- [ ] **Navigation cleanup.** Hamburger menu has Hippocampus + Hypothalamus. Remaining brain regions TBD.
- [ ] **Identity ledger layout.** Remove always-open empty right panel when nothing selected.
- [x] **~~Identity — remove redundant Model Routing Configuration section.~~** Removed from
  `IdentitySheet.tsx`: the "Model Routing Configuration" sheet-section, the `SelectionFilterEditor`
  import, and the `showFilterEditor` state. `selectionFilters` state is kept — the Loadout dropdown
  above still uses it. Hypothalamus is now the single source of truth for routing config; the Loadout
  tab links through via the SelectionFilter and Budget fields.
- [ ] **EngramEditor — attach existing.** "Attach Existing" flow to link existing engrams to a disc.
- [ ] **Hypothalamus — family filter sort + zero-count hiding.** Family chips in filter panel need
  alphabetical sort. Consider hiding families with zero models (44 chips, 4 models on first load).
- [ ] **Hypothalamus — budgets tab editing.** Currently read-only. Need inline editing for budget periods,
  cost gates, spend limits.
- [ ] **Hypothalamus — vectorization after first sync.** After sync_local detects installed models, they
  need vectors for semantic routing. Could be a management command, a button, or auto-triggered after sync.
  `AIModel.update_vector()` exists. Requires nomic-embed-text in Ollama.
- [ ] **Environment filtering everywhere.** EnvironmentProvider and NavBar selector exist, but not all
  views filter by environment yet. Ensure temporal, PFC, frontal, identity views all pass environment to
  API calls.
- [ ] **Standardize API URLs to hyphens.** Frontend counterpart to the backend URL rename. Coordinated
  sweep — both repos change together. Known touch points: `EngramEditor.tsx`,
  `HippocampusPage.tsx` (`engram_tags`), `SessionChat.tsx`, `ReasoningPanels.tsx`,
  `FrontalLobeView.tsx`, `FrontalLobeDetail.tsx`, `ReasoningGraph3D.tsx`
  (`reasoning_sessions`, `reasoning_turns`), `PNSPage.tsx` (`nerve_terminal_*`).
- [ ] **Purge residual `/api/v1/` calls.** Legacy v1 routes still live in the UI:
  `/api/v1/node-contexts` (13 call sites), `/api/v1/reasoning_sessions/` in
  `FrontalLobeView.tsx`, `FrontalLobeDetail.tsx`, `ReasoningGraph3D.tsx`, and
  `ReasoningPanels.tsx` (7 sites), and `/api/v1/environments` (4 sites). Re-point to
  v2 equivalents; if v2 doesn't host a given endpoint yet, file the gap on the backend
  side. Pairs with the backend task.
- [ ] **Frontal Lobe session Parietal tab — drill-through broken.** Items in the Parietal tab and Parietal
  actions in the right window don't drill. Proposed fix: drill to zoom the matching 3D node so the full
  call is visible.

## Backlog

- [ ] **PNS historical view.** Currently live-only. Add past worker activity, task history from
  `django_celery_results` tables, completed task list with duration/status.
- [ ] **WebSocket coverage audit.** CNS dashboard may need live card updates when pathways run. Verify all
  views showing status use Dendrite, not polling.
- [ ] **Hypothalamus — standalone family/tag/category CRUD.** No dedicated CRUD for families, tags, or
  categories as standalone entities. Currently only manageable via description relationship pills.
- [ ] **Hypothalamus — subfamily routing UI.** Once backend supports prefer-subfamily routing, the routing
  inspector may need UI to configure subfamily preferences.

## Future

- [ ] **Image & audio manipulation UI.** Image preview in spike forensics when effector result is an image
  path, audio playback widget for WAV/MP3 results, modality indicator on Identity Loadout. Generation
  effector node component. Awaiting backend effector.
- [ ] **Brain mesh 3D background.** Replace abstract 3D background with actual brain region meshes using
  FBX assets. Regions: PreFrontal, Hippocampus, CNS, Parietal, Pons, Occipital, Hypothalamus, Peripheral,
  Reptilian — left and right hemispheres. Interactive on root route, static/subtle on inner routes.
- [ ] **Glassmorphic styling audit.** Consistent treatment across all views. Card styles, panel borders,
  hover states, selection highlights.
- [ ] **3D engram relationship graph.** Visual graph of engram relationships and provenance chains.
- [ ] **Identity — vector embedding visualization.** Sparkline or badge showing embedding status.
