---
phase: 01-core-canvas
plan: 02
subsystem: state-management
tags: zustand, immer, excalidraw, vttest, history, ai-element, canvas-store, undo-redo

# Dependency graph
requires:
  - phase: 01-core-canvas (Plan 01)
    provides: monorepo, vendored Excalidraw, shared types (AIElement, CanvasSerializedState), web app skeleton
provides:
  - CanvasStore (Zustand v5 + Immer) with element/viewport/selection state, elementOrder, excalidrawAPI reference
  - HistoryStore with 180ms merge window, pause-during-drag, 50 snapshot max depth
  - AIElement type ("ai-image") added to Excalidraw's ElementType union with placeholder rendering
  - Store stubs for NodeGraphStore, AIQueueStore, UIPreferencesStore (future phases)
  - 21 passing Vitest unit tests for all stores
affects:
  - Phase 01 Plan 03: CanvasWrapper uses CanvasStore.setElements/setExcalidrawAPI
  - Phase 01 Plan 04: LayerPanel reads elementOrder, uses excalidrawAPI for scene updates
  - Phase 02: HistoryStore accepts node graph snapshots alongside canvas
  - Phase 03+: AIElement rendering (placeholder registered; full rendering deferred)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Zustand v5 with Immer middleware for mutable-syntax store updates
    - Zustand without Immer for simple stores (HistoryStore)
    - Cross-plan wiring via optional state + setter (excalidrawAPI, elementOrder)
    - TDD (RED/GREEN) for store implementation
    - Fake timers for time-dependent store tests (merge window)

key-files:
  created:
    - apps/web/src/stores/canvasStore.ts
    - apps/web/src/stores/historyStore.ts
    - apps/web/src/stores/stubs/nodeGraphStore.ts
    - apps/web/src/stores/stubs/aiQueueStore.ts
    - apps/web/src/stores/stubs/uiPreferencesStore.ts
    - apps/web/src/stores/stubs/index.ts
    - apps/web/src/test/stores/canvasStore.test.ts
    - apps/web/src/test/stores/historyStore.test.ts
    - apps/web/src/test/stores/stubs/stores.test.ts
  modified:
    - packages/excalidraw/src/element/types.ts
    - packages/excalidraw/src/renderer/renderElement.ts
    - packages/excalidraw/src/element/newElement.ts
    - packages/excalidraw/FORK_CHANGES.md
    - apps/web/package.json

key-decisions:
  - "CanvasStore uses Zustand v5 + Immer for direct mutation syntax (simpler set() reducers)"
  - "HistoryStore uses Zustand WITHOUT Immer (simple flat state, no deep mutation needed)"
  - "setElements clears and rebuilds both elements map and elementOrder array from input"
  - "serialize() outputs elements in elementOrder sequence, strips transient props (isSelected, dragging, measured)"
  - "excalidrawAPI initialized as null, populated by Plan 03 CanvasWrapper; elementOrder populated by setElements"
  - "AIElement base type (ExcalidrawAIImageElement) added to Excalidraw's element system; full interface stays in packages/shared"
  - "renderAIPlaceholder uses absolute positioned drawing (not element-relative) for correct canvas placement"

patterns-established:
  - "Cross-plan store contract: downstream plans rely on excalidrawAPI and elementOrder being available from Plan 02"
  - "TDD store tests: test file created first (RED), stores implemented to pass (GREEN)"
  - "Fake timers for history tests: vi.useFakeTimers() + vi.advanceTimersByTime(200) to exceed merge window"
  - "Store reset in beforeEach: CanvasStore.setState({...}) to restore initial state between tests"

requirements-completed:
  - CANVAS-01
  - CANVAS-02
  - CANVAS-05

# Metrics
duration: 5min
completed: 2026-06-29
---

# Phase 01 Plan 02: Core State Management Summary

**CanvasStore + HistoryStore (Zustand v5) with 21 passing tests; AIElement type integrated into Excalidraw fork with placeholder rendering; cross-plan store contracts established (excalidrawAPI, elementOrder)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-06-29T17:35:00Z
- **Completed:** 2026-06-29T17:40:00Z
- **Tasks:** 3
- **Files modified:** 14 (7 created, 5 modified, 2 package deps)

