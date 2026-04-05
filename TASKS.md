# Are-Self UI — Tasks

Remaining work, sifted for the frontend. See FEATURES.md for what's built.

## Top Priority — Image & Audio Manipulation

Image and audio generation are **CNS effectors** (not Parietal Lobe tools). The artist LLM writes a prompt
to the blackboard, a generation effector calls an external service, the result path goes back on the
blackboard. This decouples Are-Self from any specific backend (InvokeAI, ComfyUI, etc.).

Frontend implications: the CNS monitoring views already show effector execution. New needs: image preview
in spike forensics when the effector result is an image path, audio playback widget for WAV/MP3 results,
and potentially a "modality" indicator on Identity Loadout showing what each disc is attuned to (art,
audio, code). The Effector Editor (backend task) will need a frontend counterpart.

## Ship-Blocking

- [x] **Session view — render tool calls in chat.** `CustomMessageTools` in both `SessionChat.tsx` and
  `ThalamusChat.tsx` now extracts `thought` parameter (displayed as readable prose), formats remaining args as
  structured key-value pairs instead of raw JSON, and makes long results collapsible with expand/collapse toggle.
  CSS updated in `ThalamusChat.css`. **Backend task (make `thought` required) still open.**
- [ ] **Session chat — messages not delivered or persisted.** Typing in the Thalamus chat window of a running Frontal
  Lobe session does not deliver the message (swarm_message_queue not receiving). On page refresh, the typed message is
  gone — not persisted as a ReasoningTurn. Two bugs: delivery + persistence. **Paired with backend task.**
- [X] **Root dashboard — "begin play" filter.** "Begin Play" spikes still showing. **NOTE:** `spike.status` is the
  execution status (success/failed/running), NOT the effector type. "Begin Play" is an effector (effector_id /
  effector_name). Filter must use `spike.effector_name` or `spike.effector_id`, not `spike.status`. The current
  `spike.status !== 1` filter is WRONG and needs to be corrected.
- [x] **Root dashboard — performance.** Wired to lightweight `GET /api/v2/stats/` endpoint (created 4/3).
- [x] **Frontal Lobe node — identity_disc from context variable.** identity_disc now flows from NeuronContext to
  ReasoningSession creation (fixed 4/3). `prompt` context variable injection still broken — see backend tasks.
