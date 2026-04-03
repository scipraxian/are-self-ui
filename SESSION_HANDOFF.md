# Session Handoff — April 2, 2026

Note from the previous Claude session. Read this, then read TASKS.md and both CLAUDE.md files.

## What We Just Did (This Session)

### Hypothalamus Model Preview (completed)
Replaced the dead "AI Model" dropdown on the Identity Loadout tab with a live read-only display
showing which model the Hypothalamus routing engine would select right now.

**Backend changes:**
- `hypothalamus/hypothalamus.py` — Refactored `pick_optimal_model()` into three layers:
  - `_build_candidate_queryset(disc, payload_size, require_function_calling)` — pure query builder
  - `_select_best_from_strategy(disc, base_qs, filter_obj, strategy_obj, attempt)` — pure selection
  - `preview_model_selection(disc)` — public read-only API, zero side effects
  - `pick_optimal_model()` now calls both helpers then does ledger mutation
- `identity/api.py` — New `@action` endpoint: `GET /api/v2/identity-discs/{id}/model-preview/`
  Returns: ai_model_id, model_name, provider_name, provider_model_id, pricing

**Frontend changes:**
- `IdentitySheet.tsx` — Removed ai_model_id from form state, removed /api/v2/ai-models/ fetch,
  added ModelPreview interface + fetchModelPreview callback, model name is a Link to
  `/hypothalamus?model={ai_model_id}`, refresh button with RefreshCw icon
- `IdentitySheet.css` — Added `.loadout-model-link` styles
- `IdentityDetailStub.tsx` — Removed empty CORTICAL TELEMETRY right panel (right={null})

### Dendrite Refresh Bug (completed — BE CAREFUL HERE)
The original bug: Sync Local / Fetch Catalog / Pull didn't auto-refresh the Hypothalamus page.

**Root cause:** The backend fired `receptor_class='AIModel'` but the frontend subscribed to
`useDendrite('Acetylcholine', 'hypothalamus')`. Neither side matched the other.

**AN AGENT MADE A WRONG FIX** that we had to revert. It changed the frontend to
`useDendrite('AIModel', 'hypothalamus')` — this is an ANTIPATTERN. `AIModel` is an internal ORM
model, not a brain region. Never use raw model names as receptor_class for manual signals.

**Correct fix (what's in place now):**
- Backend (`hypothalamus/api.py`): All 4 fire_neurotransmitter calls now use
  `receptor_class='Hypothalamus'` (the brain region name)
- Frontend (`HypothalamusPage.tsx` line ~187): `useDendrite('Hypothalamus', null)`
- Convention documented in BOTH CLAUDE.md files under receptor_class rules

### Routing Tab POST Bugs (completed)
Five M2M field name mismatches in `HypothalamusRoutingInspector.tsx`. Frontend sent singular
(`required_capability_ids`) but serializer expected plural (`required_capabilities_ids`). All fixed.

### Budget Dropdown (completed)
Added to Identity Loadout tab. Key gotcha: `IdentityBudgetAssignment` uses a **OneToOneField**
to IdentityDisc, not a ForeignKey. The agent's initial serializer code called `.filter()` on the
reverse relation which doesn't work on OneToOne. Fixed to direct attribute access with
DoesNotExist catch, and `update_or_create` for writes.

### Addon + Tool Editors (scaffolded, needs expansion)
`AddonEditor.tsx` and `ToolEditor.tsx` exist with basic name/description CRUD. Integrated into
IdentitySheet with gear-icon manage buttons. Both models have MORE fields than just text —
expanding these editors is in TASKS.md under "Next Up."

### Page Scroll Fix (completed)
`.identity-sheet-container` had `overflow: hidden` clipping content. Changed to `overflow-y: auto`.

## What To Do Next

**Target: Two ship-blockers in parallel.**

### Agent 1: PFC Double-Click Drill
- Bug: Double-clicking a ticket goes to partial edit instead of full edit
- Location: Likely in `PFCPage.tsx` or `PFCDetailPage.tsx`
- This is frontend-only work

### Agent 2: Main Menu / Root Route
- The root route (`/`) currently just shows the 3D brain with no content
- Needs: Cards for latest spikes, latest sessions, system stats
- Location: Check `App.tsx` for the root route, probably renders `src/pages/` something
- Backend API endpoints already exist for all the data

## Key Architectural Rules (burned into memory this session)

1. **receptor_class convention**: Brain regions for manual signals (`'Hypothalamus'`),
   `sender.__name__` for Thalamus auto-signals (`'PFCEpic'`, `'IdentityDisc'`).
   NEVER internal ORM models. NEVER molecule types. See CLAUDE.md.

2. **DRF M2M naming**: The write-only PrimaryKeyRelatedField must match the serializer's
   field name exactly. Pattern: `foo = Serializer(read_only=True)` paired with
   `foo_ids = PrimaryKeyRelatedField(source='foo', write_only=True)`. The `_ids` suffix
   must match the pluralization of the source field.

3. **OneToOneField reverse access**: You get a single object (or DoesNotExist), NOT a queryset.
   No `.filter()`, no `.first()`. Use try/except or hasattr.

4. **Michael's style**: He values ergonomics over cleverness, biological naming over mechanical
   metaphors. He will actively correct architectural drift. When in doubt, ask.
