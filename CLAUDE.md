# CLAUDE.md — Are-Self UI

The single source of truth for any AI agent working on the are-self-ui codebase.
Read completely before making any changes.

## The Developer

Michael is a 30+ year programming veteran building Are-Self as an MIT-licensed AI reasoning
engine. The project's mission is providing free AI technology to underserved youth, with
academic interest from MIT and a PhD student collaborator at UPA. Michael has exceptional
product instincts and will actively correct architectural drift. He values ergonomics over
cleverness, biological naming over mechanical metaphors, and URL-driven navigation above all.

**Workflow:** Claude (Projects chat or Cowork) for planning and architecture → Claude Code for
implementation via self-contained prompts. Each Claude Code session gets a fresh prompt with
all necessary context. The CLAUDE.md file is read first by Claude Code every session.

## What This Is

A React + Vite + TypeScript frontend for **Are-Self**, an open-source AI reasoning engine with
neurologically-inspired architecture. Every UI component maps to a brain region. The backend is
Django REST Framework (repo: `are-self`, under `scipraxian` on GitHub). The frontend
consumes the DRF API.

**Mission:** Empower underprivileged youth in remote areas with free access to AI technology.
MIT licensed. The interface must be approachable, intuitive, and beautiful.

**Target user:** A 10-year-old with no money (or their grandma). Every design decision flows
from this. If it requires a credit card, a powerful GPU, or a CS degree — it's wrong. The
system must run on whatever hardware they have, use free models, and be approachable enough
that a child can make art and games with it.

## The Complete App Flow

Every UI view exists to support this lifecycle. Build the wrong flow, build the wrong thing.

### 1. Identity Creation → `/identity`
The user creates an **Identity** — a persistent AI persona with system prompt template, enabled
tools (M2M to ToolDefinition), addon phases (IDENTIFY, CONTEXT, HISTORY, TERMINAL), and a
**Hypothalamus AIModelSelectionFilter** for LLM routing. The Identity is a blueprint — it
doesn't work until forged into a disc.

### 2. Model Configuration → `/hypothalamus`
The **Hypothalamus** manages AI models: catalog, budget constraints, circuit breakers, failover
strategies. The user browses the model catalog (Ollama local + remote library), pulls/removes
models, edits descriptions, and configures routing profiles. The AIModelSelectionFilter on
each Identity determines model routing via vector-similarity matching, cost filters, provider
preferences.

**Key architecture:** `AIModelDescription` is the canonical description source (NOT
`AIModel.description`, which is null/deprecated). Descriptions link via M2M to models AND
families. Resolution chain: model-specific `AIModelDescription` first → family-level fallback.
Descriptions + tags + categories feed into `update_vector()` for semantic routing.

**Standalone parser:** `hypothalamus/parsing_tools/llm_provider_parser/model_semantic_parser.py`
(1121 lines, 98.4% accuracy, Django-free, MIT-licensed). Parses model identifier strings into
family, creator, roles, quantizations, sizes. Must be imported and used — never reinvent
model string parsing.

### 3. Iteration Setup → `/temporal`
The user creates an **Iteration** from a definition (blueprint) tied to an **Environment**.
Definitions have **Shift columns** (Sifting → Pre-Planning → Planning → Executing →
Post-Execution → Sleeping) with turn limits. Dragging Identities into shift columns **forges**
them into **IdentityDiscs** — deployed instances with their own level, XP, and session history.

`TemporalMatrix.tsx` manages its own three-panel internal layout: left sidebar (definitions +
iterations + gestation chamber), center (shift columns with participant cards and drag-drop
targets), right (IdentityRoster for drag source). Do NOT wrap it in ThreePanel.

**Key endpoints:**
- `POST /api/v2/iterations/{id}/slot_disc/` — `{shift_id, disc_id}` or `{shift_id, base_id}`
  (auto-forges). Returns full re-serialized iteration.
- `POST /api/v2/iterations/{id}/remove_disc/` — `{shift_id, disc_id}`. Returns full iteration.
- `POST /api/v2/iteration-definitions/{id}/slot_disc/` — same but `shift_definition_id`.
- `POST /api/v2/iteration-definitions/{id}/remove_disc/` — same pattern.
- `POST /api/v2/iterations/incept/` — `{definition_id, environment_id}`. Creates iteration.
- `POST /api/v2/iteration-definitions/{id}/incept/` — same from definition context.

