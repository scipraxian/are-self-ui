# Are-Self UI — Tasks

Remaining work, sifted for the frontend. See FEATURES.md for what's built.

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
- [ ] **Identity — remove redundant Model Routing Configuration section.** The Loadout tab has an inline
  SelectionFilterEditor that duplicates the Hypothalamus routing inspector. Now that SelectionFilter and
  Budget fields click through to the Hypothalamus, the embedded editor is redundant. Consider removing the
  "Model Routing Configuration" section from IdentitySheet's Loadout tab entirely.
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
  sweep — both repos change together.
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
