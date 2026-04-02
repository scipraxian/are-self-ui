# Are-Self UI — Tasks

Remaining work, sifted for the frontend. See FEATURES.md for what's built.

## Ship-Blocking

- [ ] **Hypothalamus dendrite refresh bug (BLOCKING UX).** Sync Local, Fetch Catalog, and Pull actions do not
  auto-refresh the page. Backend fires `Acetylcholine(receptor_class='AIModel', dendrite_id='hypothalamus')` —
  frontend subscribes via `useDendrite('Acetylcholine', 'hypothalamus')`. On paper this matches, but the page does not
  update. Trace the full path: `fire_neurotransmitter` → Channels consumer → WebSocket → `useDendrite` hook →
  `useEffect` trigger. Key files: `SynapticCleft.tsx`, `synaptic_cleft/consumers.py`, `HypothalamusPage.tsx`.
- [ ] **Hypothalamus routing tab POST bugs.** Changing failover strategies does not POST. Capability pill changes do
  not POST. Verify the PATCH call in `HypothalamusRoutingInspector.tsx` is wired correctly for all M2M fields.
- [ ] **Identity — SelectionFilter + Budget dropdowns.** Add SelectionFilter dropdown and Budget dropdown to the
  Identity Loadout tab. Backend endpoints exist (`/api/v2/selection-filters/`, `/api/v2/identity-budgets/`). The
  `selection_filter` FK exists on IdentityFields. Budget assignment goes through `IdentityBudgetAssignment`.
- [ ] **PFC double-click drill.** Double-clicking on a ticket brings you to partial edit; should be full edit.
- [ ] **Main menu / root route.** The root route (`/`) needs real content. Cards of latest spikes, latest sessions,
  system stats. Currently just the 3D brain.
- [ ] **Frontal Lobe — disc selection on node.** Frontal lobe session node needs ability to select a disc.
- [ ] **Shutdown / restart controls.** UI buttons or controls for clean system shutdown and restart. Backend scripts
  (`are-self-shutdown.bat`, `are-self-restart.bat`) need to be created first.

## Next Up

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
- [ ] **Tool details in chat views.** Show tool call details inline in the Frontal Lobe chat mode.

## Future

- [ ] **Brain mesh 3D background.** Replace abstract 3D background with actual brain region meshes using FBX assets.
  Regions: PreFrontal, Hippocampus, CNS, Parietal, Pons, Occipital, Hypothalamus, Peripheral, Reptilian — left and
  right hemispheres. Interactive on root route, static/subtle on inner routes.
- [ ] **Glassmorphic styling audit.** Consistent treatment across all views. Card styles, panel borders, hover states,
  selection highlights.
- [ ] **3D engram relationship graph.** Visual graph of engram relationships and provenance chains.
- [ ] **Identity — vector embedding visualization.** Sparkline or badge showing the disc's embedding.