### 4. Task Assignment → `/pfc`
The **Prefrontal Cortex** is the project manager. Epics → Stories → Tasks assigned to
IdentityDiscs. Board/backlog toggle with URL-driven filters, inspector for ticket detail.

### 5. The Tick Cycle (PNS → Temporal → CNS → Frontal)
The **PNS** ticks via Celery Beat → wakes **Temporal Lobe** → fires a **SpikeTrain** through
the **CNS** → **Spikes** cascade through **Neurons** → reaches the **Frontal Lobe** → starts
a **ReasoningSession** with the IdentityDisc + PFC Task → reasoning loop calls tools via
**Parietal Lobe**, stores memories via **Hippocampus**, selects models via **Hypothalamus** →
session concludes or yields → control returns up the spike chain.

### 6. Monitoring

| Route | View | Question Answered |
|-------|------|-------------------|
| `/cns` | Pathway dashboard (sparkline cards) | "Which pathways are healthy?" |
| `/cns/pathway/:pathwayId` | Train timeline (spike bars) | "What happened recently?" |
| `/cns/spiketrain/:spiketrainId` | Live graph (spike overlay on ReactFlow) | "How is this execution flowing?" |
| `/cns/spike/:spikeId` | Dual-terminal forensics (xterm.js) | "What exactly did this spike do?" |
| `/cns/spikeset?s1=&s2=` | Multi-spike comparison | "How do these streams compare?" |
| `/frontal` | Session list | "What sessions exist?" |
| `/frontal/:sessionId` | 3D graph or chat view | "What did this session think/do?" |
| `/pfc` | Agile board | "What's assigned? In progress?" |
| `/temporal` | Iteration matrix | "Who's in which shift?" |
| `/hypothalamus` | Model catalog + routing + budgets | "What models are available? What's the routing policy?" |
| `/pns` | Fleet status | "What's ticking?" |
| `/hippocampus` | Engram browser | "What does the swarm remember?" |
| `/identity` | Identity ledger | "Who are the workers?" |

### 7. Memory & Learning
The **Hippocampus** stores **Engrams** — vector-embedded facts (pgvector, 768-dim, nomic-embed-text).
Sessions produce engrams; future sessions retrieve them during HISTORY addon phase. 90% cosine
similarity dedup on save. Engrams auto-revectorize on description or tag changes. The
**EngramEditor** component provides full CRUD on the Identity Memories tab; the
**HippocampusPage** provides a global browser with search, tag filters, and inspector.

## The URL Is the Single Source of Truth

**Every user action that changes what you're looking at MUST change the URL.** Non-negotiable.
Bookmarkable, refreshable, shareable. F5 returns exactly where you were.

### Current URL Structure
```
/                                   → BrainView (3D landing, interactive)
/frontal                            → FrontalIndex (session list)
/frontal/:sessionId                 → FrontalSession (3D graph + inspector)
/cns                                → CNSPage (pathway dashboard with sparklines)
/cns/pathway/:pathwayId             → CNSTrainTimeline (spike bars)
/cns/pathway/:pathwayId/edit        → CNSEditPage (ReactFlow graph editor)
/cns/spiketrain/:spiketrainId      → CNSMonitorPage (live execution graph)
/cns/spike/:spikeId                 → CNSSpikeForensics (dual terminal)
/cns/spikeset?s1=uuid&s2=uuid      → CNSSpikeSet (multi-spike comparison)
/pfc                                → PFCPage (board/backlog toggle)
/pfc/epic/:epicId                   → PFCDetailPage (epic with child items)
/pfc/story/:storyId                 → PFCDetailPage (story with child tasks)
/temporal                           → TemporalMatrix (definition editor + iteration board)
/identity                           → IdentityLedger (disc list + IdentitySheet)
/identity/:discId                   → IdentityDetail (disc configuration)
/hippocampus                        → HippocampusPage (engram browser)
/hypothalamus                       → HypothalamusPage (model catalog + routing + budgets)
/pns                                → PNSPage (fleet overview)
/pns/monitor?w1=host&w2=host        → PNSMonitorPage (xterm grid)
/environments                       → EnvironmentEditor (CRUD + context variables)
```

### Breadcrumb Chain (Every Segment Clickable)
```
ARE-SELF › Central Nervous System › Pre-Release Run › Train #1661A1 › Pre-Release Build #0D8A52
  /          /cns                    /cns/pathway/uuid  /cns/spiketrain/uuid  /cns/spike/uuid
```

