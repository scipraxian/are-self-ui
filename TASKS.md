# Are-Self UI — Task List

Current state of the React frontend. Updated 2026-03-29.

## Completed Work

### Step 1 — Layout Shell & Routing ✅
Decomposed BloodBrainBarrier God Component. Nested React Router. ThreePanel layout primitive.
Hardcoded URLs removed. WebSocket proxy added. Legacy components deleted.

### Step 2 — Frontal Lobe Data Fix ✅
types.ts updated for nested model_usage_record. Inspector shows real data. Footer removed.
Cortex stats bar on FrontalSession. All auto-generated CSS classes renamed. Inline styles killed.

### Step 3 — PFC Agile Board ✅
Inspector scroll structure. Card blink fix. PFCNavTree left panel. Expand/collapse toggle.
All auto-generated CSS classes renamed. Inline styles killed. PFCStub → PFCPage.

### Step 4 — CNS Overview Rebuild ✅
CNSTrainList with expandable rows. CNSSpikeDetail right panel. CNSSidebar filter behavior.
CNSPage replaces CNSStub. Dead code deleted. CNSNode Tailwind violations fixed.

### Step 5 — Layout Height Fix ✅
100vh constraint. min-height: 0 on flex chain. flex-shrink: 0 on train rows.

### Step 6a — CNS Pathway Dashboard ✅
Responsive card grid with D3 sparklines. CNSDashboardSidebar with search, tags, starred.
Pathways with zero runs hidden.

### Step 6b — CNS Train Timeline ✅
Spike bars with proportional segments. CNSTrainSidebar with stats. Begin Play filtered.

### Step 6d — CNS Spike Forensics ✅ (partial)
Dual terminal view. CNSTerminalPane with xterm.js + toolbar. xterm.css import fixed manually.

### Step 7 — Unified Navigation Bar ✅
NavBar with breadcrumbs + environment selector. BreadcrumbProvider context. Redundant
back/exit/close buttons removed. document.title updates per route.

## Known Bugs (Fix Immediately)

- [ ] **Background canvas captures pointer events on non-root pages.** OrbitControls intercepts
  scroll and click on every page. On non-root routes: disable OrbitControls, set pointer-events
  none on the canvas layer, or hide the canvas entirely. This blocks basic usability.

- [ ] **Breadcrumbs wrong on deep CNS routes.** `/cns/spike/:spikeId` shows
  "CNS › Pre-Release Run #35D9FD" — missing pathway name as separate segment. Should show:
  `ARE-SELF › CNS › {Pathway Name} › {Effector Name} #{hash}`. Needs spike → spike_train →
  pathway lookup, or pass pathway context via URL/state.

- [ ] **Temporal Lobe left panel empty.** Was working before restructuring. The stub lost the
  left panel content — should show IdentityRoster (identities and identity discs for deployment
  into iteration shifts). The center (TemporalMatrix) may still render correctly.

- [ ] **Identity view broken.** Same issue — the stub lost proper panel wiring. Left panel
  should show IdentityRoster, center shows IdentitySheet when a disc is selected.

- [ ] **PFC inspector scroll still broken on some screens.** May need CSS audit of the flex
  height chain for edge cases.

- [ ] **PFC board horizontal scroll arrows missing.** The left/right ChevronLeft/ChevronRight
  buttons that flanked the kanban board were lost during Step 3.

- [ ] **PFC inspector expand button** — may not be visible or wired correctly.

## P0 — Immediate Priorities

### Background Canvas Fix
On non-root routes, the 3D canvas must not capture pointer events. Options:
- Set `pointer-events: none` on `.layout-bg` when `pathname !== '/'`
- Disable OrbitControls via a prop: `<BackgroundCanvas interactive={isRoot} />`
- Or hide the canvas entirely on non-root routes (render a static logo or nothing)

### Frontal Lobe Session Chat (Full Vision)
The session view (`/frontal/:sessionId`) should have **two modes** the user can toggle between:
1. **Graph Mode** (current): The 3D force graph with turn/tool nodes and the inspector.
2. **Chat Mode**: The `SessionChat` component takes over the entire center stage, showing the
   conversation as a chat thread (assistant-ui). The graph is hidden, chat is full-width.

Both modes show the same session data from different perspectives. Ideally, clicking a turn in
the chat could highlight the corresponding node on the graph, and clicking a node on the graph
could scroll to that turn in the chat.

The toggle should be prominent — a tab bar or a button in the cortex stats row. "GRAPH / CHAT"

The `ThalamusChat` (global standing session) should also be re-integrated, likely as a floating
chat bubble (bottom-right corner) or a slide-out from the navbar. It exists as a component but
has no accessor since the footer was removed.

### Fix Temporal & Identity Stubs
These were working before the restructuring. The stubs need to be restored to their pre-Step-1
functionality:
- **TemporalStub**: left = IdentityRoster (for shift participant selection), center = TemporalMatrix
- **IdentityStub**: left = IdentityRoster, center = placeholder until disc selected
- **IdentityDetailStub**: left = IdentityRoster, center = IdentitySheet with discId from params

Check what props these components expect and wire them correctly.

## P1 — CNS Live Execution Graph (Level 2)

