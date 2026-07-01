---
phase: 07-application-ui
plan: 02
type: execute
wave: 2
created: 2026-07-01T12:15:00Z
duration: 16min
requirements: [UI-02, UI-03]
tags: [project-management, canvas-export, progress-panel, execution-log, ui-components]
dependency:
  requires: [07-01]
  provides: [07-03]
  affects: [canvas-page, top-bar, app-shell]
tech-stack:
  added:
    - "@testing-library/user-event (dev)"
  patterns:
    - "projectStore Zustand store without immer for flat state"
    - "useProjectAutoSave custom hook wrapping canvas/nodeGraph store subscriptions"
    - "lazy thumbnail generation via exportToCanvas at low resolution"
---

# Phase 7 Plan 02 Summary: Project Management, Canvas Export, Execution Progress

Implemented project management (UI-03) with grid card view, Figma-style StartPageDialog (blank canvas + templates), and full CRUD operations via existing projectService. Added canvas export (UI-02) with one-click "导出 PNG" button and an advanced ExportDialog for format/scale/background configuration using Excalidraw's exportToBlob. Created collapsible ProgressPanel and ExecutionLog for AI execution monitoring. Wired project state through a lightweight projectStore for TopBar name/save-status display and CanvasPage auto-save logic.

## Key Decisions

| Decision | Value |
|----------|-------|
| **projectStore design** | Flat Zustand store (no Immer) with `currentProjectId`, `currentProjectName`, `isSaving`. TopBar reads from this store instead of props, simplifying AppShell props threading. |
| **Auto-save approach** | Custom `useProjectAutoSave` hook in CanvasPage replaces the prior `useAutoSave` hook pattern. Subscribes to canvasStore and nodeGraphStore changes with 180ms debounce, sets `isSaving=true/false` around the async save call. |
| **Export architecture** | Excalidraw's `exportToBlob` with `exportPadding: 0` for viewport-only capture. Quick-export uses default settings from UIPreferencesStore; advanced dialog lets user override format/scale/background, saving choices back to defaults. |
| **Template thumbnails** | Lazy generation — when ProjectsPage loads, iterates project list and generates low-res thumbnails via `exportToCanvas` at 320x180. Results cached in a `Map<number, string>` in module scope. |
| **ProgressPanel placement** | Bottom edge of the canvas view, using shadcn Sheet with `side="bottom"`. Collapsed state is a 32px status bar; expanded slides up to show node execution details and embedded ExecutionLog. |
| **UI component instantiation** | Created 6 new shadcn-compatible UI components (tooltip, card, select, dropdown-menu, sheet, separator) wrapping @base-ui/react primitives. Existing tests that imported tooltip depended on this. |

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 | `72cc8af` | feat(07-02): implement ProjectsPage with project CRUD, StartPageDialog, projectStore |
| 2 | `2655bd1` | feat(07-02): create ExportButton, ExportDialog, and supporting UI components |
| 3 | `4daac9b` | feat(07-02): create ProgressPanel and ExecutionLog, wire CanvasPage with save logic |

## Key Files

### Created
| File | Purpose |
|------|---------|
| `apps/web/src/pages/ProjectsPage.tsx` | Full project management page: grid cards, loading/empty states, delete confirmation, OpenProject with canvas+nodeGraph loading |
| `apps/web/src/components/StartPageDialog.tsx` | Figma-style new project dialog with "空白画布" + template gallery, name input, create action |
| `apps/web/src/components/ExportButton.tsx` | Split button: left "导出 PNG" one-click, right dropdown for "导出为..." advanced dialog |
| `apps/web/src/components/ExportDialog.tsx` | Export configuration modal: format (PNG/JPG), scale (1x/2x/3x), background (透明/白色) |
| `apps/web/src/components/ProgressPanel.tsx` | Collapsible bottom panel showing AI queue status per node with color-coded dots |
| `apps/web/src/components/ExecutionLog.tsx` | Scrollable log of node execution state with status badges, error messages, clearAll button |
| `apps/web/src/stores/projectStore.ts` | Lightweight Zustand store for current project id/name/saving state |
| `apps/web/src/components/ui/tooltip.tsx` | Tooltip component wrapping @base-ui/react/tooltip (Tooltip.Provider, Root, Trigger, Popup) |
| `apps/web/src/components/ui/card.tsx` | Card component (Card, CardContent, CardHeader, etc.) |
| `apps/web/src/components/ui/select.tsx` | Select component wrapping @base-ui/react/select |
| `apps/web/src/components/ui/dropdown-menu.tsx` | DropdownMenu wrapping @base-ui/react/menu |
| `apps/web/src/components/ui/sheet.tsx` | Sheet (drawer) component wrapping @base-ui/react/drawer |
| `apps/web/src/components/ui/separator.tsx` | Separator wrapping @base-ui/react/separator |
| `apps/web/src/__tests__/pages/ProjectsPage.test.tsx` | Tests for ProjectsPage: loading, empty, card rendering, dialog open, delete, error |
| `apps/web/src/__tests__/components/ExportDialog.test.tsx` | Tests for ExportDialog: controls, cancel, close |