Each page sets its breadcrumbs explicitly via `setCrumbs([{label, path}, ...])` from the
`BreadcrumbProvider` context. NavBar renders what it's given — no URL parsing.

**ESC walks backward** through the URL chain via GABAProvider.

## Environment Is Global Context

The `EnvironmentProvider` context manages environment selection. The selector lives in the
NavBar. All views consume `useEnvironment()` and pass the selected environment ID to API calls.
Changing environment filters pathways, trains, iterations, tasks, sessions — everything.

**Environment is server-side state.** Selecting an environment calls
`POST /api/v2/environments/{id}/select/` which atomically sets `selected=True` on the backend.
Only one environment can be selected at a time. The environment determines how executable paths
resolve (via Django template rendering of context variables like `{{project_root}}`).

The `EnvironmentEditor` page at `/environments` provides full CRUD for environments including
inline context variable editing.

## Architecture

### Layout
- `LayoutShell.tsx`: 3D background + NavBar + `<Outlet />` + ThalamusBubble
- `NavBar.tsx`: 40px persistent bar — hamburger, logo, breadcrumbs, environment selector
- `ThreePanel.tsx`: Layout primitive for most pages (left/center/right)
- Some views own their layout: TemporalMatrix, CNSSpikeForensics, CNSSpikeSet

### Three-Panel Convention
- **Left** = Control/Navigation. Drives what center shows.
- **Center** = Stage. Primary view.
- **Right** = Inspector. Empty until something is clicked.

### Data Flow
- Frontend adapts to API, never the reverse.
- All API calls via `apiFetch` with relative paths. Vite proxy handles base URL.
- **Never hardcode 127.0.0.1.**

### Real-Time (Synaptic Cleft)

The backend fires typed **neurotransmitter** events through Django Channels (WebSocket).
The frontend subscribes with `useDendrite(receptorClass, dendriteId)`. When an event
fires, the hook returns a new ref. That ref goes into `useEffect` dependency arrays,
causing automatic refetch of the relevant data. **This is why the dendrite pattern
appears throughout the codebase — it replaces polling entirely.** No `setInterval`
anywhere in the system.

**receptor_class convention (critical):** The first arg to `useDendrite` is the
`receptor_class` — a domain entity or brain region name. Valid examples:
`'PFCEpic'`, `'IdentityDisc'`, `'ReasoningTurn'`, `'Hypothalamus'`, `'SpikeTrain'`.
**NEVER** use internal ORM models (`'AIModel'`, `'AIModelProvider'`) or molecule types
(`'Acetylcholine'`, `'Dopamine'`) as the receptor_class. Molecules are Layer 3 routing
(the neurotransmitter type), not Layer 1 (the Channels group). Brain regions that fire
manual signals use their own name: `receptor_class='Hypothalamus'`, subscribed via
`useDendrite('Hypothalamus', null)`.

Neurotransmitters (Layer 3 — molecule types, NOT receptor classes):
- **Dopamine** — success states (task completed, session concluded)
- **Cortisol** — errors/halts (spike failed, circuit breaker tripped)
- **Acetylcholine** — data sync (model refreshed, new turn recorded, catalog updated)
- **Glutamate** — streaming data (log lines, execution output)
- **Norepinephrine** — alertness/monitoring (worker heartbeats, orchestration narrative)

### Chat Integration
- **SessionChat** (`/frontal/:sessionId` in Chat mode): Scoped to a specific reasoning session.
  Posts to `/api/v2/reasoning_sessions/{id}/resume/` with `{ reply: '...' }`. Messages queue
  in `swarm_message_queue` on the session model and get injected at the next turn — works even
  while the session is actively reasoning.
- **ThalamusChat** (floating bubble, every page): Global standing session. Posts to
  `/api/v2/thalamus/interact/`. Accessible via the floating chat bubble in bottom-right corner.
- Both use `@assistant-ui/react` with `useLocalRuntime` and real-time sync via
  `useDendrite('SynapseResponse', null)`.

### Addon System (Frontend Implications)
The backend assembles LLM payloads via addons (phases: IDENTIFY→CONTEXT→HISTORY→TERMINAL).
Human messages from `swarm_message_queue` get `<<h>>\n` prepended — this tag distinguishes
human messages from addon-injected user messages (like the prompt_addon). The river_of_six
addon (Phase 3 HISTORY) only replays `<<h>>`-tagged user messages in history reconstruction.

