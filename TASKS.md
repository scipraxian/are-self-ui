# Are-Self UI — Task List

Tracked priorities for the React frontend restructuring. This is the contract for Claude Code.

## Context

The UI is a React + Vite + TypeScript app (`are-self-ui`) that consumes the Are-Self Django REST API.
The architecture mirrors the brain: each Django app is a "lobe" with its own API surface, and the
frontend should reflect that with route-per-lobe navigation and modular panel composition.

The current `BloodBrainBarrier.tsx` is a God Component that manages all viewport state, routing,
and panel rendering in one file. It must be decomposed.

## P0 — Layout Shell & Routing (Do First)

These tasks are sequential. Complete them in order.

- [ ] **Create `ThreePanel.tsx` layout primitive.** A stateless layout component that accepts `left`,
  `center`, and `right` as React nodes (plus optional `centerClassName` for graph overrides). It
  renders the existing three-column CSS grid from `BloodBrainBarrier.css` (`bbb-panel-side`,
  `bbb-panel-center-wrapper`, `bbb-panel-right`). No state. No logic. Pure layout.

- [ ] **Create `LayoutShell.tsx` to replace BloodBrainBarrier as the root layout.** This component
  renders: (1) the background layer (BackgroundCanvas or future brain mesh), (2) `<Outlet />` from
  React Router for nested route content, (3) the footer bar, (4) the Thalamus chat slide-out panel.
  It owns zero viewport state. The `HamburgerMenu` lives here. The footer ticker should be driven by
  a context or event bus, not prop-drilled from a specific lobe.

- [ ] **Implement nested route structure in `App.tsx`.** Replace the single catch-all route with
  nested layout routes. The URL structure mirrors the backend API:

  ```
  /                           → MissionControl (the 3D landing with lobe spheres)
  /frontal                    → FrontalIndex (session list)
  /frontal/:sessionId         → FrontalSession (3D graph + inspector)
  /cns                        → CNSIndex (pathway list)
  /cns/edit/:pathwayId        → CNSEdit (graph editor)
  /cns/monitor/:pathwayId     → CNSMonitor (read-only graph)
  /temporal                   → TemporalIndex (iteration matrix)
  /pfc                        → PFCIndex (agile board)
  /identity                   → IdentityIndex (roster)
  /identity/:discId           → IdentityDetail (sheet)
  /pns                        → PNSIndex (heartbeat / fleet)
  /hippocampus                → HippocampusIndex (engram browser, future)
  /hypothalamus               → HypothalamusIndex (model dashboard, future)
  ```

  Each top-level lobe gets a layout route that can wrap shared sidebar state if needed.
  Use `React Router v6` nested `<Route>` with `<Outlet />`. No `useEffect` URL-syncing hacks.

- [ ] **Create lobe page components.** Each lobe page renders a `<ThreePanel>` with the appropriate
  left/center/right children. Start with the four that exist today:

    - `FrontalIndex.tsx` — left: `ReasoningSidebar`, center: placeholder, right: placeholder.
    - `FrontalSession.tsx` — left: `ReasoningSidebar`, center: `ReasoningGraph3D`, right: `ReasoningInspector`.
      Owns `selectedNode` and `cortexStats` state locally.
    - `CNSIndex.tsx` — left: `CNSSidebar`, center: `CNSView`, right: placeholder.
    - `CNSEdit.tsx` — left: `CNSEditorPalette`, center: `CNSEditor`, right: `CNSInspector`.
      Owns `selectedNode` state locally. Gets `pathwayId` from `useParams()`.
    - `CNSMonitor.tsx` — same as CNSEdit but passes `isMonitorMode={true}`.
    - `TemporalIndex.tsx` — left: `IterationRoster` (via portal or direct), center: `TemporalMatrix`, right: placeholder.
    - `PFCIndex.tsx` — left: placeholder, center: `PrefrontalCortex`, right: `PFCInspector`.
      Owns `selectedPfcItem` state locally.
    - `IdentityIndex.tsx` — left: `IdentityRoster`, center: placeholder, right: placeholder.
    - `IdentityDetail.tsx` — left: `IdentityRoster`, center: `IdentitySheet`, right: placeholder.
      Gets `discId` from `useParams()`.
    - `PNSIndex.tsx` — left: placeholder, center: `HeartbeatControlPanel`, right: placeholder.

- [ ] **Delete the old `BloodBrainBarrier.tsx`.** Once all lobe pages render correctly through the new
  routing, remove the God Component. Preserve `BloodBrainBarrier.css` (rename to `layout.css` or
  similar) since the panel classes are still used by `ThreePanel`.

- [ ] **Move the `MissionControl` landing into its own component.** The 3D lobe-sphere background
  (`BackgroundCanvas` with `onLobeClick`) becomes the index route. Clicking a sphere navigates to
  `/{lobe}`. No viewport state needed — it's just `navigate('/frontal')`.

## P1 — Thalamus Chat Integration

- [ ] **Wire `ThalamusChat.tsx` as a global slide-out.** The chat icon in the footer toggles the
  Thalamus chat panel (the `bbb-chat-panel-wrap` CSS already exists). This is the "standing session"
  chat that uses the Thalamus `interact` / `messages` endpoints. It lives in `LayoutShell`, not in
  any lobe page.

