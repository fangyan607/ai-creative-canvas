---
phase: 01-core-canvas
plan: 06
subsystem: database
tags: dexie, indexedb, persistence, auto-save, storage-monitoring

# Dependency graph
requires:
  - phase: 01-core-canvas (Plan 03)
    provides: CanvasStore with serialize/loadSerialized
  - phase: 01-core-canvas (Plan 04)
    provides: LayerPanel component and flex layout in App.tsx
  - phase: 01-core-canvas (Plan 05)
    provides: HistoryStore with undo/redo
provides:
  - IndexedDB persistence layer with Dexie.js single-table schema
  - projectService CRUD API for saving/loading/listing projects
  - Storage monitoring with quota check and persistent storage request
  - Auto-save with 180ms debounce triggering on canvas element changes
  - Save/Save As button UI with name-prompt dialog
affects:
  - Phase 2 node editor (needs project load to restore graph state)
  - Phase 7 project list/management page (needs list() and delete())

# Tech tracking
tech-stack:
  added:
    - dexie ^4.0.0 (already in package.json from Plan 01)
    - fake-indexeddb ^6.2.5 (devDependency for testing)
  patterns:
    - Single-table IndexedDB store via Dexie EntityTable
    - Auto-save via Zustand store subscription with debounced async save
    - Storage monitoring before write operations

key-files:
  created:
    - apps/web/src/indexedb/db.ts
    - apps/web/src/indexedb/projectService.ts
    - apps/web/src/hooks/useAutoSave.ts
    - apps/web/src/components/SaveButton.tsx
    - apps/web/src/test/indexedb/database.test.ts
    - apps/web/src/test/indexedb/projectService.test.ts
  modified:
    - apps/web/src/App.tsx
    - apps/web/src/test/setup.ts

key-decisions:
  - "D-14: Single-table Dexie design -- one 'projects' table with ++id, &name, createdAt, updatedAt"
  - "D-15: Auto-save 180ms debounce matches history merge window, equality check skips unchanged state"
  - "D-16: CanvasStore.serialize() output JSON.stringified and stored as canvasState field"
  - "D-17: Storage monitor checks navigator.storage.estimate() before each save, warns at 80%"

patterns-established:
  - "Dexie EntityTable with auto-increment primary key and unique name index"
  - "Zustand store subscription for auto-save triggers (subscribe with selector + debounce)"
  - "Modal dialog as inline child component for Save As name prompt"

requirements-completed: [CANVAS-06]
duration: 16min
completed: 2026-06-29
---

# Phase 1 Plan 6: IndexedDB Persistence Summary

**Dexie.js database (AICreativeCanvasDB) with single-table projects schema, projectService providing full CRUD + storage monitoring, useAutoSave hook with 180ms debounce + equality check + pre-save quota check, and floating Save/Save As buttons with name-prompt dialog -- all integrated into App.tsx preserving Plan 04's LayerPanel**

## Performance

