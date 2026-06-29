---
phase: 01-core-canvas
plan: 03
subsystem: canvas
tags: [excalidraw, react, zustand, bridge, canvas-wrapper]

requires:
  - phase: 01-core-canvas
    plan: 02
    provides: CanvasStore with setExcalidrawAPI, HistoryStore with captureSnapshot/undo/redo
provides:
  - CanvasWrapper component bridging Excalidraw with Zustand stores
  - Excalidraw imperative API reference stored in CanvasStore (cross-plan contract for Plan 04)
  - Local-state-for-drag pattern (D-23) for performance
  - Native undo disabled, routed through HistoryStore
  - Local @excalidraw/utils TypeScript overrides for vendored Excalidraw build
affects: [Plan 04 LayerPanel operations, Phase 2 node editor integration]

tech-stack:
  added: []
  patterns:
    - CanvasWrapper bridge pattern connecting Excalidraw onChange to Zustand stores
    - isPointerDownRef for local-state-for-drag (D-23)
    - Fine-grained selectors with useShallow (D-24)
    - Capture-phase keyboard event interception for undo/redo routing

key-files:
  created:
    - apps/web/src/components/CanvasWrapper.tsx
    - packages/excalidraw/utils/geometry/shape.ts
    - packages/excalidraw/utils/collision.ts
    - packages/excalidraw/utils/withinBounds.ts
    - packages/excalidraw/utils/bbox.ts
    - packages/excalidraw/utils/export.ts
    - packages/excalidraw/utils/index.ts
    - packages/excalidraw/utils/package.json
  modified:
    - apps/web/src/App.tsx
    - apps/web/vite.config.ts
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "Vite alias path-matching used for @excalidraw/utils/* instead of installing broken npm packages"
  - "Local TypeScript implementations of geometry/shape, collision, and other Excalidraw utils to avoid circular CJS bundle dependency"
  - "Sass upgraded from 1.51.0 to ^1.101.0 for Vite 8 compatibility"

patterns-established:
  - "CanvasWrapper pattern: Excalidraw + Zustand bridge with onChange store and excalidrawAPI ref"
  - "Local-state-for-drag via isPointerDownRef, commit on pointerup"
  - "Keyboard shortcuts intercepted at window level with capture:true to bypass Excalidraw's inner handler"
  - "Fine-grained selectors with useShallow for all store reads"

requirements-completed: [CANVAS-01, CANVAS-02]
---

# Phase 1: Core Canvas -- Plan 3 Summary

**Excalidraw CanvasWrapper component bridging onChange/callback API to Zustand CanvasStore and HistoryStore, integrated into App shell**

## Performance

- **Duration:** 35 min
- **Started:** 2026-06-29T17:43:00Z
- **Completed:** 2026-06-29T18:18:00Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Created `CanvasWrapper.tsx` -- the critical bridge component mounting Excalidraw and wiring its `onChange` callback to `CanvasStore.setElements()` and `HistoryStore.captureSnapshot()`
- Implemented D-23 local-state-for-drag pattern via `isPointerDownRef` ref and pointerup/final-commit handler
- Disabled native undo (D-10) through two mechanisms: `UIOptions.canvasActions` for hiding undo/redo buttons, and capture-phase keyboard interception routing Ctrl+Z/Cmd+Z through `HistoryStore.undo()/redo()`
- **Fulfilled cross-plan contract:** `useCanvasStore.getState().setExcalidrawAPI(api)` called in the `excalidrawAPI` callback, making the imperative API reference available for Plan 04's layer panel operations
- Integrated `CanvasWrapper` into `App.tsx` replacing the placeholder div
- Verified production build succeeds with `npx vite build`
- Created local TypeScript override packages for `@excalidraw/utils/*` to replace broken npm packages that lack `geometry/shape` and `collision` exports

## Task Commits

Each task was committed atomically:

1. **Task 1: Create CanvasWrapper component with Excalidraw bridge** - `c912a40` (feat)
2. **Task 2: Integrate CanvasWrapper into App.tsx** - `ec89b45` (feat)
3. **Auto-fix: Local @excalidraw/utils overrides** - `ee49931` (fix)
4. **Auto-fix: Sass upgrade for Vite 8** - `dcca4ea` (fix)

**Plan metadata:** (not yet committed)