- [ ] **Wire `SessionChat.tsx` as a per-session overlay.** When viewing a specific frontal session
  (`/frontal/:sessionId`), the user can open a chat overlay that injects messages into that specific
  session via the `resume` endpoint. The `SessionChat` component already exists and uses
  `assistant-ui` correctly. Mount it as an overlay inside `FrontalSession.tsx`.

- [ ] **Connect Synaptic Cleft to chat updates.** `SessionChat` already uses `useDendrite` for
  real-time message delivery. Ensure `ThalamusChat` does the same. The backend `signals.py` is
  already broadcasting `Acetylcholine` events on every `ReasoningTurn` and `ReasoningSession` save.

## P2 — WebSocket & Real-Time

- [ ] **Replace polling with Synaptic Cleft events.** `ReasoningGraph3D.tsx` currently polls every
  3 seconds (`setInterval(fetchGraphData, 3000)`). Replace with: (1) initial fetch on mount,
  (2) `useDendrite('ReasoningTurn', sessionId)` to trigger re-fetch on Acetylcholine events,
  (3) `useDendrite('ReasoningSession', sessionId)` for status changes (Dopamine/Cortisol). Keep a
  manual refresh button as fallback.

- [ ] **Footer ticker driven by Synaptic Cleft.** The cortex stats in the footer (`LVL`, `FOCUS`,
  `XP`, latest thought) should be populated from a context that subscribes to Dopamine/Cortisol
  events globally, not prop-drilled from `ReasoningGraph3D`.

- [ ] **CNSView / CNSSidebar real-time updates.** Spike and SpikeTrain status changes are already
  broadcast via `signals.py`. Subscribe the CNS components to `useDendrite('Spike', ...)` and
  `useDendrite('SpikeTrain', ...)` for live status badges.

## P3 — Code Quality & Cleanup

- [ ] **Extract inline API calls from component props.** The `CNSInspector` in the old BBB has raw
  `apiFetch` calls passed as `onDelete` and `onContextChange` props. These should be proper
  functions in the CNSEdit page component or a dedicated hook (`useCNSInspectorActions`).

- [ ] **Establish a `hooks/` convention.** Data-fetching hooks per lobe:
    - `useSessions()` — list reasoning sessions with filtering.
    - `useSessionGraph(sessionId)` — graph data for a single session.
    - `usePathways()` — list CNS pathways.
    - `useThalamusChat()` — standing session interact/messages.
      Pattern: each hook returns `{ data, isLoading, error, refetch }`.

- [ ] **Clean up CSS class names.** The `bloodbrainbarrier-ui-1` through `bloodbrainbarrier-ui-12`
  and `reasoningpanels-ui-154` through `reasoningpanels-ui-184` classes are auto-generated garbage.
  Replace with semantic names that describe what they style. Follow a `{component}-{element}`
  convention (e.g., `footer-stat-level`, `footer-stat-xp`, `inspector-empty-state`).

- [ ] **Remove hardcoded URLs.** `SessionChat.tsx` has `http://127.0.0.1:8000` hardcoded. All API
  URLs should go through `apiFetch` with relative paths (the Vite proxy or env var handles the base).

- [ ] **Create `UI_STYLE_GUIDE.md`.** Codify the following rules:
    - **No inline styles.** Every style lives in a `.css` file. No `style={{}}` props. No exceptions.
    - **No Tailwind utility classes mixed with CSS files.** Pick one approach per component. The
      project uses `.css` files — stick with that.
    - **Semantic CSS class names.** `{component}-{element}` convention. `footer-stat-level` not
      `bloodbrainbarrier-ui-4`. Class names must be human-readable and describe what they style.
    - **Component file structure:** Each component gets a `.tsx` and a `.css` file. Pages live in
      `src/pages/`, reusable components in `src/components/`, hooks in `src/hooks/`.
    - **State management:** Local state for lobe-specific data. Context for cross-cutting concerns
      (Synaptic Cleft, GABA escape handlers, theme). No global stores.
    - **Naming:** Biological metaphors in user-facing text. No "Mission Control", "Command Center",
      or military jargon. Internal code uses the most logical/descriptive names.
    - **Testing:** Components should be testable in isolation. Avoid tightly coupled component trees.
    - **Imports:** React/stdlib first, then third-party, then project imports. Alphabetical within
      each group.
    - **Panel composition:** Every lobe page uses `ThreePanel` with left (control), center (stage),
      right (inspector). State lives in the page, not in the shell.

## P4 — Future / Nice to Have

- [ ] **Brain mesh 3D background.** Replace `BackgroundCanvas` lobe spheres with the actual brain
  mesh. Lobe regions are clickable and glow based on real-time activity (Dopamine events = green
  pulse, Cortisol = red pulse).

- [ ] **Hippocampus engram browser.** Route: `/hippocampus`. Search and browse engrams with vector
  similarity visualization. Tag filtering. Timeline view.

- [ ] **Hypothalamus model dashboard.** Route: `/hypothalamus`. Model catalog, circuit breaker
  status, cost tracking, ELO ratings. The backend API is already there.

- [ ] **PNS fleet management.** Route: `/pns`. Nerve terminal registry, telemetry, remote agent
  status. The API exists.

- [ ] **Keyboard navigation.** ESC to go up one level (session → session list → mission control).
  The `GABAProvider` escape handler pattern is fine, but should be route-aware instead of
  viewport-state-aware.

- [ ] **Responsive / mobile layout.** The three-panel layout should stack on small screens. Left
  panel becomes a drawer, right panel becomes a bottom sheet or modal.