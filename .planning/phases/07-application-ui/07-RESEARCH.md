# Phase 7: Application UI - Research

**Researched:** 2026-07-01
**Domain:** Application shell architecture, SPA routing, project management UI, canvas export, settings page, dark mode
**Confidence:** HIGH

## Summary

Phase 7 transforms the current single-view canvas application into a complete multi-page application with project management, canvas export, settings, and a polished app shell. The foundation work is already done: `projectService` provides full CRUD, `ProviderStore` handles encrypted API key storage, `EngineStore` and `AIQueueStore` hold execution state for progress/status panels. The work is primarily UI-layer: React Router for view routing, shadcn/ui components for the panel system, and Excalidraw's built-in `exportToBlob` for canvas export.

**Critical discovery:** The existing shadcn/ui components use `@base-ui/react` (the new name for Radix UI v4+) as their primitive library, not legacy Radix UI Primitives. All component imports follow the `@base-ui/react/{component}` pattern. This changes package installation recommendations from what earlier phases assumed.

**Primary recommendation:** Install `react-router-dom v7` for route-based navigation, build the app shell as a layout route pattern, reuse existing `projectService` for project CRUD, leverage Excalidraw's `exportToBlob` for canvas export, and implement dark mode via the already-defined `.dark` CSS variables in `App.css`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01: Hybrid navigation model** — Primary views (canvas, project list, settings) use React Router for URL-aware navigation. Secondary interactions (export config, template selection, prompt editor) use modals/dialogs.
- **D-02: Minimal top bar + contextual tools** — The top bar contains only global operations: project name (editable), save status indicator, and view-switching icons (canvas / projects / settings). Tool UIs appear contextually based on the active view/mode.
- **D-03: Left unified panel with tab switching** — Consolidate split layout (LayerPanel left + PropertyPanel right) into a single left-side panel with tab navigation: Layers, Assets, Properties.
- **D-04: Fixed-width + collapsible sidebar** — The left panel has a fixed width (~288px) but can be collapsed to icon-only state via a toggle button.
- **D-05: Grid card view** — Project list displays as a grid of cards with project name, timestamp, and canvas thumbnail preview.
- **D-06: Start page with blank + template** — New project creation offers a start page similar to Figma's pattern.
- **D-07: All project CRUD exists** — `projectService` (save/update/load/delete/list) already in IndexedDB from Phase 1. Phase 7 only needs the UI layer.
- **D-08: Quick one-click + advanced dropdown** — Default export is a single-click "Export PNG" button. Adjacent dropdown reveals advanced options: format (PNG/JPG), resolution scale (1x/2x/3x), background (transparent/white).
- **D-09: No export preview** — Export proceeds directly to download without a preview step.
- **D-10: Full settings scope** — Settings include: AI Provider config (API keys, base URLs, default model per provider, enable/disable toggles), Theme (light/dark/system), Export defaults (default format, resolution, background), Language (future expansion, placeholder UI).
- **D-11: Dark mode — full Phase 7 implementation** — Complete dark mode with Tailwind `dark:` class strategy. UIPreferencesStore (currently stub) is fully implemented with persisted preference.
- **D-12: Settings page as a routed view** — Settings is a full-page view accessed via `/settings` route.
- **D-13: Global execution progress panel** — A collapsible panel (bottom or right side of canvas view) showing AI queue status: queued -> processing -> done/error per node.
- **D-14: Execution log panel** — A panel showing node execution history: timestamps, duration, output summary, error messages.
- **D-15: Slider components** — Replace numeric `<input type="number">` fields in PropertyPanel with custom slider controls. Use shadcn/ui slider (`@base-ui/react/slider`).
- **D-16: Visual prompt template editor** — In-app UI for creating and editing prompt templates. Accessible from settings or a dedicated interface.
- **D-17: Formal shortcut management system** — `useKeyboardShortcuts` hook centralizing all keyboard shortcut bindings with enable/disable state, shortcut grouping, and collision detection.
- **D-18: Shortcut discovery panel** — A searchable/scrollable panel listing all available keyboard shortcuts, accessible via `?` key or from settings menu.