**Frontend stripping:** The `<<h>>` prefix should be stripped before displaying messages to
the user in chat views. It's a backend routing tag, not display content.

**response_payload format:** Can be direct `{role, content}` or OpenAI-style
`{choices: [{message: {...}}]}`. The `choices` array must be preserved — don't flatten to
`choices[0]`. The frontend should handle both formats.

**Session summary_dump:** `GET /api/v2/reasoning_sessions/{id}/summary_dump/` returns a
compact text log showing full INPUT CONTEXT per turn (all addon-assembled messages) and
OUTPUT. Useful for debugging what the model saw vs what it produced.

## Style Rules (Non-Negotiable)

- **No inline styles.** CSS files only. Exceptions: dynamic positions, CSS custom properties, flexGrow from data.
- **No Tailwind mixed with CSS files.** Project uses `.css` files.
- **Semantic CSS class names.** `{component}-{element}` convention. Never auto-generated.
- **Biological naming.** No "Mission Control", "Battle Station", "Spellbook", or military jargon.
- **No nested classes.** Ever. In Python: flat module-level functions, not inner classes or
  nested class definitions. In TypeScript: flat component functions, not classes inside classes.
  Mixins and inheritance are fine. Functions are functions, methods are methods (methods need
  `self` in Python). Follow the Google Python Style Guide. If code needs to be organized,
  use separate modules — not nesting.
- **Component structure:** `.tsx` + `.css` per component. Pages in `src/pages/`, components in
  `src/components/`, hooks in `src/hooks/`, contexts in `src/context/`.
- **Imports:** React/stdlib → third-party → project. Alphabetical within groups.

### Extracted Components (Hypothalamus)
- `HypothalamusModelInspector.tsx` — editable model detail with description CRUD,
  AIModelDescription relationship management (M2M pills), provider controls, circuit
  breaker reset, enable/disable toggles.
- `HypothalamusRoutingInspector.tsx` — editable SelectionFilter with failover strategy
  dropdown, preferred/local model dropdowns, toggleable M2M pills for capabilities,
  providers, categories, tags, roles. Explicit save button.

## Backend API — Complete Endpoint List

All endpoints are at `/api/v2/`. Verify against the live API root before assuming any URL.
Most use **hyphens**; a few legacy routes use underscores. Do not "fix" casing — use what
the backend serves.

```
# CNS
spiketrains, spikes, neuralpathways, neurons, axons, effectors

# Temporal Lobe
iterations, iteration-definitions, iteration-shift-definitions, shifts

# Identity
identities, identity-discs, identity-addons, identity-tags, identity-types
budget-periods, identity-budgets

# Prefrontal Cortex
pre-frontal-item-status, pfc-tags, pfc-epics, pfc-stories, pfc-tasks, pfc-comments

# Hippocampus
engram_tags, engrams

# Frontal Lobe
reasoning_sessions, reasoning_turns

# Parietal Lobe (Tools)
tool-parameter-types, tool-use-types, tool-definitions, tool-parameters
tool-parameter-assignments, parameter-enums, tool-calls

# PNS
celery-workers

# Nerve Terminals (legacy naming)
nerve_terminal_statuses, nerve_terminal_registry
nerve_terminal_telemetry, nerve_terminal_events

# Hypothalamus
llm-providers, model-categories, model-modes, model-families
ai-models, model-providers, model-pricing, model-descriptions
usage-records, sync-status, sync-logs, model-ratings
failover-types, failover-strategies, selection-filters

# Hypothalamus Custom Actions
POST ai-models/{uuid}/pull/              → download model via Ollama
POST ai-models/{uuid}/remove/            → uninstall from Ollama (keeps DB record)
POST ai-models/{uuid}/toggle_enabled/    → flip AIModel.enabled
POST ai-models/sync_local/              → detect local Ollama models
POST ai-models/fetch_catalog/           → scrape ollama.com/library
POST model-providers/{pk}/reset_circuit_breaker/  → reset scar tissue
POST model-providers/{pk}/toggle_enabled/         → flip is_enabled

# Environments
environments, executables, context-variables, context-keys
environment-types, environment-statuses
```

## API Response Shapes