- **Duration:** 16 min
- **Started:** 2026-06-29T18:08:17Z
- **Completed:** 2026-06-29T18:09:49Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- AICreativeCanvasDB class (extends Dexie) with single `projects` table schema: `++id, &name, createdAt, updatedAt`
- projectService CRUD: save(), load(), update(), delete(), list() (ordered by updatedAt descending)
- Storage monitoring: checkStorage() using navigator.storage.estimate(), requestPersistentStorage() via navigator.storage.persist()
- useAutoSave hook: subscribes to CanvasStore.elementOrder, 180ms debounce, JSON.stringify equality check, pre-save storage warning at 80%
- SaveButton: floating top-left button, calls update() for existing projects, triggers Save As dialog for unnamed projects
- SaveAsDialog: modal with project name input, calls projectService.save(), updates projectId on success
- App.tsx: integrates SaveButton and useAutoSave, preserves LayerPanel and flex layout from Plan 04
- Test setup: fake-indexeddb polyfill for jsdom-based Dexie testing
- 39/39 tests pass (9 new indexedb tests, 30 existing tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Dexie database and project service (TDD)**
   - `5117f87` (test: add failing tests for Dexie database and project service) -- RED
   - `0e9cd84` (feat: implement Dexie database and project service) -- GREEN
2. **Task 2: Create auto-save hook and Save/Save As button UI**
   - `a7f392a` (feat: add auto-save hook and Save/Save As UI)

Plan commits: 3 total (1 test, 2 feat)

## Files Created/Modified

- `apps/web/src/indexedb/db.ts` -- AICreativeCanvasDB class with Dexie projects table schema
- `apps/web/src/indexedb/projectService.ts` -- CRUD operations + storage monitoring + persist request
- `apps/web/src/hooks/useAutoSave.ts` -- Zustand store subscriber with 180ms debounce auto-save
- `apps/web/src/components/SaveButton.tsx` -- Save/Save As floating buttons with inline modal dialog
- `apps/web/src/App.tsx` -- Added SaveButton and useAutoSave, preserved LayerPanel
- `apps/web/src/test/indexedb/database.test.ts` -- 2 tests: schema table name and indexes
- `apps/web/src/test/indexedb/projectService.test.ts` -- 9 tests: CRUD, list ordering, roundtrip, storage
- `apps/web/src/test/setup.ts` -- Added fake-indexeddb/auto import for jsdom Dexie testing

## Decisions Made

- **D-14 single-table design:** One `projects` table with auto-increment id and unique name constraint. MVP-simple; can normalize in later milestones if needed.
- **D-15 auto-save timing:** 180ms debounce matches the HistoryStore merge window. An equality check (`serializedStr === lastSavedRef.current`) prevents unnecessary saves when state hasn't actually changed.
- **D-16 serialization:** CanvasStore.serialize() output is JSON.stringified and stored as a single `canvasState` field (text/blob). The viewport is stored separately as `viewport` JSON string to allow selective restoration.
- **D-17 storage monitoring:** `navigator.storage.estimate()` is called before every auto-save. At >80% usage, a console.warn is emitted and persistent storage is requested if not already granted.

## Deviations from Plan

None -- plan executed exactly as written.

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test setup needed fake-indexeddb for jsdom environment**
- **Found during:** Task 1 (RED phase -- running tests without Dexie support in jsdom)
- **Issue:** Dexie requires IndexedDB API which is not available in jsdom. Tests would fail with "IndexedDB not found" errors.
- **Fix:** Installed `fake-indexeddb` devDependency and added `import 'fake-indexeddb/auto'` to test setup.
- **Files modified:** apps/web/src/test/setup.ts, apps/web/package.json
- **Verification:** All 9 indexedb tests pass in jsdom
- **Committed in:** 5117f87 (Task 1 RED commit)

**2. [Rule 1 - Bug] Dexie v4 uses `auto` not `autoIncrement` on primKey**
- **Found during:** Task 1 (GREEN phase -- test failure)
- **Issue:** Test 2 checked `schema.primKey.autoIncrement` but Dexie v4 uses `.auto` for the auto-increment flag on the primary key schema.
- **Fix:** Changed `expect(schema.primKey.autoIncrement).toBe(true)` to `expect(schema.primKey.auto).toBe(true)`
- **Files modified:** apps/web/src/test/indexedb/database.test.ts
- **Verification:** Test passes after fix
- **Committed in:** 0e9cd84 (Task 1 GREEN commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both auto-fixes necessary for correct operation. No scope creep.

## Issues Encountered

- Dexie v4 schema introspection API uses `.auto` instead of `.autoIncrement` for the primary key auto-increment flag
- fake-indexeddb was needed as a polyfill for jsdom -- jsdom does not implement the IndexedDB API
- The Excalidraw vendored fork causes some build warnings about chunk sizes and ineffective dynamic imports, but these are pre-existing and unrelated to this plan's changes

## User Setup Required

None -- no external service configuration required.

## Next Phase Readiness

- IndexedDB persistence ready for Phase 2 (node editor) to save/load project state including graph data
- projectService.list() ready for Phase 7 project management page
- Auto-save infrastructure ready for future stores (NodeGraphStore serialization)
- Storage monitoring will protect against quota issues when AI images (Blob storage) are added in Phase 4

---
*Phase: 01-core-canvas*
*Completed: 2026-06-29*