### Claude's Discretion
- React Router route structure (`/canvas`, `/projects`, `/settings`, `/`)
- Specific keyboard shortcut bindings (the system design is locked; actual bindings are implementation detail)
- Tab panel implementation approach (shadcn/ui Tabs or custom)
- Collapsible sidebar animation and transition timing
- Progress panel positioning and visual design
- Slider component styling (color, size, step sizes)
- Prompt editor UI layout and save flow
- Dark mode CSS variable definitions and color palette (already partially defined in App.css)
- Export resolution algorithm (OffscreenCanvas vs canvas.toBlob)
- Error handling UX for project deletion (undo toast vs confirmation dialog)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-01 | Provide toolbar, sidebar, asset panel and other basic UI components | App shell with top bar + tabbed left sidebar. React Router for view routing. shadcn/ui components available (Tabs, Tooltip, Separator, Button, DropdownMenu). Left panel consolidates Layers/Assets/Properties via shadcn Tabs. |
| UI-02 | User can export canvas as PNG/JPG | Excalidraw exports `exportToBlob` from `@excalidraw/utils/export`. API: `exportToBlob({ elements, appState, files, exportPadding, exportBackground, exportScale, shouldCapturize: true })`. One-click default + advanced options modal. |
| UI-03 | User can create, open, save, delete projects (project management page) | `projectService` in `apps/web/src/indexedb/projectService.ts` has full CRUD: `save`, `update`, `load`, `delete`, `list`. Grid card view with project cards (shadcn Card). Start page dialog for new project (blank + 2 templates). |
| UI-04 | User can configure AI API Key in settings page | `ProviderStore` in `packages/ai-core/src/config/providerStore.ts` provides `saveConfig`, `loadConfig`, `getApiKey`, `deleteConfig`. Adapter `getConfigSchema()` returns `ConfigField[]` for form generation. Settings page at `/settings` route. Theme toggle (light/dark/system) via UIPreferencesStore. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-router-dom | 7.18.1 | SPA routing | De facto React routing standard. v7 uses loader/action pattern similar to Remix. URL-aware navigation for primary views. |
| @base-ui/react | 1.6.0 | UI primitives | Already installed. The successor to Radix UI (renamed). Powers all existing shadcn/ui components. |

### Supporting (shadcn/ui components - already added to codebase)

| Component | Location | Purpose | Used For |
|-----------|----------|---------|----------|
| Tabs | `src/components/ui/tabs.tsx` | Tab navigation | Left sidebar tab switching (Layers/Assets/Properties) |
| Slider | `src/components/ui/slider.tsx` | Range input | Replace numeric inputs in PropertyPanel for params like seed, strength, CFG scale |
| Select | `src/components/ui/select.tsx` | Dropdown selection | Format/resolution selectors in export dialog, model selection in settings |
| Switch | `src/components/ui/switch.tsx` | Toggle | Provider enable/disable, dark mode toggle |
| Card | `src/components/ui/card.tsx` | Card containers | Project grid cards, settings sections |
| DropdownMenu | `src/components/ui/dropdown-menu.tsx` | Context menu | Export advanced options dropdown, view switcher menu |
| Tooltip | `src/components/ui/tooltip.tsx` | Hover hints | Icon-only sidebar tab tooltips, toolbar button hints |
| Separator | `src/components/ui/separator.tsx` | Visual divider | Panel section separators |
| Sheet | `src/components/ui/sheet.tsx` | Slide-in panel | Progress panel, execution log (collapsible bottom/right panel) |
| Input | `src/components/ui/input.tsx` | Text input | Settings form fields |
| Button | `src/components/ui/button.tsx` | Action triggers | All action buttons |
| Dialog | `src/components/ui/dialog.tsx` | Modal dialog | Export config, prompt editor, template selection |

