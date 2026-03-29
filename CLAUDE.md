# CLAUDE.md — Are-Self UI

This file is guidance for any AI agent working on the are-self-ui codebase. Read it completely
before making any changes.

## What This Is

A React + Vite + TypeScript frontend for **Are-Self**, an open-source AI reasoning engine with a
neurologically-inspired architecture. Every UI component maps to a brain region. The backend is
Django REST Framework (repo: `talos`). The frontend consumes the DRF API.

**Mission:** Empower underprivileged youth in remote areas with free access to AI technology.
MIT licensed. The interface must be approachable, intuitive, and beautiful.

## Architecture

### Layout
- `LayoutShell.tsx` is the root layout. It renders the 3D background, the `NavBar`, and an
  `<Outlet />` for React Router.
- `NavBar.tsx` is the persistent 40px top bar with hamburger, logo, breadcrumbs, and environment
  selector. It is ALWAYS visible.
- `ThreePanel.tsx` is the layout primitive used by every lobe page. It renders three columns:
  left (control/navigation), center (primary stage), right (inspector/detail).
- State lives in the PAGE component, not in the shell or ThreePanel.

### Routing
Routes mirror the backend API structure. The URL is the single source of truth — no
`activeViewport` state, no URL-syncing useEffect hacks.

```
/                           → BrainView (3D landing, interactive)
/frontal                    → FrontalIndex (session list)
/frontal/:sessionId         → FrontalSession (3D graph + inspector)
/cns                        → CNSPage (pathway dashboard with sparklines)
/cns/pathway/:pathwayId     → CNSTrainTimeline (spike bar timeline)
/cns/spike/:spikeId         → CNSSpikeForensics (dual terminal view)
/cns/edit/:pathwayId        → CNSEditStub (ReactFlow graph editor)
/cns/monitor/:pathwayId     → CNSMonitorStub (read-only graph)
/pfc                        → PFCPage (agile board + nav tree + inspector)
/temporal                   → TemporalStub
/identity                   → IdentityStub
/identity/:discId           → IdentityDetailStub
/pns                        → PNSStub
```

### Three-Panel Convention
- **Left = Control Panel.** Navigation within the lobe. Drives what the center shows.
- **Center = Stage.** The primary view (3D graph, matrix, editor, board, terminals).
- **Right = Inspector.** Empty until something on stage is clicked. Fills with detail.

Not all views use three panels. The CNS Spike Forensics view is full-width (dual terminals).
The CNS Dashboard hides the right panel. Adapt to what the view needs.

### Data Flow
- The frontend adapts to the API, NOT the reverse. Never modify backend serializers to
  accommodate frontend display preferences.
- All API calls use relative paths through `apiFetch` (from `src/api.ts`). The Vite dev proxy
  routes `/api/*` and `/ws/*` to `http://127.0.0.1:8000`. **Never hardcode 127.0.0.1 URLs.**
- WebSocket connections use `window.location.host` to build the URL so they work in both dev
  and production.

### Real-Time
- `SynapticCleft.tsx` is the WebSocket provider. It manages per-receptor-class WebSocket
  connections and dispatches typed neurotransmitter events.
- `useDendrite(receptorClass, dendriteId)` subscribes to events. Use this instead of polling.
- Neurotransmitter types: Dopamine (success), Cortisol (error/halt), Acetylcholine (data sync),
  Glutamate (log streaming).
- The `useSynapticCleft` hook in `src/hooks/` handles Glutamate log streaming for terminals.

## Style Rules (Non-Negotiable)

### No Inline Styles
Every style lives in a `.css` file. No `style={{}}` props. The ONLY exceptions:
- Dynamically computed positions (e.g., graph bubble `left`/`top` from 3D projection).
- CSS custom property injection (e.g., `style={{ '--accordion-accent': color }}`).
- `flexGrow` proportional to data values (e.g., spike bar segments).

### No Tailwind Mixed with CSS Files
The project uses `.css` files. Do not add Tailwind utility classes to components. If you find
existing Tailwind classes (`bg-[#xxx]`, `text-gray-400`, `flex items-center`, etc.), move them
to the component's CSS file with semantic class names.

### Semantic CSS Class Names
Use `{component}-{element}` convention. Examples:
- `inspector-badge--turn`, `sidebar-session-card`, `cns-spike-segment--success`
- NEVER use auto-generated names like `bloodbrainbarrier-ui-12` or `pfcinspector-ui-107`.
- Class names must be human-readable and describe what they style.

