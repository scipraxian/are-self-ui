# Are-Self UI — Tasks

Remaining work, sifted for the frontend. See FEATURES.md for what's built.

## Ship-Blocking

- [ ] **Frontal Lobe node — identity_disc from context variable.** The CNS fires a spike into a Frontal Lobe neuron,
  but `_initialize_session()` creates the ReasoningSession with `identity_disc=None`, then crashes at line 401.
  Fix: read `identity_disc` UUID from the neuron's context variables (NeuronContext / spike blackboard) and pass it
  into `ReasoningSession.objects.create()`. The CNSInspector context variable editor already supports adding/editing
  variables, so the user pastes the disc UUID as a context var — no new dropdown UI needed. **Paired with backend task.**
- [ ] **Session view — render tool calls in chat.** Local models often work silently (no assistant text, just tool use).
  The chat view shows nothing for these turns. Need to render tool call name, arguments, and results inline so the
  conversation isn't invisible. Move "Tool details in chat views" from backlog to here — this is critical for usability.
  Consider making the `thought` parameter required or improving system prompts so models explain actions.
- [ ] **Root dashboard — performance.** Dashboard fetches full unpaginated lists just to count records. Create a
  lightweight `/api/v2/stats/` endpoint (or per-model count endpoints) on the backend. Currently takes forever to load.
- [ ] **Root dashboard — "begin play" filter.** Spikes with status id 1 ("Begin Play") still showing. Current filter
  matches by name substring which missed it. Filter by status id instead.
- [ ] **Shutdown / restart controls.** UI buttons or controls for clean system shutdown and restart. Backend scripts
  (`are-self-shutdown.bat`, `are-self-restart.bat`) need to be created first.

## Next Up (Demo Feedback — April 2, 2026)

rename Dashboard to BloodBrainBarrier (of which there was one at one time but now it's dashboard).

- [ ] **PFC Edit page — scroll + crushed sections.** PFCEditPage.tsx/css needs `overflow-y: auto` on the container
  and proper flex sizing so accordion sections aren't crushed. Same pattern as the IdentitySheet scroll fix.
- [ ] **Root dashboard — nav icons + missing endpoints.** Nav buttons need icons (consistent with hamburger menu
  and rest of app). Missing endpoints: CNS, Frontal Lobe is there now but verify full coverage. Use lucide-react icons.
- [ ] **Root dashboard — logo placement.** `Are-SelfLogo-transparent-04022026.png` in the dashboard header and other
  logical locations (nav bar, login page if applicable). File is SVG-friendly, can resize freely.
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
- [ ] **IdentityDisc addon editor — expand.** Basic CRUD editor is scaffolded (AddonEditor.tsx). Needs expansion:
  addons have more fields than just name/description. Review the full IdentityAddon model and expose all fields.
- [ ] **IdentityDisc tool editor — expand.** Basic CRUD editor is scaffolded (ToolEditor.tsx). Needs expansion:
  tool definitions have JSON schema fields and parameter assignments. Review ToolDefinition model and expose all fields.
- [ ] **Temporal Lobe — URL-driven iteration selection.** Currently selecting an iteration/definition is local state
  only. Needs URL params (`/temporal?iteration={id}` or `/temporal?definition={id}`) so refresh preserves context.
- [ ] **Navigation cleanup.** Hamburger menu has Hippocampus + Hypothalamus (added 4/1). Remaining brain regions TBD.
- [ ] **Identity ledger layout.** Remove always-open empty right panel when nothing selected.
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
  manual signals, `sender.__name__` for Thalamus auto-signals, never internal ORM models or molecule types.