### Installation
```bash
pnpm add react-router-dom
```

No other npm packages are needed. All shadcn/ui components required for Phase 7 have already been added via `npx shadcn@latest add slider tabs select switch card dropdown-menu tooltip separator input-otp sheet`.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-router-dom v7 | wouter (2KB) | Wouter is simpler but lacks react-router's ecosystem (devtools, lazy loading patterns). For a 3-route SPA, either works but react-router is more conventional. |
| shadcn/ui Tabs | Custom tab component | Custom would mean re-inventing focus management, keyboard nav, and a11y. shadcn Tabs built on @base-ui/react tabs provides all this. |

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/
├── App.tsx                    # React Router setup with LayoutRoute
├── main.tsx                   # Entry point (wrap with TooltipProvider + BrowserRouter)
├── App.css                    # CSS variables, Tailwind (already exists, .dark vars defined)
├── components/
│   ├── TopBar.tsx             # NEW: Minimal top bar (project name, save indicator, view switcher)
│   ├── TabbedSidebar.tsx      # NEW: Left unified panel with tab switching (Layers/Assets/Properties)
│   ├── ExportDialog.tsx       # NEW: Export configuration dialog
│   ├── ExportButton.tsx       # NEW: One-click export + advanced dropdown
│   ├── ProgressPanel.tsx      # NEW: Global execution progress panel (D-13)
│   ├── ExecutionLog.tsx       # NEW: Execution log panel (D-14)
│   ├── PromptEditor.tsx       # NEW: Visual prompt template editor (D-16)
│   ├── ShortcutPanel.tsx      # NEW: Shortcut discovery panel (D-18)
│   ├── StartPageDialog.tsx    # NEW: New project creation (blank + templates, D-06)
│   ├── ui/                    # Existing shadcn/ui components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── tabs.tsx
│   │   ├── slider.tsx
│   │   ├── select.tsx
│   │   ├── switch.tsx
│   │   ├── card.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── tooltip.tsx
│   │   ├── separator.tsx
│   │   ├── sheet.tsx
│   │   └── input.tsx
│   ├── LayerPanel.tsx         # EXISTING: Refactor into tabbed panel
│   └── CanvasWrapper.tsx      # EXISTING: Keep as core canvas component
├── pages/
│   ├── CanvasPage.tsx         # NEW: Canvas view (wraps CanvasWrapper + node editor + progress panel)
│   ├── ProjectsPage.tsx       # NEW: Project list grid + start page
│   └── SettingsPage.tsx       # NEW: Settings form
├── hooks/
│   ├── useKeyboardShortcuts.ts # NEW: Centralized keyboard shortcut system (D-17)
│   ├── useAutoSave.ts         # EXISTING
│   └── useAutoExecute.ts      # EXISTING
├── stores/
│   ├── stubs/
│   │   └── uiPreferencesStore.ts  # EXISTING: Replace stub with full implementation
│   ├── canvasStore.ts         # EXISTING
│   ├── engineStore.ts         # EXISTING
│   ├── aiQueueStore.ts        # EXISTING
│   ├── historyStore.ts        # EXISTING
│   └── nodeGraphStore.ts      # EXISTING
├── indexedb/
│   ├── projectService.ts      # EXISTING (full CRUD)
│   └── db.ts                  # EXISTING (may need new table for prompt templates)
└── services/
    └── useSSEProgress.ts      # EXISTING
```

### Pattern 1: Layout Route with Nested Views
**What:** React Router v7 layout route pattern where a parent layout (app shell with top bar + sidebar) wraps child routes for canvas, projects, and settings.
**When to use:** All multi-view SPA with shared shell.
**Example:**
```typescript
// App.tsx — recommended route structure
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'

const router = createBrowserRouter([
  {
    element: <AppShell />,  // TopBar + Sidebar + <Outlet/>
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <CanvasPage /> },           // / -> canvas
      { path: 'projects', element: <ProjectsPage /> },    // /projects
      { path: 'settings', element: <SettingsPage /> },    // /settings
    ],
  },
])

