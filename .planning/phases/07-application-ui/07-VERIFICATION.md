---
phase: 07-application-ui
verified: 2026-07-01T12:58:45Z
status: gaps_found
score: 15/17 must-haves verified
overrides_applied: 0
gaps:
  - truth: "User sees a grid of project cards when navigating to /projects"
    status: failed
    reason: "ProjectsPage.tsx at HEAD is a 9-line stub returning only '暂无项目'. The full 356-line implementation exists in commit 72cc8af but was reverted to the Plan 01 stub by commit e1dc36e (squash regression). Tests expect grid cards, create dialog, delete confirmation — all fail because the underlying component never renders them."
    artifacts:
      - path: "apps/web/src/pages/ProjectsPage.tsx"
        issue: "9-line stub instead of the planned 356-line full implementation"
    missing:
      - "Restore the full ProjectsPage implementation from commit 72cc8af or re-implement with grid cards, loading/empty states, project CRUD operations"
  - truth: "User can create a new project from blank or from a template"
    status: failed
    reason: "ProjectsPage is a stub, so the StartPageDialog exists but is never wired/rendered. The create-project flow (StartPageDialog -> projectService.save -> navigate to canvas) is broken because ProjectsPage does not render the dialog or handle create events."
    artifacts:
      - path: "apps/web/src/pages/ProjectsPage.tsx"
        issue: "Stub does not import or render StartPageDialog, does not call projectService CRUD"
    missing:
      - "Wire StartPageDialog into ProjectsPage, implement create/open/save/delete project flow"
deferred: []
human_verification: []
---

# Phase 7: Application UI — Verification Report

**Phase Goal:** Complete application experience with project management, export, and configuration
**Verified:** 2026-07-01T12:58:45Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User sees consistent app shell with top bar, collapsible left sidebar (tabbed Layers/Assets/Properties) when viewing the canvas | ✓ VERIFIED | App.tsx uses React Router layout route with AppShell (TopBar + TabbedSidebar + Outlet). TopBar at 173 lines with editable project name, save indicator, view switcher. TabbedSidebar at 221 lines with three tabs (图层/素材/属性), both expanded (288px) and collapsed (44px) states in DOM. |
| 2 | User can toggle between full-width (288px) and icon-only (44px) sidebar state | ✓ VERIFIED | TabbedSidebar reads `sidebarCollapsed` from UIPreferencesStore. Both states coexist with CSS `transition-[width] duration-200` transitions. ChevronLeft/ChevronRight toggle. When collapsed, tabs show as icon-only with Tooltips. |
| 3 | Dark mode setting persists across page reload without flash | ✓ VERIFIED | UIPreferencesStore uses Zustand `persist` middleware with `name: 'ui-preferences'` (localStorage). Anti-flash inline script in index.html reads localStorage synchronously. `@custom-variant dark` in App.css line 4 activates Tailwind v4 dark variant. SettingsPage applyTheme() toggles `.dark` class. |
| 4 | Pressing keyboard shortcuts triggers registered actions without conflicting with Excalidraw handlers | ✓ VERIFIED | useKeyboardShortcuts.ts (170 lines) with shortcutRegistry, skip-on-input logic, normalizeKey(). CanvasPage registers: `?` (open ShortcutPanel), Ctrl+S (save), Ctrl+Enter (execute), Escape (deselect). Tests verify registration, input-skip, enabled-flag, cleanup. |
| 5 | User sees a grid of project cards when navigating to /projects | ✗ FAILED | ProjectsPage.tsx at HEAD is a 9-line stub returning `暂无项目`. The full 356-line implementation with grid cards, loading state, empty state, and CRUD exists in commit 72cc8af but was reverted to the Plan 01 stub by the squash commit e1dc36e. |
| 6 | User can create a new project (blank or from template), open existing, save changes, and delete with confirmation | ✗ FAILED | StartPageDialog.tsx (158 lines) exists and is substantive, but is never rendered because ProjectsPage is a stub. projectStore.ts (50 lines) exists with setCurrentProject/setProjectId/setIsSaving. CanvasPage has useProjectAutoSave hook wired to projectService. The full flow is broken at the entry point. |
| 7 | User can export the canvas as PNG with a single click | ✓ VERIFIED | ExportButton.tsx (135 lines) with handleQuickExport calling exportToBlob with exportPadding=0 (viewport-only). Rendered in TopBar on canvas route (`/`). Uses defaults from UIPreferencesStore. |
| 8 | User can configure export format (PNG/JPG), resolution (1x/2x/3x), and background (transparent/white) in an advanced dialog | ✓ VERIFIED | ExportDialog.tsx (184 lines) with Select controls for format, scale, background. Reads/writes UIPreferencesStore defaults. Calls exportToBlob on export with selected parameters. |
| 9 | User sees a progress panel showing AI queue execution status with node status indicators | ✓ VERIFIED | ProgressPanel.tsx (156 lines) with collapsible bottom Sheet. Color-coded status dots (gray=queued, amber=executing, green=done, red=error). Reads from useEngineStore and useNodeGraphStore. Rendered in CanvasPage. |
| 10 | User sees an execution log panel showing node execution history | ✓ VERIFIED | ExecutionLog.tsx (119 lines) with status badges, timestamps (lastExecutedAt), error messages, clearAll button. Rendered inside ProgressPanel expanded view. |
| 11 | Integer parameters (seed, strength, width, height) use slider controls instead of plain number inputs | ✓ VERIFIED | PropertyPanel.tsx imports `{ Slider }` (relative path). NumberField renders Slider + companion Input pair with min/max/step from NodeParamDefinition. |
| 12 | User can navigate to /settings and see a full settings page with AI Provider, Theme, Export, and Language sections | ✓ VERIFIED | SettingsPage.tsx (405 lines) with 4 Card sections. AI Provider: per-provider cards with toggle, API key, base URL, model. Theme: 3-button light/dark/system. Export: format/scale/background selects. Language: placeholder. Routes at /settings via App.tsx. |
| 13 | User can configure AI API keys, base URLs, and toggle providers on/off in settings | ✓ VERIFIED | SettingsPage AI Provider section: Switch toggle for enable/disable, password-type API key with show/hide, base URL input, model input, test-connection placeholder. Calls ProviderStore.saveConfig/loadConfig. |
| 14 | User can switch between light, dark, and system theme modes in settings | ✓ VERIFIED | SettingsPage Theme section with three-button group (浅色/深色/跟随系统). applyTheme() toggles `.dark` class. System preference change listener. Writes to UIPreferencesStore. |
| 15 | User can set default export preferences (format, resolution, background) in settings | ✓ VERIFIED | SettingsPage Export Defaults section with Select for format (PNG/JPG), scale (1x/2x/3x), background (透明/白色). Writes to UIPreferencesStore.setExportDefaults. |
| 16 | User can create and edit prompt templates with a live preview and IndexedDB persistence | ✓ VERIFIED | PromptEditor.tsx (244 lines) with template textarea, variable extraction (`{{variable}}`), live preview panel, save-to-IndexedDB flow. db.ts version 3 has promptTemplates table. |
| 17 | User can open a searchable keyboard shortcuts panel by pressing ? | ✓ VERIFIED | ShortcutPanel.tsx (133 lines) with search input, group labels (应用/画布/节点编辑), shortcutRegistry display. CanvasPage registers `?` key handler opening the panel. |

