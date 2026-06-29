---
phase: 01-core-canvas
plan: 04
subsystem: ui
tags: react, zustand, immer, excalidraw, layer-management

# Dependency graph
requires:
  - phase: 01-core-canvas-03
    provides: CanvasWrapper with excalidrawAPI callback, App.tsx shell
provides:
  - LayerPanel sidebar component for element layer management
  - CanvasStore layer management actions (reorder, lock, hide, group, delete)
  - _updateExcalidrawScene helper propagating store changes to Excalidraw scene
affects: phase-07-application-ui (LayerPanel styling refinement)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "LayerPanel uses useShallow fine-grained selectors (D-24)"
    - "Layer operations dispatch through CanvasStore and propagate to Excalidraw via excalidrawAPI.updateScene()"
    - "Hide/show uses opacity + customData.hidden instead of isDeleted (avoids Excalidraw soft deletion)"

key-files:
  created:
    - apps/web/src/components/LayerPanel.tsx
  modified:
    - apps/web/src/stores/canvasStore.ts
    - apps/web/src/App.tsx

key-decisions:
  - "Hide/show uses element opacity (0 -> 5/100) + customData.hidden flag instead of isDeleted, because Excalidraw filters isDeleted elements from getSceneElements() making them unrecoverable from the UI"
  - "LayerPanel is a standalone React component communicating through CanvasStore (D-08), not embedded in Excalidraw source"
  - "All element-modifying actions (move, lock, hide, group, ungroup) call _updateExcalidrawScene(state) which reads excalidrawAPI from store and calls api.updateScene() with captureUpdate: 'never'"

patterns-established:
  - "Container/store pattern: LayerPanel reads state via fine-grained selectors, dispatches actions directly to store. Store actions mutate state and propagate to Excalidraw scene in one transaction."
  - "Cross-plan contract fulfilled: Plan 03 setExcalidrawAPI -> Plan 04 _updateExcalidrawScene reads it"

requirements-completed: [CANVAS-03]

# Metrics
duration: 8min
completed: 2026-06-29
---

# Phase 01-core-canvas Plan 04: Layer Panel Summary

**LayerPanel sidebar with reorder, lock, hide, group, and delete operations; all actions propagate to Excalidraw's scene via the shared excalidrawAPI bridge in CanvasStore**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-29
- **Completed:** 2026-06-29
- **Tasks:** 3
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- Extended CanvasStore with 8 new layer management actions (moveElementUp/Down/ToTop/ToBottom, toggleElementLock, toggleElementHide, groupElements, ungroupElement) plus `_updateExcalidrawScene` helper
- Created LayerPanel React component with element type icons, hover controls, and batch group action
- Mounted LayerPanel as a left sidebar in App.tsx with flex layout alongside CanvasWrapper
- All element-modifying actions call `_updateExcalidrawScene(state)` which reads the stored `excalidrawAPI` (populated by Plan 03) and calls `api.updateScene()` with `captureUpdate: 'never'`
- Hide/show implemented via element opacity + `customData.hidden` flag instead of `isDeleted` (which causes Excalidraw soft deletion)
- Fine-grained selectors (D-24) using `useShallow` throughout LayerPanel
- Hybrid approach (D-07): LayerPanel for batch operations + Excalidraw native context menu preserved for quick actions

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend CanvasStore with layer management actions** - `16efef5` (feat)
2. **Task 2: Create LayerPanel component with full layer operations** - `2e63563` (feat)
3. **Task 3: Mount LayerPanel in the App component tree** - `356e648` (feat)

## Files Created/Modified

- `apps/web/src/stores/canvasStore.ts` - Added 8 layer action signatures + implementations, `_updateExcalidrawScene` helper function
- `apps/web/src/components/LayerPanel.tsx` - New LayerPanel sidebar component with type icons, hover controls, group batch action, empty state
- `apps/web/src/App.tsx` - Imported LayerPanel, changed from full-viewport to flex layout with LayerPanel as left sidebar

## Decisions Made

- **Hide/show mechanism:** Uses `opacity` (set to 5 for hidden, 100 for visible) and `customData.hidden` flag. Excalidraw's `isDeleted` field filters elements from `getSceneElements()` and scene rendering, making them unrecoverable from UI. The opacity approach keeps elements in the scene while visually hiding them.
- **_updateExcalidrawScene propagation:** All element-modifying actions call this shared helper instead of each action implementing its own scene sync. The helper reads `state.excalidrawAPI` (populated by Plan 03's CanvasWrapper via the `setExcalidrawAPI` action) and calls `api.updateScene()` with `captureUpdate: 'never'` to avoid polluting the undo stack.
- **Fine-grained selectors:** LayerPanel uses `useShallow()` with narrow selectors to prevent re-render cascade (D-24). Action functions are subscribed individually (primitive references) while element/selection arrays use `useShallow()`.
- **Hybrid approach (D-07):** LayerPanel provides batch operations (reorder, group, lock, hide, delete). Excalidraw's native context menu remains intact for quick individual operations.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Verification

- `_updateExcalidrawScene` is called from all 8 element-modifying actions: moveElementUp, moveElementDown, moveElementToTop, moveElementToBottom, toggleElementLock, toggleElementHide, groupElements, ungroupElement
- `toggleElementHide` uses `customData?.hidden` (NOT `isDeleted`)
- `_updateExcalidrawScene` has null-guard for `excalidrawAPI` (`if (!api) return`)
- LayerPanel exports as a named function component with `useShallow` fine-grained selectors
- App.tsx imports LayerPanel and renders it as a left sidebar before CanvasWrapper
- `npx vite build` completes successfully

## Next Phase Readiness

- CanvasStore now supports complete element lifecycle: create (addElement), read (elements + elementOrder), update (updateElement + all layer ops), delete (removeElements)
- Layer operations propagate correctly to Excalidraw scene
- LayerPanel provides the UI surface for CANVAS-03 requirements
- Ready for Plan 05 (chunk rendering performance improvements) or subsequent layer-related work

---
*Phase: 01-core-canvas*
*Completed: 2026-06-29*