function AppShell() {
  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col">
      <TopBar />
      <div className="flex-1 flex">
        <TabbedSidebar />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

### Pattern 2: Named Store with Persistence (UIPreferencesStore)
**What:** Extend the existing stub to a full store with IndexedDB persistence via Zustand subscribe + projectService pattern.
**When to use:** Any preference state that must survive page reload.
**Example:**
```typescript
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist } from 'zustand/middleware'

interface UIPreferences {
  theme: 'light' | 'dark' | 'system'
  exportDefaults: {
    format: 'png' | 'jpg'
    scale: 1 | 2 | 3
    background: 'transparent' | 'white'
  }
  sidebarCollapsed: boolean
  activeTab: 'layers' | 'assets' | 'properties'
}

// Use Zustand persist middleware with localStorage for theme (needs to load fast)
// Theme value needs to be available before first render to prevent flash
export const useUIPreferencesStore = create<UIPreferences>()(
  persist(
    immer(() => ({
      theme: 'system',
      exportDefaults: { format: 'png', scale: 1, background: 'transparent' },
      sidebarCollapsed: false,
      activeTab: 'layers',
    })),
    { name: 'ui-preferences' },
  ),
)
```

### Pattern 3: Excalidraw Export via exportToBlob
**What:** Use Excalidraw's built-in export utility to capture the canvas viewport as a Blob, then trigger download.
**When to use:** Any canvas export operation.
**Example:**
```typescript
import { exportToBlob } from '@ac-canvas/excalidraw'

async function exportCanvas(format: 'png' | 'jpg', scale: 1|2|3, background: 'transparent'|'white') {
  const appState = useCanvasStore.getState().excalidrawAPI.getAppState()
  const elements = useCanvasStore.getState().excalidrawAPI.getSceneElements()
  
  const blob = await exportToBlob({
    elements,
    appState: {
      ...appState,
      exportBackground: background === 'white',
      viewBackgroundColor: background === 'white' ? '#ffffff' : 'transparent',
    },
    files: null,
    exportPadding: 10,
    exportScale: scale,
    shouldCapturize: true,
  })
  
  // Trigger download
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `canvas-export.${format}`
  a.click()
  URL.revokeObjectURL(url)
}
```
Source: `packages/excalidraw/utils/export.ts` line 35-53 [VERIFIED: codebase]

### Anti-Patterns to Avoid
- **Router-first approach without shell layout:** Don't put `<Routes>` directly in the root with each page rendering its own shell. This causes duplication and layout shifts. Use layout routes.
- **Inline shortcut handlers scattered across components:** The current codebase has ad-hoc `keydown` listeners in `CanvasWrapper.tsx` and `App.tsx`. Phase 7 must centralize these into `useKeyboardShortcuts`.
- **Direct IndexedDB writes from UI components:** All IndexedDB access should go through `projectService` or store actions, not direct Dexie calls from components.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SPA routing | Custom hash-based router | react-router-dom v7 | URL history, back/forward buttons, deep linking. v7 has loader/action patterns for data loading. |
| Canvas export to PNG/JPG | Custom renderer using canvas API | Excalidraw's `exportToBlob()` | Excalidraw already handles element hierarchy, backgrounds, export padding, resolution scaling, and font rendering. Building a duplicate renderer risks visual differences and doubles maintenance. |
| Tab/sidebar interactions | Custom tab keyboard nav, focus management | shadcn/ui Tabs (built on @base-ui/react tabs) | Accessible tab panels require arrow key navigation, roving tabindex, ARIA roles. shadcn/ui provides all of this. |
| Collapsible side panel | Custom slide animation logic | shadcn/ui Sheet or CSS transitions | Sheet component handles focus trapping, escape-to-close, backdrop, and body scroll lock. |
| Slider inputs for parameters | Custom range slider with mouse/touch drag | shadcn/ui Slider | Touch events, keyboard input (arrow keys), ARIA attributes (valuemin/valuemax/valuenow), RTL support. |
| Dark mode theme toggle | Manual class toggling on `<html>` | Tailwind `dark:` class strategy + system preference detection | Tailwind v4's dark mode via `@media (prefers-color-scheme: dark)` already integrated. `.dark` CSS variables already defined in App.css. |

**Key insight:** Almost every UI interaction in Phase 7 maps to an existing shadcn/ui component or Excalidraw utility. The project should prioritize composition over implementation — wire existing pieces together rather than building new primitives.

## Runtime State Inventory

> Phase 7 is UI-layer only. No data migration or rename is involved. Runtime state inventory is minimal.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | IndexedDB database `AICreativeCanvas` with `projects` and `providerConfigs` tables | None — projectService already uses these. Prompt templates (D-16) may need a new `promptTemplates` table in `db.ts` schema version 3. |
| Live service config | None — all config is client-side | None |
| OS-registered state | None | None |
| Secrets/env vars | ProviderStore encrypts API keys with AES-256-GCM before storing in IndexedDB | None — encryption scheme unchanged. Settings page calls ProviderStore.saveConfig(). |
| Build artifacts | None — no rename/refactor | None |

**Nothing found in other categories:** Verified by codebase audit.

## Common Pitfalls

### Pitfall 1: Layout Flash on Dark Mode Load
**What goes wrong:** When the page loads, the theme value from localStorage is applied after React hydrates, causing a flash of light theme before switching to dark.
**Why it happens:** CSS classes on `<html>` are set by JavaScript, which runs after the browser paints the default (light) theme.
**How to avoid:** Apply the stored theme class to `<html>` in a blocking `<script>` tag in `index.html` before React loads. Read from localStorage synchronously.
**Warning signs:** Fast refresh or hard reload shows brief white flash before dark mode applies.

### Pitfall 2: Export Captures Entire Canvas Instead of Viewport
**What goes wrong:** The default Excalidraw `exportToCanvas` exports all elements in the scene, not just what's visible in the viewport. This creates huge files (or fails for complex canvases).
**Why it happens:** `exportToBlob` defaults to rendering all non-deleted elements with padding.
**How to avoid:** The decision (D-09 specifics) says export captures the current viewport. Set `exportPadding: 0` and use `appState.scrollX/scrollY` to offset the export canvas. Alternatively, accept the full-canvas export as an intentional behavior.
**Warning signs:** Exported PNG is unexpectedly large or contains elements far outside the visible area.

### Pitfall 3: React Router v7 Data Loaders vs. Zustand Stores
**What goes wrong:** Using React Router v7's `loader` functions to load project data conflicts with Zustand stores that manage their own data lifecycle.
**Why it happens:** `loader` functions run before the component renders, while Zustand stores are synchronous. The loader may fetch data into a component-local state that duplicates what the store manages.
**How to avoid:** Don't use loaders/actions for Phase 7. Keep data fetching in `useEffect` or custom hooks that populate Zustand stores. This preserves the existing pattern where stores are the single source of truth.
**Warning signs:** Data appears in both URL loader state and Zustand store, causing stale display.

### Pitfall 4: Collapsible Sidebar Remounts Tab Content
**What goes wrong:** Transitioning from icon-only to full-width sidebar causes tab content to re-mount, losing scroll position and unsaved edits.
**Why it happens:** Conditional rendering (`collapsed ? <IconNav/> : <FullPanel/>`) creates new component instances.
**How to avoid:** Use CSS visibility/opacity transitions with `display: none` rather than conditional JSX. Keep both the icon nav and full panel in the DOM at all times, toggle visibility.
**Warning signs:** Scrolling to a position in Layers tab, collapsing sidebar, then expanding shows scroll reset to top.

### Pitfall 5: Keyboard Shortcut Conflicts with Excalidraw
**What goes wrong:** The new `useKeyboardShortcuts` hook registers handlers that conflict with Excalidraw's built-in keyboard handlers (Ctrl+Z, Delete, arrow keys).
**Why it happens:** Both the app-level hook and Excalidraw's internal handlers listen on `keydown`. Without coordination, Excalidraw may consume events before the app hook sees them, or vice versa.
**How to avoid:** The hook must use event priorities. Canvas-focused shortcuts (Ctrl+Z undo, Delete) should be handled by Excalidraw when canvas is focused. App-level shortcuts (Ctrl+S save, ? shortcuts panel) should take priority globally. Use `e.stopPropagation()` guards and a focus detection pattern.
**Warning signs:** Undo stops working after adding new shortcuts. Or: pressing Delete triggers both Excalidraw delete and an unintended app shortcut.

## Code Examples

### React Router v7 Setup (Layout Route)
```typescript
// main.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppShell } from './AppShell'
import { CanvasPage } from './pages/CanvasPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { SettingsPage } from './pages/SettingsPage'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <TooltipProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<CanvasPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
```
Source: react-router-dom v7 documentation [VERIFIED: npm registry]

### Excalidraw exportToBlob
```typescript
// From: packages/excalidraw/utils/export.ts
export async function exportToBlob(
  opts: {
    elements: readonly ExcalidrawElement[]
    appState: AppState
    files: BinaryFiles | null
    exportPadding?: number
    exportScale?: number
    shouldCapturize?: boolean
  },
): Promise<Blob> {
  const canvas = await exportToCanvas(opts)
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
    }, MIME_TYPES[opts.appState.exportBackground ? 'png' : 'png'])
  })
}
```
Source: Codebase at `packages/excalidraw/utils/export.ts:35-53` [VERIFIED]

### Export Trigger Download Utility
```typescript
// Helper function for the ExportButton component
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
```

### Theme Application (Anti-Flash Pattern)
```html
<!-- index.html — add before React script loads -->
<script>
  (function() {
    try {
      var prefs = JSON.parse(localStorage.getItem('ui-preferences') || '{}');
      var theme = prefs.state && prefs.state.theme;
      if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      }
    } catch(e) {}
  })();
</script>
```

### Slider Replacing Numeric Input in PropertyPanel
```typescript
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'

// Before: <input type="number" value={seed} onChange={e => setSeed(Number(e.target.value))} />
// After:
<div className="flex items-center gap-2">
  <Slider
    value={[seed]}
    onValueChange={([v]) => setSeed(v)}
    min={0}
    max={999999999}
    step={1}
    className="flex-1"
  />
  <Input
    type="number"
    value={seed}
    onChange={e => setSeed(Number(e.target.value))}
    className="w-20"
  />
</div>
```

### App Shell Layout
```typescript
export function AppShell() {
  const sidebarCollapsed = useUIPreferencesStore((s) => s.sidebarCollapsed)

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-background">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar with tab switching */}
        <TabbedSidebar collapsed={sidebarCollapsed} />
        
        {/* Main content area */}
        <main className="flex-1 relative overflow-hidden">
          <Outlet />
        </main>
      </div>
      <ProgressPanel />
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Radix UI Primitives (v1/v2/v3) | @base-ui/react v1.6 | 2025-2026 | Radix was renamed to @base-ui. Import paths changed from `@radix-ui/react-*` to `@base-ui/react/*`. shadcn/ui v4+ uses @base-ui. |
| shadcn/ui with tailwind.config.js | shadcn/ui with CSS-first config | TailwindCSS v4 (2025) | No `tailwind.config.js`. All theme via `@theme` in CSS. |
| React Router v6 | React Router v7 | 2026 | v7 added loader/action patterns but v6 API still works. Can use `<Routes>/<Route>` without loaders. |

**Deprecated/outdated:**
- **Radix UI with `@radix-ui/react-*` imports**: The project uses `@base-ui/react/*` already. Do not install `@radix-ui/react-slider` etc. All shadcn/ui components already use the correct imports.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | react-router-dom v7 can be used with simple `<Routes>/<Route>` pattern (no loaders/actions needed) | Architecture Patterns | Low — v7 is backward-compatible with v6 API. Loaders are optional. |
| A2 | `exportToBlob` from `@excalidraw/utils/export` is accessible from the app's import (re-exported by the package) | Code Examples | Medium — verify the package's `index.tsx` line 233 re-exports it. If not, import directly from the utils path. |
| A3 | `TooltipProvider` from shadcn/ui tooltip wraps the app; its import path is `@/components/ui/tooltip` | Architecture Patterns | Low — verified the generated code shows the TooltipProvider pattern. The export exists. |
| A4 | Zustand `persist` middleware can serialize/deserialize complex objects (theme, exportDefaults) | Code Examples | Low — `persist` works with JSON-serializable values. Theme and export defaults are primitives. |

## Open Questions

1. **How to generate project card thumbnails?**
   - What we know: D-05 mentions canvas thumbnail preview. The auto-save cycle runs every 180ms.
   - What's unclear: Should thumbnails be generated as a byproduct of auto-save? Or lazily when the project list is opened? The "as a byproduct" approach adds cost to every auto-save (even when project list isn't visible).
   - Recommendation: Generate thumbnail lazily — when user navigates to `/projects`, iterate project list and generate thumbnails via `exportToCanvas` at low resolution (200x150) from stored `canvasState`. Cache in IndexedDB blob store with TTL.

2. **How to handle the prompt template editor persistence?**
   - What we know: Phase 4 defines templates as TypeScript constants. D-16 adds runtime editing.
   - What's unclear: Should user-created templates be stored in IndexedDB (new table) or in-memory only?
   - Recommendation: Add a `promptTemplates` table to `db.ts` schema version 3. TemplateEngine can be extended to merge TypeScript constants with IndexedDB records at runtime. User edits write to IndexedDB; built-in templates are read-only from constants.

3. **Keyboard shortcut for canvas mode vs node mode?**
   - What we know: D-17 formalizes shortcuts. Current codebase has two modes (canvas/nodes) with a floating toggle button.
   - What's unclear: Should pressing Escape in node mode return to canvas mode? Should Tab cycle between modes?
   - Recommendation: Tab to switch between modes. Escape deselects current node. Document bindings in the ShortcutPanel.

## Environment Availability

> Phase 7 is a frontend-only UI phase. All dependencies are browser-side.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| react-router-dom | SPA routing | Not installed (available on npm) | 7.18.1 | Use wouter (2KB) but not recommended |
| @base-ui/react | shadcn/ui primitives | Already installed | 1.6.0 | — |
| shadcn/ui components | UI components | Already added (tabs, slider, select, switch, card, dropdown-menu, tooltip, separator, sheet) | Latest via CLI | — |
| Vitest | Testing | Already installed | 4.1.x | — |
| fake-indexeddb | Testing with IndexedDB | Already installed | 6.2.5 | — |
| @testing-library/react | UI component tests | Already installed | 16.3.2 | — |

**Missing dependencies with no fallback:**
- `react-router-dom` — must be installed via `pnpm add react-router-dom`

**Missing dependencies with fallback:**
- None — all other dependencies are already in place

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.x |
| Config file | Inline in `vite.config.ts` (test section) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose --coverage` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | App shell renders with top bar and sidebar | component | `npx vitest run --reporter=verbose -t "app shell"` | Wave 0 |
| UI-02 | Export produces downloadable Blob | integration | `npx vitest run --reporter=verbose -t "export"` | Wave 0 |
| UI-03 | Project list loads from IndexedDB | integration | `npx vitest run --reporter=verbose -t "project list"` | Wave 0 |
| UI-03 | Create project via UI | integration | `npx vitest run --reporter=verbose -t "create project"` | Wave 0 |
| UI-03 | Delete project with confirmation | integration | `npx vitest run --reporter=verbose -t "delete project"` | Wave 0 |
| UI-04 | Settings page renders all sections | component | `npx vitest run --reporter=verbose -t "settings"` | Wave 0 |
| UI-04 | Dark mode toggle persists preference | integration | `npx vitest run --reporter=verbose -t "dark mode"` | Wave 0 |
| D-15 | Slider replaces numeric inputs | component | `npx vitest run --reporter=verbose -t "slider"` | Wave 0 |
| D-17 | Keyboard shortcuts register/unregister | unit | `npx vitest run --reporter=verbose -t "shortcuts"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose -t "test name"`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `apps/web/src/__tests__/components/AppShell.test.tsx` — covers UI-01
- [ ] `apps/web/src/__tests__/components/ExportDialog.test.tsx` — covers UI-02
- [ ] `apps/web/src/__tests__/pages/ProjectsPage.test.tsx` — covers UI-03
- [ ] `apps/web/src/__tests__/pages/SettingsPage.test.tsx` — covers UI-04
- [ ] `apps/web/src/__tests__/hooks/useKeyboardShortcuts.test.ts` — covers D-17
- [ ] `apps/web/src/__tests__/stores/uiPreferencesStore.test.ts` — covers D-11 store persistence

## Security Domain

> Phase 7 is UI-layer only. No new server endpoints or data at rest. The only security-relevant task is the settings page handling of API keys.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | MVP has no auth |
| V3 Session Management | no | Client-side only |
| V4 Access Control | no | Single-user |
| V5 Input Validation | yes | Zod 4 for settings form validation |
| V6 Cryptography | yes (read-only) | ProviderStore already encrypts API keys with AES-256-GCM. Settings page is a consumer, not implementer. |

### Known Threat Patterns for UI Phase
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key exposed in DevTools | Information Disclosure | API keys are encrypted at rest via ProviderStore. Settings page masked input fields (`type="password"`). Keys visible only transiently during entry. |
| localStorage XSS hijack of preferences | Tampering | CSP headers in production build. Preference store contains no secrets (theme, sidebar state, export defaults). |

## Sources

### Primary (HIGH confidence)
- Codebase audit: `app/web/src/` existing components and stores [VERIFIED]
- `packages/excalidraw/utils/export.ts` - Export API signatures [VERIFIED]
- `packages/ai-core/src/config/providerStore.ts` - Provider config CRUD [VERIFIED]
- `apps/web/src/indexedb/projectService.ts` - Project CRUD [VERIFIED]
- `apps/web/src/indexedb/db.ts` - Dexie schema [VERIFIED]
- `apps/web/src/components/ui/` - All shadcn/ui components (8 added during research) [VERIFIED]
- `apps/web/src/stores/stubs/uiPreferencesStore.ts` - Stub to be replaced [VERIFIED]
- `apps/web/src/App.tsx` - Current layout to be restructured [VERIFIED]
- `apps/web/src/App.css` - CSS variables and dark mode [VERIFIED]
- npm registry: react-router-dom v7.18.1 [VERIFIED]

### Secondary (MEDIUM confidence)
- WebSearch: @base-ui/react is the renamed Radix UI [VERIFIED: @base-ui/react npm package]
- WebSearch: shadcn/ui v4 uses @base-ui/react primitives [VERIFIED: shadcn CLI output, components.json]

### Tertiary (LOW confidence)
- None — all claims verified against codebase or npm registry

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified against npm registry and existing codebase
- Architecture: HIGH - Patterns derived from existing codebase conventions
- Pitfalls: HIGH - Based on Excalidraw integration experience and common React patterns
- Export API: HIGH - Verified against excalidraw/utils/export.ts source

**Research date:** 2026-07-01
**Valid until:** 2026-08-01 (stable libraries, unlikely to change)