**Score:** 15/17 truths verified

### Deferred Items

Items not yet met but explicitly addressed in later milestone phases.

No items are deferred. Phase 8 (Testing & Performance) does not address project management UI.

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | --------- | ------ | ------- |
| `apps/web/src/App.tsx` | React Router layout route with AppShell, TopBar, TabbedSidebar, lazy routes | VERIFIED | 55 lines, uses Routes/Route/Outlet, imports TopBar, TabbedSidebar, CanvasPage, ProjectsPage, SettingsPage |
| `apps/web/src/main.tsx` | BrowserRouter + TooltipProvider wrapper | VERIFIED | 22 lines, wraps BrowserRouter and TooltipProvider around App |
| `apps/web/src/stores/stubs/uiPreferencesStore.ts` | Full store with theme, exportDefaults, sidebarCollapsed, activeTab — Zustand persist | VERIFIED | 93 lines, persist + immer middleware, name 'ui-preferences' |
| `apps/web/src/hooks/useKeyboardShortcuts.ts` | Centralized keyboard shortcut hook with registry, enable/disable, collision detection | VERIFIED | 170 lines, shortcutRegistry static array, input-skip logic, normalized key matching |
| `apps/web/src/components/TopBar.tsx` | Minimal top bar with project name, save status, view switcher | VERIFIED | 173 lines, reads from projectStore, ExportButton on canvas route |
| `apps/web/src/components/TabbedSidebar.tsx` | Left panel with Layers/Assets/Properties tab switching, collapsible | VERIFIED | 221 lines, both expanded/collapsed states in DOM, CSS width transition |
| `apps/web/src/pages/CanvasPage.tsx` | Canvas view with wrappers, progress panel, auto-save, keyboard shortcuts | VERIFIED | 325 lines, useProjectAutoSave, useKeyboardShortcuts, ProgressPanel, ShortcutPanel |
| `apps/web/src/pages/ProjectsPage.tsx` | Full project management page with grid cards and CRUD | STUB | 9 lines — returns only "暂无项目". Full 356-line implementation exists in commit 72cc8af but was reverted |
| `apps/web/src/pages/SettingsPage.tsx` | Full settings page with AI Provider, Theme, Export, Language sections | VERIFIED | 405 lines, 4 Card sections, wires to ProviderStore and UIPreferencesStore |
| `apps/web/src/components/StartPageDialog.tsx` | Figma-style new project dialog with blank + template options | VERIFIED | 158 lines, TEMPLATES import, blank canvas + template gallery, create action |
| `apps/web/src/components/ExportButton.tsx` | One-click export + advanced dropdown | VERIFIED | 135 lines, exportToBlob with exportPadding=0, DropdownMenu for advanced |
| `apps/web/src/components/ExportDialog.tsx` | Export configuration modal | VERIFIED | 184 lines, format/scale/background selects, exportToBlob wiring |
| `apps/web/src/components/ProgressPanel.tsx` | Collapsible execution progress panel | VERIFIED | 156 lines, Sheet bottom panel, status dots, node name lookup |
| `apps/web/src/components/ExecutionLog.tsx` | Execution history log | VERIFIED | 119 lines, status badges, timestamps, clearAll button |
| `apps/web/src/components/PromptEditor.tsx` | Visual prompt template editor with live preview | VERIFIED | 244 lines, variable parsing, live preview, IndexedDB save |
| `apps/web/src/components/ShortcutPanel.tsx` | Searchable keyboard shortcuts panel | VERIFIED | 133 lines, search input, group labels, shortcutRegistry display |
| `apps/web/src/indexedb/db.ts` | Version 3 with promptTemplates table | VERIFIED | 65 lines, version 3 adds promptTemplates: '++id, name, updatedAt' |
| `apps/web/src/stores/projectStore.ts` | Lightweight Zustand store for current project | VERIFIED | 50 lines, currentProjectId/Name/isSaving, setProjectId action |
| `packages/node-editor/src/PropertyPanel.tsx` | NumberField with Slider + companion Input | VERIFIED | Slider import from ../../../apps/web/src/components/ui/slider, <Slider JSX in NumberField |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| App.tsx Routes | CanvasPage | `import.*CanvasPage` | VERIFIED | Eager import at line 16 |
| TabbedSidebar | useUIPreferencesStore activeTab | useShallow selector | VERIFIED | Lines 77-84 read sidebarCollapsed, activeTab from store |
| index.html script | localStorage.getItem('ui-preferences') | Anti-flash script | VERIFIED | index.html lines 11-19 |
| useKeyboardShortcuts | window.addEventListener('keydown') | keydown handler | VERIFIED | Line 160, cleanup at line 161 |
| ProjectsPage | projectService.list/load/delete | CRUD calls | NOT_WIRED | ProjectsPage is a 9-line stub, no projectService imports |
| ExportButton/ExportDialog | exportToBlob | Import from @ac-canvas/excalidraw | VERIFIED | ExportButton line 14, ExportDialog line 13 |
| ProgressPanel | useEngineStore nodeStatus | useShallow selectors | VERIFIED | Lines 51-54 |
| ProgressPanel | useAIQueueStore queues | store import | PARTIAL | ProgressPanel reads from engineStore, not directly from aiQueueStore |
| SettingsPage | ProviderStore.saveConfig/loadConfig | getProviderStore() | VERIFIED | Lines 134-150 saveConfig, lines 83-88 loadConfig |
| SettingsPage | useUIPreferencesStore.setTheme/setExportDefaults | Zustand actions | VERIFIED | Lines 67-69 setTheme, setExportDefaults |
| PromptEditor | TemplateEngine (template/parse) | Inline renderPreview | VERIFIED | Lines 37-49 extractVariables/renderPreview (avoided pre-existing TS import issue) |
| ShortcutPanel | shortcutRegistry (useKeyboardShortcuts) | Static array import | VERIFIED | Line 17, shortcutRegistry populated by useKeyboardShortcuts |
| App.tsx | ShortcutPanel | Import + render in CanvasPage | VERIFIED | CanvasPage line 322 renders ShortcutPanel |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| TopBar (projectName) | `currentProjectName` | projectStore Zustand | Reads from store, set via setProjectName | FLOWING |
| TopBar (exportButton) | Export state | ExportButton -> useCanvasStore -> excalidrawAPI | Calls exportToBlob with real canvas elements | FLOWING |
| CanvasPage (autoSave) | `projectId` | useProjectAutoSave -> projectService.update | Writes canvasState, viewport, nodeGraph to IndexedDB | FLOWING |
| ProgressPanel (nodeStatus) | `nodeStatus` | useEngineStore | Reads real-time status from engine store | FLOWING |
| SettingsPage (providers) | `providerForms` | getProviderStore().listProviders()/loadConfig | Reads/writes ProviderStore which encrypts to IndexedDB | FLOWING |
| SettingsPage (theme) | `theme` | useUIPreferencesStore | Zustand persist to localStorage | FLOWING |
| ProjectsPage | (none) | (none) | Stub — no data flows | DISCONNECTED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Tests pass | `pnpm exec vitest run` | 154/160 pass, 6 fail (all ProjectsPage) | FAIL |
| TypeScript compiles | `tsc --noEmit` | 17 errors (10+ pre-existing, 3 Phase 7) | FAIL |
| Dark mode anti-flash script exists | grep | Found in index.html | PASS |
| Slider imported in PropertyPanel | grep | Found at line 18 | PASS |
| @custom-variant dark in App.css | grep | Found at line 4 | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| UI-01 | Plan 01 | Provide toolbar, sidebar, asset panel and other basic UI components | SATISFIED | TopBar, TabbedSidebar (Layers/Assets/Properties tabs), collapsible sidebar, React Router routing, CanvasPage, stub pages |
| UI-02 | Plan 02 | User can export canvas as PNG/JPG | SATISFIED | ExportButton with one-click "导出 PNG", ExportDialog with format/scale/background, exportToBlob with exportPadding=0 |
| UI-03 | Plan 02 | User can create, open, save, delete projects | BLOCKED | ProjectsPage is a 9-line stub. StartPageDialog exists but is never rendered. projectService CRUD exists but is not wired through the UI. Auto-save works in CanvasPage. |
| UI-04 | Plan 03 | User can configure AI API Key in settings page | SATISFIED | SettingsPage at /settings with AI Provider config (API key, base URL, model, toggle), Theme (light/dark/system), Export defaults, Language placeholder |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `apps/web/src/pages/ProjectsPage.tsx` | 1-9 | STUB — full implementation reverted by squash commit | BLOCKER | Project management (UI-03) non-functional. All 6 related tests fail. |
| `apps/web/src/stores/__tests__/aiQueueStore.test.ts` | 64 | TypeScript error (missing `providerId`) | WARNING | Pre-existing, blocks typecheck pass |
| `apps/web/src/engine/aiBridge.ts` | 17-18 | Cannot find module `@ac-canvas/ai-core/*` subpath imports | WARNING | Pre-existing TS module resolution issues |
| `apps/web/src/pages/CanvasPage.tsx` | 18-20 | Cannot find module `@ac-canvas/ai-core/adapters/*` | WARNING | Pre-existing TS module resolution issues |
| `apps/web/src/components/ProgressPanel.tsx` | 67, 131 | Type cast issue (NodeDataUnion -> Record) | INFO | Minor type-safety gap |
| `apps/web/src/components/ExecutionLog.tsx` | 53 | Type cast issue (NodeDataUnion -> Record) | INFO | Minor type-safety gap |