### Modified
| File | Change |
|------|--------|
| `apps/web/src/components/TopBar.tsx` | Reads `currentProjectName`, `isSaving`, `setProjectName` from projectStore; adds ExportButton on canvas route; removed props interface for project fields |
| `apps/web/src/pages/CanvasPage.tsx` | Added `useProjectAutoSave` hook wiring projectStore/projectService; added ProgressPanel at bottom; layout restructured to flex-column |
| `apps/web/src/App.tsx` | Removed hardcoded TopBar props (projectName, saving, onProjectNameChange) |
| `apps/web/src/__tests__/components/AppShell.test.tsx` | Added mocks for @ac-canvas/excalidraw, projectService; updated ProjectsPage test to use waitFor |
| `apps/web/package.json` | Added @testing-library/user-event dev dependency |
| `pnpm-lock.yaml` | Updated |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Missing UI components crash AppShell test**
- **Found during:** Task 1 execution
- **Issue:** `TabbedSidebar` imports from `@/components/ui/tooltip` which didn't exist, causing import resolution failure. The shadcn/ui components (tooltip, card, select, dropdown-menu, sheet, separator) were referenced in imports but never installed/created.
- **Fix:** Created all 6 missing UI components with correct @base-ui/react v1.6 wrappers (Tooltip, Card, Select, DropdownMenu, Sheet, Separator). The tooltip component uses the namespace pattern (`Tooltip.Provider`, `Tooltip.Root`, etc.) matching @base-ui/react's API.
- **Files created:** All 6 files in `apps/web/src/components/ui/`

**2. [Rule 1 - Bug] ExportButton triggers excalidraw import error in jsdom tests**
- **Found during:** AppShell test (TopBar now includes ExportButton which imports @ac-canvas/excalidraw)
- **Issue:** The excalidraw package imports canvas-reliant modules that crash jsdom. Previously this wasn't triggered because AppShell didn't import excalidraw. With ExportButton in TopBar, every shell test loads excalidraw.
- **Fix:** Added `vi.mock('@ac-canvas/excalidraw')` in AppShell.test.tsx with mock exportToBlob/exportToCanvas functions.
- **Files modified:** `apps/web/src/__tests__/components/AppShell.test.tsx`

**3. [Rule 1 - Bug] ProjectsPage async loading breaks AppShell route test**
- **Found during:** Task 1 verification
- **Issue:** The ProjectsPage now loads data asynchronously via projectService.list(), so `screen.getByText('暂无项目')` isn't available synchronously on mount. The AppShell test asserts this synchronously and fails.
- **Fix:** Wrapped the assertion in `await waitFor(() => ...)` pattern.
- **Files modified:** `apps/web/src/__tests__/components/AppShell.test.tsx`

**4. [Rule 2 - Auto-add] Missing @testing-library/user-event dependency**
- **Found during:** Test file creation
- **Issue:** Tests use `userEvent` for click interactions (opening dialogs), but the package wasn't in dependencies.
- **Fix:** Installed `@testing-library/user-event@^14.6.1` as dev dependency.
- **Files modified:** `apps/web/package.json`

### Pre-existing Issues (Out of Scope)
- TypeScript compilation errors in excalidraw fork remain (same as Plan 01)
- Type errors in aiBridge and aiQueueStore tests remain (same as Plan 01)

## Threat Surface Scan

No new security-relevant surface introduced beyond what the plan's threat model covers:
- T-07-04 (Information Disclosure / Export): Implemented with short-lived Blob URLs (10s timeout), consistent with accepted disposition.
- T-07-05 (DoS / Modal overflow): All dialogs (StartPage, Export, Delete confirmation) use shadcn Dialog which traps focus and manages z-index.
- T-07-06 (Tampering / Delete): Delete requires explicit confirmation dialog with destructive-styled button — no accidental single-click deletion.
- T-07-07 (Information Disclosure / Thumbnails): Thumbnails cached in module-scope Map, same-origin, not persisted to IndexedDB.

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| `apps/web/src/components/ProgressPanel.tsx` | Last executed timestamp shown from `lastExecutedAt` | Full execution history (start times, durations) requires a history store not yet implemented. Plan 02 uses current EngineStore state only. |
| `apps/web/src/pages/ProjectsPage.tsx` (thumbnail) | Placeholder `ImageIcon` when thumbnails fail | Thumbnail generation requires canvas API; in non-browser contexts (tests) all thumbnails fall back to the placeholder. Acceptable since exportToCanvas is mocked. |
| `apps/web/src/components/TabbedSidebar.tsx` (Assets/Properties tabs) | "暂无素材" / "选择节点以编辑属性" placeholders | Same as Plan 01 — remains deferred to Plan 03. |

## Self-Check: PASSED

- [x] All 18 test files pass (135 tests)
- [x] `projectsStore.ts` exists with `export const useProjectStore`
- [x] `StartPageDialog.tsx` exists with Chinese labels "空白画布", "新建项目"
- [x] `ProjectsPage.tsx` imports `projectService` and calls `list()`, `load()`, `delete()`
- [x] `ProjectsPage.tsx` uses `useNavigate()` for route navigation
- [x] `ProjectsPage.tsx` contains Chinese strings "暂无项目", "新建项目"
- [x] `ExportButton.tsx` exists with "导出 PNG" button and dropdown
- [x] `ExportDialog.tsx` contains format/scale/background selectors
- [x] `ProgressPanel.tsx` imports `useEngineStore`
- [x] `ExecutionLog.tsx` has "清除" button calling `clearAll()`
- [x] TopBar reads `currentProjectName` from `useProjectStore`
- [x] CanvasPage has ProgressPanel at bottom, wired with auto-save
- [x] `apps/web/src/__tests__/pages/ProjectsPage.test.tsx` exists with mock-based tests
- [x] `apps/web/src/__tests__/components/ExportDialog.test.tsx` exists