- `AIModel` returns: id (UUID), name, description (null — deprecated), `current_description`
  (resolved from AIModelDescription: model-specific first, family fallback second),
  parameter_size, context_length, enabled, deprecation_date, creator (nested: {id, name,
  description}), family (nested: {id, name, slug, description, parent}), version,
  roles (nested: [{id, name, description}]), capabilities (nested: [{id, name}]),
  quantizations (nested), categories (nested).
- `AIModelDescription` returns: id, description, is_current, created, modified,
  ai_models (nested), families (nested), categories (nested), tags (nested).
  Write via: `ai_model_ids`, `family_ids`, `category_ids`, `tag_ids`.
- `AIModelProvider` returns: id, ai_model (nested full AIModel), provider (nested
  LLMProvider), mode (nested), is_enabled, provider_unique_model_id, rate_limited_on,
  rate_limit_reset_time, rate_limit_counter, rate_limit_total_failures, max_tokens,
  max_input_tokens, max_output_tokens, disabled_capabilities.
- `AIModelSelectionFilter` returns: id, name, failover_strategy (nested with steps array,
  each step has nested failover_type), preferred_model (nested AIModelProvider or null),
  local_failover (nested AIModelProvider or null), required_capabilities (nested),
  banned_providers (nested), preferred_categories/tags/roles (nested).
  Write via: `failover_strategy_id`, `preferred_model_id`, `local_failover_id`,
  `required_capabilities_ids`, `banned_providers_ids`, `preferred_categories_ids`,
  `preferred_tags_ids`, `preferred_roles_ids`.
- `Spike` returns: id, status, status_name, neuron, effector, effector_name, spike_train,
  created, modified, target_hostname, result_code, application_log, execution_log, blackboard,
  invoked_pathway, child_trains, provenance, provenance_train.
- `SpikeTrain` has nested `spikes` array, `pathway` FK, `pathway_name`.
- `ReasoningTurn` has nested `model_usage_record` with response_payload deep inside.
- `Engram` returns: id, name, description, is_active, relevance_score, tags (nested),
  sessions (ID list), source_turns (ID list), spikes (ID list), creator (nested or null),
  identity_discs (ID list), vector (null on read), created, modified.
- Always verify fields by hitting the endpoint in browser before assuming.

## Common Pitfalls

### Flex Height Chain
Every flex container from `layout-shell` to panels MUST have `min-height: 0`. Without it,
panels overflow viewport instead of scrolling.

### pointer-events: none Inheritance
`layout-ui` has `pointer-events: none`. Every view rendering into Outlet MUST set
`pointer-events: auto` on its root. ThreePanel does this automatically. Custom layouts
(TemporalMatrix, CNSSpikeForensics, CNSSpikeSet) must do it themselves.

### xterm.js
- MUST import `xterm/css/xterm.css`.
- MUST defer `terminal.open()` via ResizeObserver until container has non-zero dimensions.
- Multiple xterm instances on same page need independent container refs.

### BackgroundCanvas
On non-root routes, `interactive={false}` disables OrbitControls and pointer events.

### PFC Inspector Scroll
`.pfc-inspector` and `.pfc-inspector-body`: `flex: none; overflow: visible`. Let ThreePanel's
right panel scroll, not the inspector body.

### API URL Naming
Most backend routes use **hyphens** (`identity-discs`, `tool-definitions`,
`iteration-definitions`). A few legacy routes use underscores (`engram_tags`,
`reasoning_sessions`, `reasoning_turns`, `nerve_terminal_*`). **Always verify the actual
URL by checking the API root** (`/api/v2/`) before assuming. Do not "fix" hyphens to
underscores or vice versa — use what the backend actually serves.

### DRF Serializer M2M / FK Writes
DRF serializers that declare a nested serializer with `read_only=True` (e.g.,
`enabled_tools = ToolDefinitionSerializer(many=True, read_only=True)`) will **silently
ignore** that field on write. If a FK or M2M field needs to be writable, add a write-only
`PrimaryKeyRelatedField` counterpart:
```python
enabled_tools = ToolDefinitionSerializer(many=True, read_only=True)
enabled_tool_ids = serializers.PrimaryKeyRelatedField(
    source='enabled_tools', queryset=ToolDefinition.objects.all(),
    many=True, write_only=True, required=False
)
```
This pattern is already applied on Identity, Temporal, Hypothalamus SelectionFilter, and
AIModelDescription serializers. **Check for it any time you add a new nested serializer.**