- [~] **Shutdown / restart controls.** ⚠️ SHIP-BLOCKER. Backend endpoints done (`/api/v2/system-control/`).
  Frontend SystemControlPanel exists on PNSPage. Restart works. **Remaining:** CSS layout fix (huge empty spaces),
  full app lifecycle (close browser windows, restart webserver — Michael's old app did this). Consider moving
  controls to a global header/nav position instead of PNS-only.

## Next Up (Demo Feedback — April 3, 2026)

- [x] **Reasoning view rethink (Session 8).** Major overhaul of `/frontal/:sessionId`:
  - **Inspector rewrite:** Session overview card when nothing selected (summary from mcp_done, aggregated
    tool stats, token budget, identity). Three-tier turn inspector: headline (model/duration/tokens/time on
    task), Parietal Lobe narrative (semantic tool summaries with thought field + error recovery), and
    collapsed deep dive (filtered input context + raw payloads). Engram/tool/conclusion inspectors improved.
  - **Chat improvements:** Turn markers (`──── turn 4 · 0.32s · 155 tokens ────`), semantic tool one-liners
    using shared toolFormatters.ts, system prompt deduplication (show once, extract L1 cache warnings as
    badges). Thought field shown with 💭 prefix. Click-through to raw data.
  - **Parietal Activity tab:** Third tab alongside Graph/Chat. Scrollable list of all tool calls with
    semantic summaries, recovery annotations, filter chips by tool name. Clickable rows.
  - **Graph hover cards:** Glassmorphic tooltip cards on node mouseover (200ms debounce, pointer-events:none).
    Type-aware content for turns, tools, engrams, goals, conclusions. Coexist with thought bubbles.
  - **Shared foundation:** `src/utils/toolFormatters.ts` — semantic one-liner rendering for known tools
    (mcp_ticket, mcp_done, mcp_pass, mcp_respond_to_user, engram tools) with fallback for unknown.
  - **Backend:** `narrative_dump` endpoint alongside forensic `summary_dump`. Compact human-readable
    session briefing with tool activity, errors, token summary. 16 tests.
  - **Design doc:** `REASONING_VIEW_RETHINK.md` in repo root.
  - **Status: Code written, needs testing.** Run frontend dev server to verify. Run backend tests via
    Claude Code (`venv/Scripts/pytest frontal_lobe/tests/test_narrative_dump.py`).
- [X] **Rename Dashboard to BloodBrainBarrier.** The old `dashboard/` Django app is being deprecated. The root route
  UI component should be renamed from Dashboard to BloodBrainBarrier (BBB) — files, component names, CSS classes.

- [X] **PFC Edit page — scroll + crushed sections.** PFCEditPage.tsx/css needs `overflow-y: auto` on the container
  and proper flex sizing so accordion sections aren't crushed. Same pattern as the IdentitySheet scroll fix.
- [X] **Root dashboard — nav icons + missing endpoints.** Nav buttons need icons (consistent with hamburger menu
  and rest of app). Missing endpoints: CNS, Frontal Lobe is there now but verify full coverage. Use lucide-react icons.
- [X] **Root dashboard — logo placement.** `Are-SelfLogo-transparent-04022026.png` in the dashboard header and other
  logical locations (nav bar, login page if applicable). File is SVG-friendly, can resize freely.
- [x] **Neural Pathway Graph Editor — custom node visuals (Session 5).** 4 specialized ReactFlow node components
  built, each with unique Unreal Engine blueprint-style visuals (solid colored headers, lucide-react icons),
  inline editing via `useNeuronContext` hook, and PK-based type resolution from `nodeConstants.ts`:
  - **Gate node** (`GateNeuronNode.tsx`): Teal (#06b6d4), GitBranch icon. Editable key/operator/value.
    Ports: IN → PASS/FAIL. Effector PK 5.
  - **Retry node** (`RetryNeuronNode.tsx`): Amber (#f59e0b), RotateCw icon. Editable max_retries/delay.
    Ports: IN → PASS/FAIL. Effector PK 6.
  - **Delay node** (`DelayNeuronNode.tsx`): Indigo (#6366f1), Clock icon. Editable delay seconds.
    Ports: IN → OUT. Effector PK 7.
  - **Frontal Lobe node** (`FrontalLobeNeuronNode.tsx`): Purple (#a855f7), Brain icon. Identity disc
    selector (fetches from API) + prompt textarea. Ports: IN → PASS/FAIL. Effector PK 8.
  CNSEditor.tsx updated to use PK-based matching (`EFFECTOR_NODE_TYPE` from `nodeConstants.ts`) instead of
  old executable slug matching. Default NeuronContext values posted on drop for logic nodes (`EFFECTOR_DEFAULTS`).
  NeuronMonitorNode.tsx enhanced with effector-type-aware accent colors and icons for visual consistency
  in the spike train viewer. Old `LogicNeuronNode.tsx/css` and `FrontalLobeNeuronNode.css` deleted.
  **Remaining:** Generation effector node (awaiting backend PoC).
- [ ] **Neural Pathway Graph Editor — right-click context menu.** Demo feedback: "in Unreal you can right-click."
  Add right-click functionality with search of available items (neurons, effectors) for adding to the pathway.
  Backend already supports the item catalog — this is a frontend UX feature.
- [ ] **Neural Pathway Graph Editor — node inspector data reorganization.** The right-panel data when clicking a node
  isn't useful enough. Needs organizational rethink — what data matters at a glance vs what's detail.
- [ ] **CNS Neuron admin link.** Node click-through to Django admin shows black screen. The access DB record link
  is broken — verify the admin URL pattern for neurons.
- [ ] **Temporal Lobe — delete iteration.** Delete button with confirmation dialog added (TemporalMatrix.tsx).
  **Verify it works** — wired to `DELETE /api/v2/iterations/{id}/`.
- [ ] **PNS worker preview — fill card area.** Worker preview cards on /pns should show more data: PID, prefetch,
  pool concurrency, CPU metrics. Implementation started — verify and expand.
- [x] **IdentityDisc addon editor — expand.** AddonEditor.tsx now exposes all IdentityAddon fields: name,
  description, phase dropdown (IDENTIFY/CONTEXT/HISTORY/TERMINAL — hardcoded, no API endpoint for phases),
  and function_slug (inline editable). Both card view and create form updated. (Completed 4/3.)
- [x] **IdentityDisc tool editor — expand.** ToolEditor.tsx now exposes: name, description, is_async toggle,
  use_type dropdown (fetched from `/api/v2/tool-use-types/`), and expandable parameter assignment panel with
  add/remove parameters, REQ/OPT toggle per assignment, prune_after_turns display, enum count badges.
  (Completed 4/3.)
- [ ] **Temporal Lobe — URL-driven iteration selection.** Currently selecting an iteration/definition is local state
  only. Needs URL params (`/temporal?iteration={id}` or `/temporal?definition={id}`) so refresh preserves context.
- [ ] **Navigation cleanup.** Hamburger menu has Hippocampus + Hypothalamus (added 4/1). Remaining brain regions TBD.
- [ ] **Identity ledger layout.** Remove always-open empty right panel when nothing selected.
- [ ] **Identity — remove redundant Model Routing Configuration section.** The Loadout tab has an inline
  SelectionFilterEditor that duplicates the Hypothalamus routing inspector. Now that SelectionFilter and Budget
  fields click through to the Hypothalamus, the embedded editor is redundant. Consider removing the "Model Routing
  Configuration" section from IdentitySheet's Loadout tab entirely — editing happens on the Hypothalamus page.
- [ ] **EngramEditor — attach existing.** "Attach Existing" flow to link existing engrams to a disc.
- [ ] **Hypothalamus — family filter sort + zero-count hiding.** Family chips in filter panel need alphabetical sort.
  Consider hiding families with zero models (44 chips, 4 models on first load).
- [ ] **Hypothalamus — budgets tab editing.** Currently read-only. Need inline editing for budget periods, cost gates,
  spend limits.
- [ ] **Hypothalamus — vectorization after first sync.** After sync_local detects installed models, they need vectors
  for semantic routing. Could be a management command, a button, or auto-triggered after sync. `AIModel.update_vector()`
  exists. Requires nomic-embed-text in Ollama.
- [ ] **Environment filtering everywhere.** EnvironmentProvider and NavBar selector exist, but not all views filter by
  environment yet. Ensure temporal, PFC, frontal, identity views all pass environment to API calls.
- [ ] **Standardize API URLs to hyphens.** Frontend counterpart to the backend URL rename. Coordinated sweep —
  both repos change together.

## Backlog

- [ ] **PNS historical view.** Currently live-only. Add past worker activity, task history from
  `django_celery_results` tables, completed task list with duration/status.
- [ ] **WebSocket coverage audit.** CNS dashboard may need live card updates when pathways run. Verify all views
  showing status use Dendrite, not polling.
- [ ] **Hypothalamus — standalone family/tag/category CRUD.** No dedicated CRUD for families, tags, or categories as
  standalone entities. Currently only manageable via description relationship pills.
- [ ] **Hypothalamus — subfamily routing UI.** Once backend supports prefer-subfamily routing, the routing inspector
  may need UI to configure subfamily preferences.

## Future

- [ ] **Brain mesh 3D background.** Replace abstract 3D background with actual brain region meshes using FBX assets.
  Regions: PreFrontal, Hippocampus, CNS, Parietal, Pons, Occipital, Hypothalamus, Peripheral, Reptilian — left and
  right hemispheres. Interactive on root route, static/subtle on inner routes.
- [ ] **Glassmorphic styling audit.** Consistent treatment across all views. Card styles, panel borders, hover states,
  selection highlights.
- [ ] **3D engram relationship graph.** Visual graph of engram relationships and provenance chains.
- [ ] **Identity — vector embedding visualization.** Sparkline or badge showing embedding status.

## Recently Completed (April 4, 2026 — Session 7)

- [x] **SystemControlPanel on PNS page.** Shutdown/restart buttons now render at the top of PNSPage.tsx,
  above the beat bar. Accessible without selecting any workers. Restart works. Layout needs CSS polish —
  currently creates large empty spaces.
- [x] **Debug node red on editor.** NeuronNode.tsx now imports EFFECTOR_STYLE and renders a colored
  border-top + type label badge for any effector with a style entry. CNSEditor.tsx passes `effectorId`
  in node data. Debug nodes (PK 9) show red (#ef4444) accent and "DEBUG" label in the graph editor.
- [x] **RetryNeuronNode key fix.** Reverted to `retry_delay` as the canonical key (reads `context.retry_delay`,
  writes via `updateContext('retry_delay', ...)`). Matches backend `CTX_RETRY_DELAY`.
- [x] **CNSMonitorPage getSpikeStatus fix.** Removed duplicate `return 'unrun'` statement.

## Known Bugs — Session 7

- [x] **CNS Monitor view never refreshes (fixed Session 8).** Root cause: `useDendrite('Spike', spiketrainId)`
  filtered by spike_train UUID, but the thalamus `broadcast_status` signal sends `dendrite_id=spike.id`
  (individual spike UUID). These never matched, so events were silently dropped. Fix: changed to
  `useDendrite('Spike', null)` — unfiltered. The 500ms debounced refetch coalesces events. The SpikeTrain
  subscription was already correct. **NOT a backend issue** — the thalamus design is correct (`dendrite_id =
  instance.id`). Future subscriptions must match the thalamus pattern.
- [ ] **PNS page layout.** SystemControlPanel at top of PNSPage creates large empty spaces. Needs CSS work
  to make it compact/inline with the beat bar or styled as a minimal header strip.

## Recently Completed (April 4, 2026 — Session 6)

- [x] **Effector palette overhaul.** Renamed "ACTION PALETTE" → "EFFECTORS". Items grouped by role:
  Logic (teal), Reasoning (purple), Effectors (gray), Pathways (blue). Each canonical item gets colored
  left border + accent dot from `EFFECTOR_STYLE`. Begin Play hidden via `HIDDEN_EFFECTOR_IDS`. Search
  input filters all sections by name.
- [x] **Frontal Lobe node — identity disc dropdown.** Changed from free text input to `<select>` dropdown
  fetching from `/api/v2/identity-discs/`. Stores disc ID instead of name. Removed free text fallback.
- [x] **Gate dropdown CSS fix.** Dark theme `option` styling (white on dark background) in `CustomNeuronNodes.css`.
- [x] **Run button → spike train navigation.** `CNSEditor.tsx` `handleRunNode` now calls `onLaunch` callback
  with the new SpikeTrain ID from the launch response. Both `CNSEditPage` and `CNSEditStub` wire
  `onLaunch={(trainId) => navigate('/cns/spiketrain/' + trainId)}`.
- [x] **Spike train polling fix — debounced dendrite events.** `CNSMonitorPage.tsx` refetch effect now
  debounces rapid spike/train dendrite events with a 500ms coalesce window. Stops refetching entirely
  once the train reaches terminal status (SUCCESS/FAILED/STOPPED). Fixes the "polls over and over"
  HTTP GET flood during active execution.
- [x] **Debug node (PK 9) — frontend constants.** Added `DEBUG: 9` to `EFFECTOR` in `nodeConstants.ts`
  with green color `#22c55e` in `EFFECTOR_STYLE`.

## Recently Completed (April 4, 2026 — Session 5)

- [x] **4 custom neuron node components.** Gate, Retry, Delay, Frontal Lobe — each with unique visuals,
  inline editing, and shared infrastructure (`useNeuronContext.ts` hook, `CustomNeuronNodes.css`,
  `nodeConstants.ts` constants). See task description above for full details.
- [x] **Canonical effector PK architecture (frontend).** `nodeConstants.ts` exports `EFFECTOR` PKs (1, 5, 6, 7, 8),
  `EFFECTOR_NODE_TYPE` (PK → ReactFlow type string), `EFFECTOR_STYLE` (PK → color/label), and
  `EFFECTOR_DEFAULTS` (PK → default NeuronContext values). All node type resolution now uses PK matching,
  not executable slug matching.
- [x] **CNSEditor.tsx PK-based wiring.** Removed old `EXECUTABLE_NODE_TYPE` slug map. Node type resolution
  uses `EFFECTOR_NODE_TYPE[neuron.effector]`. On drop, default context values from `EFFECTOR_DEFAULTS` are
  POSTed to `/api/v1/node-contexts/`. All 4 custom + 1 generic node types registered.
- [x] **NeuronMonitorNode effector awareness.** Monitor nodes now show effector-type icons (GitBranch, RotateCw,
  Clock, Brain) and accent colors from `EFFECTOR_STYLE`. Type badge shows label (GATE, RETRY, DELAY, FRONTAL).
  `effectorId` passed through from `CNSMonitorPage.tsx`.
- [x] **Frontal Lobe effector PK moved from 171 to 8.** Consistent with other canonical PKs (5, 6, 7).
  Updated in `nodeConstants.ts`, backend `models.py`, and fixture.
- [x] **Old files cleaned up.** Deleted `LogicNeuronNode.tsx`, `LogicNeuronNode.css`, `FrontalLobeNeuronNode.css`.

## Recently Completed (April 4, 2026 — Session 4)

- [x] **EnvironmentEditor — "+ Key" button.** Added inline creation of new context variable keys.
  POSTs to `/api/v2/context-keys/`, auto-selects new key after creation. CSS in EnvironmentEditor.css
  with `env-editor-*` class convention.

## Recently Completed (April 3, 2026 — Session 3)

- [x] **Tool call rendering overhaul.** `CustomMessageTools` in both `SessionChat.tsx` and `ThalamusChat.tsx`
  replaced raw JSON dumps with structured rendering: `thought` parameter extracted and displayed as readable
  italic prose (purple, above args), remaining args as key-value pairs with labeled keys, long results (>200
  chars) collapsible via `<details>` with expand/collapse toggle. New CSS classes in `ThalamusChat.css`:
  `.thalamus-tool-thought`, `.thalamus-tool-call-params`, `.thalamus-tool-param`, `.thalamus-tool-param-key`,
  `.thalamus-tool-param-val`, `.thalamus-tool-result-details`, `.thalamus-tool-result-summary`.
- [x] **Identity page scroll fix.** (Completed in Session 2, verified working in Session 3.)
- [x] **SelectionFilter + Budget click-throughs.** (Completed in Session 2, verified working in Session 3.)

## Recently Completed (April 3, 2026 — Session 2)

- [x] **Identity page scroll fix.** Scroll was disabled because `.three-panel-center-stage` had `overflow: hidden`
  blocking `.identity-sheet-container`'s `overflow-y: auto`. Fix: added `display: flex; flex-direction: column` to
  center-stage, added `flex: 1; min-height: 0` to identity-sheet-container so it fills parent and scrolls.
- [x] **SelectionFilter click-through to Hypothalamus.** In read mode, the Model Selection Filter field on the
  Identity Loadout tab now links to `/hypothalamus?tab=routing&filter={id}`, opening the Hypothalamus routing
  inspector directly for that filter.
- [x] **Budget click-through to Hypothalamus.** In read mode, the Budget Allocation field on the Identity Loadout
  tab now links to `/hypothalamus?tab=budgets&budget={id}`, opening the Hypothalamus budgets tab for that budget.
- [x] **AddonEditor expanded.** Phase dropdown + function_slug field. See task list above.
- [x] **ToolEditor expanded.** Use type dropdown + full parameter assignment panel. See task list above.

## Recently Completed (April 3, 2026 — Session 1)

- [x] **NavBar human-friendly labels + icons.** NavBar.tsx dropdown items now show colored lucide-react icon,
  route name (bold), and human-friendly label (dimmed). Full menu: CNS/Graphs, Cortex/Dashboard,
  Environments/Config, Frontal Lobe/Reasoning, Hippocampus/Memory, Hypothalamus/Models, Identity/Personas,
  PFC/Tools, PNS/Fleet, Temporal Lobe/Iterations.
- [x] **Are-Self logo + text in navbar and BBB.** Logo image + "ARE-SELF" text in both navbar-left and BBB header.
  Lightened backgrounds for visibility.
- [x] **Identity PATCH M2M fix.** IdentitySheet.tsx was sending `enabled_tools`, `addons`, `tags` (read-only field
  names) — DRF silently ignored. Fixed to send `enabled_tool_ids`, `addon_ids`, `tag_ids` (write-only fields).
- [x] **Dump Data button.** Changed from graph_data JSON dump to summary_dump text log endpoint.

## Recently Completed (April 2, 2026 — Session 2)

- [x] **PFC double-click drill.** Created PFCEditPage.tsx with full edit view. Three new routes:
  `/pfc/epic/:id/edit`, `/pfc/story/:id/edit`, `/pfc/task/:id/edit`. Double-click and inspector button both navigate
  to `/edit`. Priority dropdown (P1-P4), tags, all DoR fields added.
- [x] **Main menu / root route.** Created DashboardContent.tsx + CSS. System stats cards (clickable), latest spikes
  (with effector name, status filtering), latest sessions (with identity name), quick nav buttons. Wired into
  BrainView.tsx. 3D brain background preserved.
- [x] **Selection filter editor.** SelectionFilterEditor.tsx (495 lines) with full CRUD for all 9 filter fields.
  Integrated into IdentitySheet Loadout tab with settings toggle.
- [x] **Temporal Lobe — delete iteration.** Delete button with confirmation in TemporalMatrix.tsx.
- [x] **PNS xterm line returns.** Fixed `\n` → `\r\n` conversion in PNSMonitorPage.tsx.
- [x] **PNS worker preview expansion.** Added PID, prefetch, pool concurrency, CPU metrics to worker cards.
- [x] **PFC inline create — all 3 types.** EPIC/STORY/TASK create buttons in "Blocked by User" column only.
  Default status set to Blocked by User (id 6). Auto-parent assignment for stories/tasks.
- [x] **Dashboard stat card click-through.** Identities → /identity, Models → /hypothalamus, Sessions → /frontal.
- [x] **Dashboard session identity fix.** Uses `identity_disc_name` from serializer instead of nested object.
- [x] **Dashboard nav update.** Added Frontal Lobe, abbreviated PFC.

## Recently Completed (April 2, 2026 — Session 1)

- [x] **Hypothalamus dendrite refresh bug.** Root cause: backend fired `receptor_class='AIModel'` (antipattern —
  internal ORM model, not a brain region). Frontend subscribed to wrong WebSocket group. Fix: backend now fires
  `receptor_class='Hypothalamus'`, frontend uses `useDendrite('Hypothalamus', null)`. Convention documented in both
  CLAUDE.md files.
- [x] **Hypothalamus routing tab POST bugs.** Five M2M field name mismatches in HypothalamusRoutingInspector.tsx.
  Frontend sent singular names (`required_capability_ids`) but serializer expected plurals (`required_capabilities_ids`).
- [x] **Identity — SelectionFilter dropdown.** Added to Loadout tab with full read/write wiring.
- [x] **Identity — Budget dropdown.** Added to Loadout tab. Fixed OneToOneField access pattern in serializer
  (was calling `.filter()` on a OneToOne reverse relation).
- [x] **Identity — live Hypothalamus model preview.** Replaced dead AI Model dropdown with read-only display showing
  which model the routing engine would select. New `preview_model_selection()` pure function extracted from
  `pick_optimal_model()`. New endpoint: `GET /api/v2/identity-discs/{id}/model-preview/`. Model name links through
  to Hypothalamus inspector.
- [x] **Identity — CORTICAL TELEMETRY panel removed.** Empty right panel cleared from IdentityDetailStub.
- [x] **Identity — page scroll fix.** Container had `overflow: hidden` clipping content.
- [x] **IdentityDisc addon editor (scaffold).** AddonEditor.tsx with inline CRUD. Needs expansion for full model fields.
- [x] **IdentityDisc tool editor (scaffold).** ToolEditor.tsx with inline CRUD. Needs expansion for full model fields.
- [x] **receptor_class convention documented.** Both CLAUDE.md files updated with explicit rules: brain regions for
  manua