Enhance `/cns/monitor/:pathwayId` to overlay spike execution data on the ReactFlow graph:
- Load the pathway blueprint (neurons + axons) as the base graph.
- Fetch the most recent spike train for this pathway.
- Map each spike's `neuron` FK to its graph node.
- **Unrun neurons**: 15% opacity, ghosted, blueprint visible but faded.
- **Running neuron**: Full opacity, amber/orange, gentle CSS pulse animation.
- **Completed success**: Full opacity, green, solid. Stays colored.
- **Completed failed**: Full opacity, red, solid.
- **Axons**: Untraversed edges nearly invisible. Traversed edges animate (particle flow).
- **Auto-pan toggle**: When enabled, camera smoothly follows the currently running node.
- **Sub-graph nodes**: Show a mini spike bar of child train progress inside the node.
- Click a node → right panel shows spike detail for that neuron's spike.
- Real-time updates via `useDendrite('Spike')` — nodes light up as spikes fire.

## P2 — Spike Forensics Enhancements

### Side-by-Side Multi-Spike View
Add a 2×2 (or Nx1) layout option to the spike forensics view for monitoring multiple spike
streams simultaneously. Use case: watching 4 neural terminals execute in parallel during a
distributed deployment. Each quadrant is an independent `CNSTerminalPane` with its own spike
selector. The user picks which spikes to monitor from a dropdown or by clicking spikes in the
train timeline.

### Spike Selection UX
From the train timeline (Level 1), the user should be able to:
- Click a single spike segment → navigate to full-screen forensics for that spike.
- Shift+click or multi-select spike segments → open the side-by-side multi-spike view with
  those spikes loaded.

## P3 — Remaining Lobe Views

### Hypothalamus (`/hypothalamus`)
AI Model management dashboard. Backend API exists at `/api/v2/ai-models/`, `/api/v2/model-providers/`,
`/api/v2/usage-records/`, `/api/v2/model-ratings/`, etc.
- Model catalog: browse all available models with provider, capabilities, pricing.
- Circuit breaker status: which models are rate-limited or disabled.
- Cost tracking: usage records, spend per model/provider.
- ELO ratings: model quality rankings from the arena system.
- Model selection configuration: which identity discs use which models, failover strategies.

### Hippocampus (`/hippocampus`)
Engram browser and editor. Backend API exists at `/api/v2/engrams/`, `/api/v2/engram_tags/`.
- Search and browse engrams with full-text and tag-based filtering.
- Vector similarity visualization (engrams that are semantically close).
- Engram detail view with full fact text, tags, source turns, linked sessions.
- Create/edit engrams directly from the UI.
- Timeline view showing when engrams were created across sessions.

### PNS Fleet Management (`/pns`)
Currently shows HeartbeatControlPanel (Celery Beat on/off). Needs expansion:
- **Neural Terminal Registry**: List of all registered remote agents (from
  `/api/v2/nerve_terminal_registry/`). Show hostname, status, last heartbeat, capabilities.
- **Celery Workers**: Show active Celery workers, their queues, current tasks. This may need
  a new backend endpoint or integration with Celery's inspect API.
- **Telemetry**: Live metrics from neural terminals (`/api/v2/nerve_terminal_telemetry/`).
- **Process Launch/Kill**: Remote process management via the Nerve Terminal protocol.

### Temporal Lobe (`/temporal`)
Currently a stub wrapping TemporalMatrix. Needs:
- Left panel: IdentityRoster for selecting participants.
- Proper iteration/shift management controls.
- Shift status tracking (sifting → planning → executing → sleeping).

### Identity Ledger (`/identity`, `/identity/:discId`)
Currently a stub. Needs:
- Left panel: IdentityRoster with search/filter.
- Center: IdentitySheet showing full disc detail (system prompt, enabled tools, addons,
  budget, session history, turn count, memories).
- Edit capabilities for disc configuration.

## P4 — WebSocket & Real-Time

- [ ] **Replace polling in ReasoningGraph3D.** Still polls every 3s. Replace with useDendrite.
- [ ] **CNS dashboard real-time verification.** Sparkline cards use useDendrite — verify with
  live execution.
- [ ] **Environment selector wiring.** Navbar dropdown renders but doesn't filter. Wire to a
  global context that all views consume. Should filter pathways, spike trains, and all
  downstream data by the selected environment.

## P5 — Infrastructure & Quality

- [ ] **Deprecate legacy dashboard endpoint.** `DashboardViewSet.summary()` no longer used.
- [ ] **Data-fetching hooks.** `useSessions()`, `useSessionGraph()`, `usePathways()`, etc.
  Pattern: `{ data, isLoading, error, refetch }`.
- [ ] **Testing.** New tests for CNSPage, FrontalSession, PFCPage at minimum.
- [ ] **UI Style Guide.** Codify all conventions: no inline styles, semantic CSS, component
  structure, panel composition, biological naming, import ordering.
- [ ] **Brain mesh 3D background.** Replace BackgroundCanvas spheres with actual brain mesh.
  Lobe regions clickable, glowing based on real-time Dopamine/Cortisol events.

## URL Structure (Current)

```
/                                   → BrainView (3D landing, interactive)
/frontal                            → FrontalIndex (session list)
/frontal/:sessionId                 → FrontalSession (3D graph + inspector, needs chat mode)
/cns                                → CNSPage (pathway dashboard with sparklines)
/cns/pathway/:pathwayId             → CNSTrainTimeline (spike bars)
/cns/spike/:spikeId                 → CNSSpikeForensics (dual terminal)
/cns/edit/:pathwayId                → CNSEditStub (ReactFlow graph editor)
/cns/monitor/:pathwayId             → CNSMonitorStub (needs Level 2 rebuild)
/pfc                                → PFCPage (agile board + nav tree + inspector)
/temporal                           → TemporalStub (BROKEN — left panel empty)
/identity                           → IdentityStub (BROKEN — needs proper wiring)
/identity/:discId                   → IdentityDetailStub (BROKEN)
/pns                                → PNSStub (heartbeat only, needs expansion)
/hippocampus                        → Future
/hypothalamus                       → Future
```