### ESLint / Data Fetching Pattern

The project uses `eslint-plugin-react-hooks` with `react-hooks/set-state-in-effect` enabled.
**You cannot call setState synchronously inside a useEffect body.** The pattern below is how
ALL data fetching works in this codebase. It exists because the Synaptic Cleft (WebSocket)
fires typed events when data changes, and the dendrite hook turns those events into React
dependency-array triggers. This eliminates polling entirely — data refetches automatically
when the backend says something changed.

```tsx
// Dendrite hooks subscribe to WebSocket events. When an event fires,
// the hook returns a new object ref. That ref change triggers useEffect.
// First arg is receptor_class (brain region or domain entity), NOT molecule type.
const aceEvent = useDendrite('Hypothalamus', null);
const cortEvent = useDendrite('Cortisol', 'hypothalamus');

useEffect(() => {
  if (!someId) return;
  let cancelled = false;

  const load = async () => {
    try {
      const res = await apiFetch(`/api/v2/endpoint/${someId}/`);
      if (!res.ok || cancelled) return;
      const data = await res.json();
      if (cancelled) return;
      setSomeState(data);  // OK: inside async function, not synchronous in effect body
    } catch (err) {
      console.error('Fetch failed', err);
    }
  };

  load();
  return () => { cancelled = true; };
}, [someId, aceEvent, cortEvent]);  // dendrite events as deps trigger refetch
```

**Do NOT:**
- Use `useCallback` for fetch functions and call them from effects (triggers the lint rule)
- Use intermediate `refetchTick` state bumped by dendrite effects (also triggers it)
- Use `void fetchTrain()` (same problem)

**Do:**
- Define async functions INSIDE the effect body
- Put dendrite event objects directly in the dependency array — when they change ref, the
  effect re-runs and refetches
- Use `let cancelled = false` cleanup pattern for race conditions

### Sub-Graph Drill Navigation
When navigating to a child SpikeTrain via double-click on a sub-graph node, pass parent
context through React Router navigation state:

```tsx
navigate(`/cns/spiketrain/${childTrainId}`, {
  state: {
    parentTrainId: currentTrainId,
    parentPathwayName: pathway.name,
    parentPathwayId: pathwayId,
  }
});
```

Read it back with `useLocation().state` and build breadcrumbs that include the parent chain.
When opened fresh (no navigation state), show the shorter breadcrumb — that's correct.

## Custom Neuron Nodes (CNS Graph Editor)

The CNS graph editor uses specialized ReactFlow node components for canonical effector types.
Each maps to a fixture-defined effector PK that is stable and can be depended upon.

### Architecture

**Constants file:** `src/components/nodeConstants.ts` — single source of truth for:
- `EFFECTOR` — canonical PK constants (BEGIN_PLAY=1, LOGIC_GATE=5, LOGIC_RETRY=6, LOGIC_DELAY=7, FRONTAL_LOBE=8)
- `EFFECTOR_NODE_TYPE` — maps PK → ReactFlow node type string (e.g., 5 → 'gateNode')
- `EFFECTOR_STYLE` — maps PK → `{color, label}` for visual identity
- `EFFECTOR_DEFAULTS` — maps PK → default NeuronContext key/value pairs posted on drop

**Shared hook:** `src/components/useNeuronContext.ts` — fetches and edits NeuronContext for a neuron.
Used by all custom nodes. Pattern: fetch from `/api/v1/neurons/{id}/inspector_details/` on mount,
update via search-then-create/patch/delete on `/api/v1/node-contexts/`. Dispatches
`cns-context-changed` CustomEvent for inspector panel sync.

**Shared CSS:** `src/components/CustomNeuronNodes.css` — Unreal Engine blueprint-style structural
CSS used by all 4 custom nodes. Solid colored headers, dark bodies, inline editable fields,
port layout matching existing NeuronNode handle sizes. Uses `--readonly` modifier class.

### Node Components

