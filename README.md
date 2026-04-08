# Are-Self UI

**The brain you can see.**

React frontend for [Are-Self](https://github.com/scipraxian/are-self-api), an open-source AI reasoning engine with
neurologically-inspired architecture. Every UI component maps to a brain region. The backend is Django REST Framework —
this repo consumes the DRF API.

## 📺 See It In Action

[![Are-Self — The Grid Is Free](https://img.youtube.com/vi/UUX-T2aTZlI/maxresdefault.jpg)](https://youtu.be/UUX-T2aTZlI)

**Full documentation, guides, and FAQ:** [are-self.com](https://are-self.com)

---

## Quick Start

### Prerequisites

- **Node.js 20+**
- **Python 3.12+** (required by the backend)
- **Docker Desktop** (required by the backend for PostgreSQL + Redis)
- The Are-Self backend running (see [are-self-api](https://github.com/scipraxian/are-self-api))

#### Installing Node.js

1. Go to [https://nodejs.org](https://nodejs.org)
2. Download the **LTS** version (make sure it's 20 or higher — it will say the version number on the button).
3. Run the installer:
   - **Windows:** Run the `.msi` file. Click Next through the prompts. Make sure "Add to PATH" is checked (it is by default).
   - **Mac:** Run the `.pkg` file. Follow the prompts — it installs everything you need.
   - **Linux:** The easiest way is through NodeSource. Run these commands in your terminal:
     ```bash
     curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
     sudo apt-get install -y nodejs
     ```
     For other distros, see [https://nodejs.org/en/download/package-manager](https://nodejs.org/en/download/package-manager).
4. Verify it works by opening a **new** terminal window and running:
   ```
   node --version
   ```
   You should see `v20.x.x` or higher.

#### Installing Python

Python is needed by the Are-Self backend. Even though you're setting up the frontend here, the backend won't run without it.

1. Go to [https://www.python.org/downloads/](https://www.python.org/downloads/)
2. Download Python **3.12 or higher** (the big yellow button usually has the latest version — check that the number starts with 3.12 or above).
3. Run the installer:
   - **Windows:** Run the `.exe` file. **Important:** On the very first screen, check the box that says "Add python.exe to PATH" — this is easy to miss and things will break without it. Then click "Install Now".
   - **Mac:** Run the `.pkg` file and follow the prompts. If you have Homebrew, you can also run:
     ```bash
     brew install python@3.12
     ```
   - **Linux (Ubuntu/Debian):**
     ```bash
     sudo apt update
     sudo apt install python3.12 python3.12-venv python3-pip
     ```
     For other distros, see [https://www.python.org/downloads/](https://www.python.org/downloads/) or use your package manager.
4. Verify it works by opening a **new** terminal window and running:
   ```
   python --version
   ```
   You should see `Python 3.12.x` or higher. On Linux/Mac you may need to use `python3 --version` instead.

#### Installing Docker Desktop

Docker is needed by the Are-Self backend to run PostgreSQL and Redis. Even though you're setting up the frontend here, the backend won't start without it.

1. Go to [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
2. Download the installer for your operating system:
   - **Windows:** Click "Download for Windows". Run the `.exe` installer and follow the prompts. You may need to enable WSL 2 when asked — the installer will guide you.
   - **Mac:** Click "Download for Mac". Choose **Apple chip** if you have an M1/M2/M3/M4 Mac, or **Intel chip** if you have an older Mac. Open the `.dmg` file and drag Docker to your Applications folder.
   - **Linux:** Follow the instructions for your distro at [https://docs.docker.com/desktop/install/linux/](https://docs.docker.com/desktop/install/linux/). For Ubuntu/Debian, there's a `.deb` package you can download and install directly.
3. Open Docker Desktop after installing. It needs to be running before you start the Are-Self backend.
4. Verify it works by opening a terminal and running:
   ```
   docker --version
   ```
   You should see something like `Docker version 27.x.x`.

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
See [are-self.com](https://are-self.com) for the full documentation site with guides, FAQ, and videos.

## License

MIT. Free as in freedom, free as in beer.

## Contributing

Are-Self is built by [Michael](https://github.com/scipraxian) with the mission of making AI accessible to underserved
communities. Contributions welcome — especially from educators, students, and anyone who believes AI should be a public
good.
