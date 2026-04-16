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

- [ ] **ReasoningGraph3D — large sessions take forever to load.** `ReasoningGraph3D.tsx:159`
  hits `/api/v1/reasoning_sessions/{id}/graph_data/` which returns the entire session in one
  blob: every turn (with full `model_usage_record.response_payload`), every engram, every
  tool call, and the conclusion. For long sessions that payload is enormous and the whole
  UI waits on one request. Knee-jerk fix is a "next turn / next turn / next turn" pull that
  fills the graph in as the page loads — **but the backend does not currently support this.**
  Endpoint audit (see are-self-api `frontal_lobe/api.py:60-78` + `api.py:547-570`):
    - `graph_data` action takes no query params — no `since_turn`, `offset`, or `limit`.
    - `/api/v2/reasoning_turns/?session={id}` exists and filters by session, but has NO
      pagination class configured and is ordered `-created`.
    - No standalone endpoints for `SessionConclusion` or `ToolCall` — they only come nested
      in `graph_data` / `ReasoningTurnSerializer`.
    - Engrams DO have their own endpoint (`/api/v2/engrams/`).
  **Decided approach (April 13, 2026):** map-reduce at turn-completion, stream via cursor,
  full payload only on explicit click.
    1. **Pre-compute a refined "turn summary" when the turn closes (the map-reduce).** When
       a `ReasoningTurn` transitions to terminal status, the backend computes and persists
       the small stuff the frontend actually needs to draw the graph and the chat row:
       `latest_thought` (extracted from `response_payload` via the same logic currently in
       `ReasoningGraph3D.extractThoughtFromUsageRecord`), tool call one-liners (name,
       status, compact action summary), duration, token/cost totals. Store on the turn row
       (new fields) or a 1:1 `ReasoningTurnDigest` sidecar — sidecar is probably cleaner
       so the digest schema can evolve without migrating the fat table. Do the extraction
       server-side once, not on every frontend read.
    2. **`graph_data` reads the digest, not the payload.** Serializer pulls from the
       pre-computed fields. Response is near-instant because there's no JSON-parse-and-
       extract work per turn per request. The fat `response_payload` is no longer in the
       list response at all.
    3. **Add `?since_turn_number=N` to `graph_data`** so the frontend can pull "next turn"
       style as the session grows, instead of refetching everything on each dendrite ping.
       Pairs cleanly with the existing `ReasoningTurn` dendrite subscription.
    4. **Full payload is one explicit click away.** Chat views and the right-panel
       inspector fetch full per-turn detail via `/api/v2/reasoning_turns/{id}/` (already
       exists as ReadOnly) when the user actually opens a turn. **Do not cache it on the
       session object.** Every turn's payload sitting in memory for a session the user is
       scrolling through is exactly the bloat we're avoiding.
    5. **Backfill for existing sessions.** A management command that walks existing turns
       and computes the digest retroactively, so this isn't only a forward-looking fix.
       Worth gating the serializer behind "digest present? use it : fall back to on-the-fly
       extraction" during the rollout window.
  Touch points on the UI side: `ReasoningGraph3D.tsx`, `FrontalLobeView.tsx`,
  `FrontalLobeDetail.tsx`, `ReasoningPanels.tsx`, `SessionChat.tsx` — all currently read
  `response_payload` out of the graph blob. They'll need to switch to per-turn fetch when
  the inspector/chat opens a specific turn.
  Also fold in the `/api/v1/` → `/api/v2/` migration for this file while we're in there
  (listed below). **Paired with backend task — don't start until the slim serializer and
  `since_turn_number` param land.**

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