| Component | Effector PK | Color | Icon | Editable Fields |
|-----------|-------------|-------|------|-----------------|
| `GateNeuronNode.tsx` | 5 | Teal (#06b6d4) | GitBranch | gate_key, gate_operator, gate_value |
| `RetryNeuronNode.tsx` | 6 | Amber (#f59e0b) | RotateCw | max_retries, retry_delay |
| `DelayNeuronNode.tsx` | 7 | Indigo (#6366f1) | Clock | delay |
| `FrontalLobeNeuronNode.tsx` | 8 | Purple (#a855f7) | Brain | identity_disc (select), prompt (textarea) |

### Type Resolution

`CNSEditor.tsx` resolves node types via `EFFECTOR_NODE_TYPE[neuron.effector]`, falling back to
generic `'neuron'` type. This replaces the old executable slug matching. On drop, default context
values from `EFFECTOR_DEFAULTS` are POSTed to `/api/v1/node-contexts/` so new logic nodes start
with sensible defaults (e.g., gate_operator='exists', max_retries='3').

### Monitor View

`NeuronMonitorNode.tsx` receives `effectorId` from `CNSMonitorPage.tsx` and uses `EFFECTOR_STYLE`
+ a local `EFFECTOR_ICON` map for visual consistency between editor and viewer. The monitor shows
type badge, accent color, and icon alongside the standard spike status indicators.

### Backend Mirror

Python constants in `central_nervous_system/models.py` (`Effector.BEGIN_PLAY`, `.LOGIC_GATE`, etc.)
mirror the TypeScript constants. Fixture PKs are stable — never change an existing canonical PK.
The Frontal Lobe was moved from PK 171 to PK 8 in Session 5 for consistency with the 5-8 range.

## Dependencies
- `react-force-graph-3d` + `three` — 3D force graph (Frontal Lobe)
- `reactflow` — Graph editor (CNS)
- `@assistant-ui/react` — Chat UI (Thalamus)
- `d3` — Sparkline charts (CNS dashboard)
- `xterm` + `xterm-addon-fit` + `xterm-addon-search` — Terminal emulator
- `@react-three/fiber` + `@react-three/drei` — 3D background
- `lucide-react` — Icons

## What NOT to Do
- Do not modify backend serializers for frontend display issues.
- Do not add Redux/Zustand. Use local state + context.
- Do not add CSS frameworks or utility-class libraries.
- Do not use useEffect to sync URL state. React Router handles routing.
- Do not put state in LayoutShell or ThreePanel.
- Do not wrap TemporalMatrix in ThreePanel.
- Do not use setInterval for data refresh.
- Do not use the word "battle" or military jargon anywhere.
- Do not introduce auto-generated CSS class names.
- Do not assume API URL casing — verify against the live API root.
- Do not add `read_only=True` nested serializers without a write-only counterpart if the field needs to be writable.
- Do not nest classes inside other classes. Ever. Use flat module-level functions and separate files.
- Do not reinvent model string parsing — import and use the standalone parser.
- Do not read `AIModel.description` — it is null/deprecated. Use `current_description` (resolved from AIModelDescription).
- Do not delete AIModel or AIModelProvider records — disable them instead (enabled=False, is_enabled=False).
- Do not mix fixture data across apps — each Django app has its own `fixtures/initial_data.json`.

## Current State (April 2026)

**What works:** Every brain region has a functional UI. The full drill chain works: Identity →
Temporal → PFC → CNS → Frontal → Hippocampus. Real-time updates via useDendrite throughout.
Hypothalamus model catalog with sync, pull, routing, and budget tabs. All navigation is
URL-driven and bookmarkable.

**Top priority:** Image and audio manipulation capabilities via CNS effectors. Frontend implications:
image preview in spike forensics when effector result is an image path, audio playback widget for
WAV/MP3 results, modality indicator on Identity Loadout showing what each disc is attuned to
(art, audio, code). Generation effector node (awaiting backend PoC).

**What's in progress:** See TASKS.md. Key items: reasoning view rethink, graph editor right-click
context menu, temporal URL-driven selection. Recently completed (Session 5): 4 custom neuron node
components (Gate, Retry, Delay, Frontal Lobe) with inline editing and PK-based type resolution.
CNSEditor and NeuronMonitorNode updated for effector-aware visuals in both editor and viewer.
Session 4: EnvironmentEditor "+ Key" button. Earlier: tool call rendering overhaul, addon/tool
editor expansion, Identity scroll fix, SelectionFilter/Budget click-throughs to Hypothalamus.

**Legacy remnants:** The backend repo was recently renamed from `talos` to `are-self`. Some
internal references may still use old naming. The backend CLAUDE.md has the full naming sweep
status.

## Documentation

See [FEATURES.md](FEATURES.md) for a complete list of what's built.
See [TASKS.md](TASKS.md) for what's next.