## Accomplishments

- CanvasStore manages element state (elements map, viewport, selection, isDragging) with 10 actions, including `elementOrder` and `excalidrawAPI` for cross-plan wiring (Plan 03/04)
- HistoryStore provides undo/redo with 180ms debounce merge window, pause-during-drag, 50 snapshot max depth via structuredClone; snapshots are filtered to remove transient Excalidraw properties (isSelected, dragging, measured)
- "ai-image" type added to Excalidraw's `ElementType` union, `ExcalidrawAIImageElement` base type defined, render dispatch added with placeholder visual (indigo dashed border + status label), `newAIElement()` factory function added
- Store stubs created for NodeGraphStore (Phase 2), AIQueueStore (Phase 3/5), UIPreferencesStore (Phase 7)
- All 21 Vitest tests pass: 9 CanvasStore, 9 HistoryStore, 3 stub store tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Create test files for stores (TDD RED)** - `82f1c15` (test)
2. **Task 2: Add AIElement type to vendored Excalidraw fork** - `1e3f520` (feat)
3. **Task 3: Implement CanvasStore and HistoryStore (TDD GREEN)** - `102a452` (feat)

## Files Created/Modified

### Excalidraw Fork Modifications
- `packages/excalidraw/src/element/types.ts` - Added `ExcalidrawAIImageElement` type (`type: "ai-image"`) and added it to the `ExcalidrawElement` union
- `packages/excalidraw/src/renderer/renderElement.ts` - Added `case "ai-image":` render branch calling `renderAIPlaceholder()` which draws an indigo dashed border (#6366f1), semi-transparent background, and status label with prompt text
- `packages/excalidraw/src/element/newElement.ts` - Added `newAIElement()` factory function with defaults for AI-specific fields (prompt, aiProvider, generationParams, generationStatus, imageBlobId)
- `packages/excalidraw/FORK_CHANGES.md` - Added 3 entries for the modified files

### Store Implementations
- `apps/web/src/stores/canvasStore.ts` - Zustand v5 + Immer store: elements (Record), viewport, selectedElementIds, isDragging, elementOrder (string[]), excalidrawAPI (any | null); 10 actions including cross-plan `setExcalidrawAPI()`
- `apps/web/src/stores/historyStore.ts` - Zustand store (no Immer): snapshot stack, 180ms merge window, max 50 entries, pause flag, undo/redo that calls CanvasStore.loadSerialized()

### Store Stubs
- `apps/web/src/stores/stubs/nodeGraphStore.ts` - Export `useNodeGraphStore`, empty Record state (Phase 2)
- `apps/web/src/stores/stubs/aiQueueStore.ts` - Export `useAIQueueStore`, empty array state (Phase 3/5)
- `apps/web/src/stores/stubs/uiPreferencesStore.ts` - Export `useUIPreferencesStore`, theme 'light' default (Phase 7)
- `apps/web/src/stores/stubs/index.ts` - Barrel re-export of all stubs

### Test Files
- `apps/web/src/test/stores/canvasStore.test.ts` - 9 tests: setElements, updateElement, addElement, removeElements, serialize, loadSerialized, setViewport, setIsDragging, setExcalidrawAPI
- `apps/web/src/test/stores/historyStore.test.ts` - 9 tests: captureSnapshot, undo, redo, merge window (180ms), setPaused, max 50 snapshots, clear, undo no-op at start, redo no-op at end
- `apps/web/src/test/stores/stubs/stores.test.ts` - 3 tests: NodeGraphStore export, AIQueueStore export, UIPreferencesStore export

## Decisions Made

- **CanvasStore uses Zustand v5 + Immer middleware**: Direct mutation syntax for set() reducers is cleaner than returning partial state objects. Immer is already in the dependency tree.
- **HistoryStore uses Zustand without Immer**: The state shape (snapshots array + currentIndex + flags) is simple enough that returning partial state objects is clearer than Immer mutation.
- **setElements clears and rebuilds both elements map and elementOrder**: This ensures elementOrder stays synchronized with the elements map. Downstream consumers (Plan 04 LayerPanel) can iterate elementOrder for z-order.
- **serialize() outputs in elementOrder sequence**: Preserves element ordering through save/restore roundtrip. Filters transient Excalidraw props (isSelected, dragging, measured) to prevent history corruption (Pitfall 5 mitigation).
- **excalidrawAPI initialized as null**: Cross-plan contract established. Plan 03 CanvasWrapper populates it via setExcalidrawAPI(). Plan 04 uses it for scene updates.
- **renderAIPlaceholder uses translated context**: The element's x/y is incorporated via context.translate before drawing, matching Excalidraw's rendering pattern for other element types. This is critical for correct canvas positioning.
- **Fake timers for time-dependent tests**: vi.useFakeTimers() + vi.advanceTimersByTime() allows testing the 180ms merge window without real delays.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing dev dependencies (jsdom, @testing-library/jest-dom)**
- **Found during:** Task 1 (Running vitest tests)
- **Issue:** Vitest configured with `environment: 'jsdom'` but jsdom was not installed. Setup file imported `@testing-library/jest-dom/vitest` which was also missing.
- **Fix:** Ran `pnpm add -D jsdom` and `pnpm add -D @testing-library/jest-dom`
- **Files modified:** apps/web/package.json, pnpm-lock.yaml
- **Verification:** Vitest runs correctly, all 3 test files discovered
- **Committed in:** 82f1c15 (Task 1 commit)

**2. [Rule 1 - Bug] HistoryStore set() updaters used Immer-style mutation on non-Immer store**
- **Found during:** Task 3 (Running historyStore tests)
- **Issue:** HistoryStore (no Immer middleware) used `set((s) => { s.snapshots = [...]; s.currentIndex = x })` which returns undefined -- Zustand requires returning partial state or using Immer
- **Fix:** Replaced Immer-style mutator patterns with partial state returns: `set({ snapshots: [...], currentIndex: x })`
- **Files modified:** apps/web/src/stores/historyStore.ts
- **Verification:** All 9 HistoryStore tests pass after fix
- **Committed in:** 102a452 (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered

- **Time-dependent HistoryStore tests (Tests 11, 12) initially failed**: Consecutive `captureSnapshot()` calls within <180ms triggered the merge window, causing only 1 snapshot to be created instead of 2. Fixed by using `vi.useFakeTimers()` + `vi.advanceTimersByTime(200)` between captures.
- **Stores directory didn't exist**: Created manually (`mkdir -p apps/web/src/stores/stubs/`) as part of Task 3.

## Stub Tracking

| Stub | File | Reason | Resolution |
|------|------|--------|------------|
| AIElement rendering | packages/excalidraw/src/renderer/renderElement.ts | `renderAIPlaceholder` draws dashed border + label; no real image decoding | Intentional - full AI rendering in Phases 4-5 |
| NodeGraphStore | apps/web/src/stores/stubs/nodeGraphStore.ts | Empty Record state (nodes: {}, edges: {}) | Intentional - Phase 2 activation |
| AIQueueStore | apps/web/src/stores/stubs/aiQueueStore.ts | Empty array state (items: []) | Intentional - Phase 3/5 activation |
| UIPreferencesStore | apps/web/src/stores/stubs/uiPreferencesStore.ts | Minimal theme state | Intentional - Phase 7 activation |

## Next Phase Readiness

- CanvasStore with `setExcalidrawAPI()` ready for Plan 03 CanvasWrapper to store the Excalidraw imperative API reference
- `elementOrder` array populated by `setElements()` ready for Plan 04 LayerPanel to render sorted layer list
- AIElement placeholder rendering registered in Excalidraw render pipeline -- Plan 03+ can create and display "ai-image" elements with status feedback
- HistoryStore ready for Phase 2 extension to include node graph snapshots alongside canvas state
- 21 passing tests provide regression protection for downstream plans

---
*Phase: 01-core-canvas*
*Completed: 2026-06-29*