### Biological Naming
User-facing text uses biological metaphors. No "Mission Control", "Command Center", "Spellbook",
or military jargon. Internal code uses the most logical/descriptive names.
- "Neural Pathways" not "Spellbooks"
- "Spike Trains" not "Missions"
- "Cortex" or "Brain View" not "Mission Control"
- "Cognitive Threads" not "Reasoning Sessions" (in UI labels)

### Component File Structure
```
src/
  components/    → Reusable components (ThreePanel, NavBar, CNSSparkline, etc.)
  pages/         → Route-level page components (FrontalSession, CNSPage, PFCPage, etc.)
  hooks/         → Custom hooks (useTerminal, useSynapticCleft, useDuration, etc.)
  context/       → React contexts (GABAProvider, BreadcrumbProvider, SynapticCleftProvider)
  assets/        → Static assets
  api.ts         → apiFetch utility with CSRF and credentials
  types.ts       → TypeScript interfaces matching the DRF API response shapes
```

Each component gets a `.tsx` and a `.css` file. No CSS-in-JS. No styled-components.

### Imports
React/stdlib first, then third-party, then project imports. Alphabetical within each group.

## Common Pitfalls (Things That Have Broken Before)

### Flex Height Chain
Every flex container from `layout-shell` down to the panels MUST have `min-height: 0`.
Without it, flex items default to `min-height: auto` (content height) and panels overflow
the viewport instead of scrolling. If panels aren't scrolling, check the height chain.

### xterm.js
- **MUST import `xterm/css/xterm.css`** in any component that renders a terminal. Without it,
  the viewport has no overflow constraints and text doesn't render correctly.
- **MUST defer `terminal.open(container)` until the container has non-zero dimensions.** Use a
  `ResizeObserver` to wait for layout. Calling `open()` too early causes "Cannot read properties
  of undefined (reading 'dimensions')" errors.
- The `useTerminal` hook in `src/hooks/useTerminal.ts` handles terminal lifecycle.
- The `useSynapticCleft` hook handles Glutamate WebSocket streaming for live logs.

### BackgroundCanvas
- The 3D background (`BackgroundCanvas.tsx`) uses Three.js with OrbitControls.
- On non-root routes, `interactive={false}` disables OrbitControls and sets pointer-events none.
  Without this, the canvas steals scroll and click events from every panel.

### React Router
- The app uses `<BrowserRouter>` with `<Routes>`, NOT `createBrowserRouter`.
- Breadcrumbs are built from `useLocation().pathname` with a static segment map plus
  `BreadcrumbProvider` context for dynamic labels.
- ESC key navigates back via the `GABAProvider` escape handler system.

### API Response Shapes
The frontend `types.ts` must match the actual DRF serializer output. Key gotchas:
- `ReasoningTurn` has a nested `model_usage_record` object. Token counts, timing, and
  thought content are NOT flat fields on the turn — they live inside the usage record's
  `response_payload.choices[0].message` structure.
- `SpikeTrain` has nested `spikes` array via `SpikeTrainSerializer`.
- Always check the actual API response (hit the endpoint in browser) before assuming field names.

## Testing
- `vitest` with `jsdom` environment. Config in `vite.config.ts`.
- Tests live next to their components or in `src/__tests__/`.
- Use real DOM assertions, not snapshot tests.

## Dependencies of Note
- `react-force-graph-3d` + `three` — 3D force graph for Frontal Lobe reasoning visualization.
- `reactflow` — Graph editor for CNS Neural Pathway editing.
- `@assistant-ui/react` — Chat UI for Thalamus and Session chat.
- `d3` — Sparkline charts on CNS pathway dashboard cards.
- `xterm` + `xterm-addon-fit` + `xterm-addon-search` — Terminal emulator for spike log viewing.
- `@react-three/fiber` + `@react-three/drei` — 3D background canvas.
- `lucide-react` — Icons throughout the app.

## What NOT to Do
- Do not modify backend serializers to fix frontend display issues. The frontend reads the API as-is.
- Do not add global state management (Redux, Zustand, etc.). Use local state + context.
- Do not add new CSS frameworks or utility-class libraries.
- Do not use `useEffect` to sync URL state. React Router handles routing.
- Do not put state in `LayoutShell` or `ThreePanel`. State lives in page components.
- Do not use `alert()` for user feedback. Use proper UI patterns.
- Do not introduce new auto-generated CSS class names.