---
phase: 07-application-ui
plan: 01
type: execute
wave: 1
created: 2026-07-01T12:02:27Z
duration: 11min
requirements: [UI-01]
tags: [app-shell, react-router, ui-preferences, dark-mode, keyboard-shortcuts, sidebar, property-panel-slider]
---

# Phase 7 Plan 01 Summary: Application Shell Foundation

Executed the application shell foundation: installed react-router-dom, implemented the full UIPreferencesStore with Zustand persist, created the centralized useKeyboardShortcuts hook, activated dark mode with anti-flash script, built the AppShell layout with TopBar and collapsible TabbedSidebar, moved the canvas view into CanvasPage, created stub pages for Projects and Settings, and replaced numeric inputs in PropertyPanel with slider controls.

## Key Decisions

| Decision | Value |
|----------|-------|
| **Router approach** | Layout route pattern using React Router v7 Routes/Route (not createBrowserRouter). AppShell wraps TopBar + TabbedSidebar + Outlet. Used simple `<Routes>` inside `<BrowserRouter>` from main.tsx since data loaders are not needed (Zustand stores manage data). |
| **Sidebar collapse** | Both expanded and collapsed states coexist in DOM with CSS visibility/width transitions. Avoids remounting tab content per RESEARCH.md Pitfall 4 guidance. |
| **Theme persistence** | Zustand persist middleware (localStorage) with `ui-preferences` key. Anti-flash inline script reads from localStorage synchronously before React mounts. |
| **Keyboard shortcuts** | Internal Map<string, ShortcutAction> keyed by normalized key strings (e.g., "ctrl+s"). Skips when target is input/textarea/select. Respects `enabled` flag. Cleanup on unmount via useEffect return. |
| **Slider import path** | PropertyPanel (in `packages/node-editor/`) uses relative import `../../../apps/web/src/components/ui/slider` since `@/` alias is not configured in the node-editor package. |

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 | `e695988` | feat(07-01): implement UIPreferencesStore, useKeyboardShortcuts, react-router-dom setup, dark mode |
| 2 | `a5b383b` | feat(07-01): create AppShell layout with TopBar, TabbedSidebar, React Router, and page stubs |
| 3 | `2a26673` | feat(07-01): add Slider controls to PropertyPanel NumberField, add min/max/step to param definition |

## Progress

- **Tasks:** 3/3 completed
- **Tests:** 123/123 passing (16 test files)
- **Files created:** 10 (TopBar, TabbedSidebar, CanvasPage, ProjectsPage, SettingsPage, useKeyboardShortcuts hook, 3 test files, PropertyPanel slider update, nodeGraph type addition)
- **Files modified:** 6 (App.tsx, main.tsx, index.html, App.css, package.json, LayerPanel, vite.config.ts, pnpm-lock.yaml)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed vite.config.ts react-refresh plugin fails in jsdom test environment**

- **Found during:** Task 2 (AppShell tests)
- **Issue:** The `@vitejs/plugin-react` react-refresh Babel plugin injects `file:///@react-refresh` imports that crash in jsdom environment with "TypeError: The argument 'filename' must be a file URL object"
- **Fix:** Conditionalized react() plugin instantiation: `...(process.env.VITEST ? [] : [react()])` — Vite sets VITEST env var automatically during tests
- **Files modified:** `apps/web/vite.config.ts`

**2. [Rule 1 - Bug] useShallow import path**

- **Found during:** Implementation
- **Issue:** Zustand v5 moved `useShallow` from `zustand/react/shallow` to the proper path
- **Fix:** Verified existing import paths were correct (already using `zustand/react/shallow` pattern from existing stores)

**3. [Rule 1 - Bug] TooltipTrigger lacks asChild prop in @base-ui/react v1.6**

- **Found during:** TypeScript compilation
- **Issue:** `@base-ui/react` (Radix v4 renamed) TooltipTrigger does not support `asChild` prop — renders a `<div>` inside `<button>` which is invalid HTML
- **Fix:** Removed `asChild` and placed the `<button>` directly inside `<TooltipTrigger>` (TooltipTrigger wraps its children with proper trigger element)
- **Files modified:** `apps/web/src/components/TabbedSidebar.tsx`

### Rule 2 - Added min/max/step to NodeParamDefinition

- **Found during:** Task 3 (Slider integration)
- **Issue:** The `NodeParamDefinition` interface had no `min`, `max`, or `step` fields, but the Slider component requires valid range bounds for its min/max/step props. Without these, Slider would default to min=0, max=100, step=1 — wrong for parameters like seed (range -1 to 2^31-1).
- **Fix:** Added optional `min`, `max`, `step` fields to `NodeParamDefinition` interface. Set appropriate ranges on width (256-2048, step 64), height (256-2048, step 64), and seed (-1 to 2147483647, step 1) in the TextToImageNode definition.
- **Files modified:** `packages/shared/src/types/nodeGraph.ts`

### Pre-existing Issues (Out of Scope)

The following issues existed before this plan and are not addressed:

- TypeScript compilation errors in excalidraw fork (`packages/excalidraw/`) due to missing type declarations for `react`, `react-dom`, `lodash.throttle`, and internal module resolution
- Type errors in `apps/web/src/engine/aiBridge.ts` (module resolution for `@ac-canvas/ai-core` subpath exports)
- Type errors in `apps/web/src/stores/__tests__/aiQueueStore.test.ts` (missing `providerId` field in test data)

## Threat Surface Scan

No new security-relevant surface was introduced. The threat model's accepted risks (localStorage preferences, anti-flash script, client-side routes) remain within accepted disposition. All data handled is non-sensitive UI state (theme, sidebar state, export defaults).

## Stub Tracking

| File | Stub | Reason |
|------|------|--------|
| `apps/web/src/pages/ProjectsPage.tsx` | "暂无项目" placeholder | Full implementation in Plan 02 |
| `apps/web/src/pages/SettingsPage.tsx` | "设置" placeholder | Full implementation in Plan 03 |
| `apps/web/src/components/TabbedSidebar.tsx` (Assets/Properties tabs) | "暂无素材" / "选择节点以编辑属性" placeholders | Asset panel in Plan 02, Properties tab in Plan 03 |
| `apps/web/src/App.tsx` (TopBar props) | `onProjectNameChange` no-op | Plan 02 wires project store |

## Self-Check: PASSED

- [x] All 16 test files pass (123 tests)
- [x] `@custom-variant dark` exists in App.css
- [x] `react-router-dom` in package.json dependencies
- [x] `UIPreferencesStore` uses persist middleware with name `'ui-preferences'`
- [x] `useKeyboardShortcuts` exported as a function
- [x] `index.html` has anti-flash script and `lang="zh-CN"`
- [x] `TopBar` exported with `export function TopBar`
- [x] `TabbedSidebar` exported with Chinese tab labels
- [x] `App.tsx` uses `<Outlet>` and imports TopBar + TabbedSidebar
- [x] `main.tsx` wraps in BrowserRouter + TooltipProvider
- [x] `CanvasPage` exists with adapter registration imports
- [x] `ProjectsPage` and `SettingsPage` exist with stubs
- [x] `LayerPanel.tsx` exports `LayerListContent`
- [x] `PropertyPanel.tsx` imports Slider and uses `<Slider` JSX
- [x] AppShell test verifies shell structure, routing, tab labels
