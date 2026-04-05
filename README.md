# Are-Self UI

**The brain you can see.**

React frontend for [Are-Self](https://github.com/scipraxian/are-self-api), an open-source AI reasoning engine with
neurologically-inspired architecture. Every UI component maps to a brain region. The backend is Django REST Framework —
this repo consumes the DRF API.

## Quick Start

### Prerequisites

- Node.js 20+
- The Are-Self backend running (see [are-self-api](https://github.com/scipraxian/are-self-api))

### Install and run

```bash
git clone https://github.com/scipraxian/are-self-ui.git
cd are-self-ui
npm install
npm run dev
```

Open `http://localhost:5173`. You'll see a brain.

## What You're Looking At

Each route is a brain region. Each brain region does what its biological namesake does.

| Route | Brain Region | What It Shows |
|---|---|---|
| `/` | Brain | 3D interactive landing page |
| `/identity` | Identity | AI persona creation and configuration |
| `/temporal` | Temporal Lobe | Iteration setup — shifts, participants, drag-and-drop |
| `/pfc` | Prefrontal Cortex | Agile board — epics, stories, tasks |
| `/hypothalamus` | Hypothalamus | Model catalog, routing, budgets, circuit breakers |
| `/cns` | Central Nervous System | Execution engine — pathway dashboards, spike forensics |
| `/frontal` | Frontal Lobe | Reasoning sessions — 3D graph or chat view |
| `/hippocampus` | Hippocampus | Memory browser — vector-embedded engrams |
| `/pns` | Peripheral Nervous System | Fleet monitoring — worker cards, terminal grid |
| `/environments` | — | Project context management |

The Thalamus chat bubble floats on every page — talk to the system from anywhere.

## Architecture

**Layout:** LayoutShell provides the 3D background, NavBar, page outlet, and Thalamus bubble. Most pages use the
ThreePanel layout (left=navigation, center=stage, right=inspector). Some views manage their own layout.

**Real-time:** No polling anywhere. All live updates flow through the Synaptic Cleft — a WebSocket event bus with typed
neurotransmitter events (Dopamine, Cortisol, Acetylcholine, Glutamate, Norepinephrine). The `useDendrite` hook
subscribes to events and triggers React effects that refetch data automatically.

**Navigation:** The URL is the single source of truth. Every user action that changes what you're looking at changes
the URL. F5 returns exactly where you were. ESC walks backward through the URL chain.

**State:** Local state + React context. No Redux, no Zustand. Data fetching follows a strict pattern with async
functions inside `useEffect` bodies and dendrite events in dependency arrays.

**Styling:** CSS files only. No Tailwind, no utility classes. Semantic class names with `{component}-{element}`
convention. Glassmorphic `.glass-surface` treatment on form containers.

## Stack

- **Framework:** React 19, Vite, TypeScript
- **3D:** react-force-graph-3d, Three.js, @react-three/fiber + drei
- **Graphs:** ReactFlow (CNS editor), D3 (sparklines)
- **Terminals:** xterm.js (spike forensics, PNS monitor)
- **Chat:** @assistant-ui/react with useLocalRuntime
- **Icons:** lucide-react

## Project Structure

```
src/
  components/    Component .tsx + .css pairs
  pages/         Route-level page components
  hooks/         Custom hooks (useDendrite, useGABA, etc.)
  context/       React context providers
```

## Documentation

See [FEATURES.md](FEATURES.md) for a complete list of what's built.
See [TASKS.md](TASKS.md) for what's next.

## License

MIT. Free as in freedom, free as in beer.

## Contributing

Are-Self is built by [Michael](https://github.com/scipraxian) with the mission of making AI accessible to underserved
communities. Contributions welcome — especially from educators, students, and anyone who believes AI should be a public
good.
