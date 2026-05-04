<p align="center">
  <a href="https://are-self.com">
    <img src="https://are-self.com/img/ui/cns-graph-hero.png" alt="The Are-Self CNS pathway editor — Begin, List Location, Frontal Lobe, Gate, Retry, and Delay nodes wired together with success and fail edges on a dotted dark canvas." width="900">
  </a>
</p>

# Are-Self UI

### The brain you can see.

**React frontend for [Are-Self](https://github.com/scipraxian/are-self-api)** — an open-source, neurologically-inspired AI reasoning swarm engine. Free. Local. Private. MIT licensed.

`Open · Local · MIT · Built solo since January 2026 · React 19 · Vite · TypeScript`

Every component maps to a brain region. The 3D pathway editor, the spike-train forensics, the Frontal Lobe's reasoning graph, the floating Thalamus chat — all of it sits on top of the Django REST Framework API in [are-self-api](https://github.com/scipraxian/are-self-api).

[**Read the site →**](https://are-self.com)  ·  [**See it run end-to-end →**](https://are-self.com/docs/end-to-end)  ·  [**Install →**](https://are-self.com/docs/quick-start)  ·  [**Come along →**](https://are-self.com/docs/state#how-to-come-along)

---

## Install

The UI repo is half of a pair — the backend ([are-self-api](https://github.com/scipraxian/are-self-api)) needs to be running for the UI to do anything interesting. Get the backend up first per its README, then:

```bash
git clone https://github.com/scipraxian/are-self-ui
cd are-self-ui
npm install
npm run dev
```

Open `http://localhost:5173`. You'll see a brain.

Full setup (one-click `are-self-install.bat` for Windows, manual step list for macOS/Linux, troubleshooting) is at **[are-self.com/docs/quick-start](https://are-self.com/docs/quick-start)**. Prerequisite: Node.js 20+.

## What you're looking at

Each route is a brain region. Each region does what its biological namesake does.

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

**Layout:** LayoutShell provides the 3D background, NavBar, page outlet, and Thalamus bubble. Most pages use the ThreePanel layout (left=navigation, center=stage, right=inspector). Some views manage their own layout.

**Real-time:** No polling anywhere. All live updates flow through the Synaptic Cleft — a WebSocket event bus with typed neurotransmitter events (Dopamine, Cortisol, Acetylcholine, Glutamate, Norepinephrine). The `useDendrite` hook subscribes to events and triggers React effects that refetch data automatically.

**Navigation:** The URL is the single source of truth. Every user action that changes what you're looking at changes the URL. F5 returns exactly where you were. ESC walks backward through the URL chain.

**State:** Local state + React context. No Redux, no Zustand. Data fetching follows a strict pattern with async functions inside `useEffect` bodies and dendrite events in dependency arrays.

**Styling:** CSS files only. No Tailwind, no utility classes. Semantic class names with `{component}-{element}` convention. Glassmorphic `.glass-surface` treatment on form containers.

## Stack

- **Framework:** React 19, Vite, TypeScript
- **3D:** react-force-graph-3d, Three.js, @react-three/fiber + drei
- **Graphs:** ReactFlow (CNS editor), D3 (sparklines)
- **Terminals:** xterm.js (spike forensics, PNS monitor)
- **Chat:** @assistant-ui/react with useLocalRuntime
- **Icons:** lucide-react

## Project structure

```
src/
  components/    Component .tsx + .css pairs
  pages/         Route-level page components
  hooks/         Custom hooks (useDendrite, useGABA, etc.)
  context/       React context providers
```

## How to come along

Are-Self is solo for now. Everyone is welcome. The mission is free local AI in the hands of the kid who otherwise wouldn't get any. There are real doors in, most of which don't go through me at all:

- **Put a machine in a kid's hands.** A used 16GB laptop runs the whole stack. Gift one to a kid in your family, your neighborhood, your school, your congregation.
- **Get a community org to deploy it.** Library, school, church, after-school program, 501(c)(3). Broker an intro to anyone who wants free AI in front of kids who don't have it.
- **Write code on the UI** — pick a `TASKS.md` item, ship a fix, build a brain-region view that doesn't exist yet. PRs on `CLAUDE.md` and the operating-notes files are welcome too.
- **Curriculum, papers, the rest of the doors** — full list at [are-self.com/docs/state#how-to-come-along](https://are-self.com/docs/state#how-to-come-along).
- **If you'd like this project to keep going at the pace it's been going** — roughly $5–7/day, out-of-pocket — sponsoring the human typing it forward is one direct lever: [GitHub Sponsors](https://github.com/sponsors/scipraxian) · [Ko-fi](https://ko-fi.com/scipraxian) · [Buy Me a Coffee](https://buymeacoffee.com/scipraxian) · [Patreon](https://patreon.com/scipraxian).

The work happens either way.

## Working with AI, in the open

This repo (and the api repo) carries a `CLAUDE.md` and a small set of operating-notes files at its root — the actual prompts, conventions, and session protocols this project uses to cooperate with AI day to day. They're committed, public, and forkable. PRs against those files are as welcome as PRs against the code; the cooperation pattern is one of the things this project wants to be good at, and the audience for that pattern is anyone who reads it.

## More

Local repo docs: [FEATURES.md](FEATURES.md) · [TASKS.md](TASKS.md)

The fuller documentation — UI walkthroughs page-by-page, brain-region deep dives, FAQ, the philosophy underneath — is at [are-self.com](https://are-self.com).

## Find us

[YouTube](https://youtube.com/@scipraxian) · [Discord](https://discord.gg/nGFFcxxV) · [Facebook](https://facebook.com/scipraxian) · [X](https://x.com/scipraxian) · [Truth Social](https://truthsocial.com/@scipraxian) · [TikTok](https://tiktok.com/@scipraxian) · [Instagram](https://instagram.com/scipraxian/) · [Reddit](https://reddit.com/user/Scipraxian/)

## License

MIT. The Grid is free.

---

If any of this caught you, the real welcome is at **[are-self.com](https://are-self.com)**. Star this if you want a kid with a laptop to be able to run a real AI swarm without paying a corporation a dime.