### Human Verification Required

No automated-equivalent checks are blocked. The primary issue (ProjectsPage stub) is deterministically verifiable.

### Gaps Summary

**Root cause:** Commit `e1dc36e` (feat(07-02): projects page, export, progress panel, execution log) is a squash commit that reverted `apps/web/src/pages/ProjectsPage.tsx` from its full 356-line implementation (committed in `72cc8af`) back to the 9-line Plan 01 stub. The git DAG shows the full implementation exists on a separate branch (`72cc8af`) but was discarded when squashed onto master as `e1dc36e`.

**2 gaps found, same root cause:**

1. **Project grid not visible** — Navigating to `/projects` shows only "暂无项目" placeholder instead of the grid of project cards with loading/empty states, thumbnails, and click-to-open behavior.

2. **Project CRUD not functional** — StartPageDialog exists (158 lines, substantive) but is never wired. Users cannot create, open, or delete projects through the UI. The create-flow (StartPageDialog -> projectService.save -> navigate to canvas) is entirely broken.

**Gap fix:** Restore the full ProjectsPage implementation from commit `72cc8af`. This single file replacement addresses both gaps and restores all 6 failing tests.

**Everything else is VERIFIED:**
- App shell with TopBar and collapsible TabbedSidebar (UI-01)
- Canvas export with one-click + advanced dialog (UI-02)
- Settings page with AI provider config, theme, export defaults (UI-04)
- Dark mode with anti-flash persistence
- Keyboard shortcuts with shortcutRegistry and ShortcutPanel
- Slider controls in PropertyPanel
- Progress panel and execution log
- Prompt editor with live preview and IndexedDB persistence
- Auto-save wiring in CanvasPage
- React Router routing between all views
- 154/160 tests passing (all except ProjectsPage tests)

---

_Verified: 2026-07-01T12:58:45Z_
_Verifier: Claude (gsd-verifier)_