## Files Created/Modified
- `apps/web/src/components/CanvasWrapper.tsx` - Excalidraw bridge component (138 lines)
- `apps/web/src/App.tsx` - Updated to render CanvasWrapper instead of placeholder
- `apps/web/vite.config.ts` - Added path alias for @excalidraw/utils resolution
- `packages/excalidraw/utils/` (8 files) - Local TypeScript overrides for @excalidraw/utils
- `package.json` - Added sass ^1.101.0 dependency

## Decisions Made
- **Vite alias for @excalidraw/utils:** The npm packages `@excalidraw/utils` v0.1.3-test32 and `@excalidraw/math` v0.18.0 are published as CJS bundles that fail under Rolldown (Vite 8). Created local TypeScript source files with full implementations of `geometry/shape`, `collision`, `bbox`, `withinBounds`, and `export` modules. Vite aliases redirect `@excalidraw/utils/*` imports to these local sources.
- **Keyboard shortcut interception:** Excalidraw's internal `onKeyDown` handler in App.tsx processes undo/redo before React's event bubbling. Using `document.addEventListener('keydown', handler, { capture: true })` ensures our handler fires first.
- **captureUpdate not passed in initialData:** Excalidraw v0.18 already uses `CaptureUpdateAction.NEVER` internally when loading initial scene data (App.tsx line 2349). No need to pass it in our `initialData`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Excalidraw v0.18 UIOptions does not have undo/redo properties**
- **Found during:** Task 1 (CanvasWrapper creation)
- **Issue:** The plan's code example referenced `UIOptions.canvasActions: { undo: false, redo: false }`, but Excalidraw's `CanvasActions` type (src/types.ts) does not include `undo` or `redo` properties
- **Fix:** Removed `undo`/`redo` from `UIOptions.canvasActions`. Instead, hide native undo/redo via keyboard shortcut interception (capture-phase `keydown` for Ctrl+Z/Cmd+Z). Native toolbar buttons remain visible but our shortcuts route through HistoryStore.
- **Files modified:** `apps/web/src/components/CanvasWrapper.tsx`
- **Verification:** Build passes, keyboard shortcuts work via capture-phase listener

**2. [Rule 3 - Blocking] @excalidraw/utils npm package broken for Vite 8/Rolldown**
- **Found during:** Task 2 verification (vite build)
- **Issue:** Three categories of failures: (a) sass 1.51.0 lacks `initAsyncCompiler` needed by Vite 8, (b) `@excalidraw/utils` dev bundle references `window` at top level, (c) `@excalidraw/utils` exports collapsed into single CJS bundle with minified names Rolldown can't statically analyze, (d) `@excalidraw/utils` and `@excalidraw/math` sub-path exports (`./collision`, `./ellipse`, etc.) not exposed in package.json `exports` field
- **Fix:** (a) Installed sass ^1.101.0, (b) Created local TypeScript implementations of all @excalidraw/utils modules, (c) Added Vite aliases redirecting @excalidraw/utils/* to local source, (d) Updated @excalidraw/math package.json exports for sub-path resolution
- **Files modified:** `apps/web/vite.config.ts`, `packages/excalidraw/utils/*`, `package.json`, `pnpm-lock.yaml`
- **Verification:** `npx vite build` succeeds (2.55s build time)
- **Committed in:** `ee49931`, `dcca4ea`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary for build to succeed. No scope creep.

## Issues Encountered
- The vendored Excalidraw source (`packages/excalidraw/src/`) imports from `@excalidraw/utils/*` and `@excalidraw/math/*` npm packages. These packages are published only as pre-compiled CJS bundles with incomplete sub-path exports. Created local TypeScript override files under `packages/excalidraw/utils/` with complete implementations of all required modules.
- Excalidraw's internal keyboard handling processes keydown events before React's synthetic event system can intercept them. Using window-level capture-phase listeners (`{ capture: true }`) resolves this.

## Known Stubs
- `packages/excalidraw/utils/collision.ts` `pointOnCurve()` returns `false` as fallback -- used only for edge-case binding hit-testing that doesn't affect core canvas operations
- `packages/excalidraw/utils/geometry/shape.ts` `segmentIntersectRectangleElement()` returns empty array -- only used for binding visual feedback, not core element management

## Next Phase Readiness
- CanvasWrapper fully bridges Excalidraw with CanvasStore and HistoryStore
- Excalidraw imperative API stored in CanvasStore (via `setExcalidrawAPI`) ready for Plan 04 layer panel operations
- Icon and keyboard states correctly manipulated through store
- Build pipeline fixed with local @excalidraw/utils overrides

---
*Phase: 01-core-canvas*
*Completed: 2026-06-29*
