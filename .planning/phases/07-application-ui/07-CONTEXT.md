# Phase 7: Application UI — Context

**Gathered:** 2026-07-01
**Status:** Ready for planning

<domain>
## Phase Boundary

构建完整的应用体验——在已有无限画布和节点编辑器的基础上，封装统一的 App Shell（工具栏、可折叠左侧面板、上下文工具）、项目管理页面（创建/浏览/打开/删除）、画布导出（PNG/JPG 快捷导出 + 高级配置）、设置页面（AI API Key、主题、导出默认值），以及从前期阶段汇聚的延迟 UI 功能（全局进度面板、执行日志、滑块组件、可视化提示词编辑器）。

**Requirements covered:** UI-01（应用 Shell）, UI-02（画布导出）, UI-03（项目管理）, UI-04（设置页面）

**本阶段不包含：** 用户系统/注册登录（v0.2）、模板广场（v0.3）、云端同步协作（v0.3）、Electron 桌面应用（v0.3）、移动端适配（v1.0）

**Success criteria:**
1. User sees a consistent application shell with minimal top bar, collapsible left sidebar (tabs: Layers | Assets | Properties), and contextual tools
2. User can create a new project (blank or from template), browse a grid of projects, open an existing project, save changes, and delete projects
3. User can export the current canvas as PNG or JPG with configurable resolution (quick one-click default + advanced options)
4. User can navigate to a settings page and configure AI API keys, default provider, theme (light/dark/system), export defaults, and other preferences
5. Global execution progress panel provides queue visibility; execution log panel shows node execution history
6. Slider components replace numeric input fields for parameter adjustment; visual prompt template editor available in settings
7. Keyboard shortcut system with discovery panel is operational
</domain>

<decisions>
## Implementation Decisions

### App Shell & Navigation

- **D-01: Hybrid navigation model** — Primary views (canvas, project list, settings) use React Router for URL-aware navigation. Secondary interactions (export config, template selection, prompt editor) use modals/dialogs. This gives clean navigation for main views while keeping lightweight interactions in modals.
- **D-02: Minimal top bar + contextual tools** — The top bar contains only global operations: project name (editable), save status indicator, and view-switching icons (canvas / projects / settings). Tool UIs appear contextually based on the active view/mode — extending the current focus mode concept (canvas mode vs node mode).
- **D-03: Left unified panel with tab switching** — Consolidate the current split layout (LayerPanel left + PropertyPanel right) into a single left-side panel with tab navigation: **Layers** (element layer management), **Assets** (AI-generated image library), **Properties** (selected node/element property editing). This reduces visual fragmentation and simplifies the layout.
- **D-04: Fixed-width + collapsible sidebar** — The left panel has a fixed width (~288px) but can be collapsed to icon-only state via a toggle button. When collapsed, tabs appear as icons; expanding restores full panel width.

### Project Management (UI-03)

- **D-05: Grid card view** — Project list displays as a grid of cards. Each card shows: project name, created/updated timestamp, and canvas thumbnail preview (captured auto-save state). Cards are clickable to open the project.
- **D-06: Start page with blank + template** — New project creation offers a start page: "Blank Canvas" option alongside the 2 existing quick-start templates (Text-to-Image, Style Transfer from Phase 2 D-45). Modeled after Figma's start page pattern.
- **D-07: All project CRUD exists** — `projectService` (save/update/load/delete/list) already in IndexedDB from Phase 1. Phase 7 only needs the UI layer on top. No new storage work needed.

### Canvas Export (UI-02)

- **D-08: Quick one-click + advanced dropdown** — Default export is a single-click "Export PNG" button (1x resolution, transparent background). An adjacent dropdown arrow reveals advanced options: format (PNG/JPG), resolution scale (1x/2x/3x), and background (transparent/white).
- **D-09: No export preview** — Export proceeds directly to download without a preview step. The canvas viewport serves as the preview. This keeps the flow fast.

### Settings Page & Dark Mode (UI-04)

- **D-10: Full settings scope** — Settings page includes: **AI Provider config** (API keys, base URLs, default model per provider, enable/disable toggles), **Theme** (light/dark/system — prefers-color-scheme), **Export defaults** (default format, resolution, background), **Language** (future expansion, placeholder UI).
- **D-11: Dark mode — full Phase 7 implementation** — Complete dark mode with Tailwind `dark:` class strategy. All existing components adapted for dark theme. Includes "follow system" option via `prefers-color-scheme` media query. UIPreferencesStore (currently stub) is fully implemented with persisted preference.
- **D-12: Settings page as a routed view** — Settings is a full-page view accessed via `/settings` route (per D-01 hybrid navigation). Not a modal or overlay.

### Deferred Features (from prior phases)

- **D-13: Global execution progress panel** — A collapsible panel (bottom or right side of canvas view) showing AI queue status: queued → processing → done/error per node. Maps to AIQueueStore and EngineStore state. More detailed than Phase 3's node-level status indicators.
- **D-14: Execution log panel** — A panel showing node execution history: timestamps, duration, output summary, error messages. Useful for debugging workflows. Accessible from the left sidebar or a dedicated view.
- **D-15: Slider components** — Replace numeric `<input type="number">` fields in PropertyPanel with custom slider controls for parameters: width/height, seed, strength, etc. Use Radix UI Slider or shadcn/ui slider.
- **D-16: Visual prompt template editor** — In-app UI for creating and editing prompt templates. Accessible from settings or a dedicated interface. Phase 4 defined templates as TypeScript constants (D-12); Phase 7 adds runtime editing with IndexedDB persistence.

### Keyboard Shortcuts

- **D-17: Formal shortcut management system** — `useKeyboardShortcuts` hook centralizing all keyboard shortcut bindings. Supports: enable/disable state (e.g., disabled when typing in input fields), shortcut grouping, and collision detection.
- **D-18: Shortcut discovery panel** — A searchable/scrollable panel listing all available keyboard shortcuts. Accessible via `?` key or from the settings menu. Design follows common patterns (VS Code, Linear-style command palette).

### Claude's Discretion
- React Router route structure (`/canvas`, `/projects`, `/settings`, `/`)
- Specific keyboard shortcut bindings (the system design is locked; actual bindings are implementation detail)
- Tab panel implementation approach (shadcn/ui Tabs or custom)
- Collapsible sidebar animation and transition timing
- Progress panel positioning and visual design
- Slider component styling (color, size, step sizes)
- Prompt editor UI layout and save flow
- Dark mode CSS variable definitions and color palette
- Export resolution algorithm (OffscreenCanvas vs canvas.toBlob)
- Error handling UX for project deletion (undo toast vs confirmation dialog)
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Boundary & Requirements
- `.planning/ROADMAP.md` §Phase 7 — Goal, success criteria (app shell, export, project management, settings)
- `.planning/REQUIREMENTS.md` — UI-01 (toolbar, sidebar, asset panel), UI-02 (PNG/JPG export), UI-03 (project CRUD), UI-04 (settings)

### Prior Phase Decisions (Mandatory Reading)
- `.planning/phases/01-core-canvas/01-CONTEXT.md` — D-06 (Excalidraw native toolbar kept in Phase 1, replacement deferred to Phase 7), D-09 (HistoryStore design — affects export timing), D-14~17 (IndexedDB persistence — project CRUD exists), D-22 (CanvasStore active — UIPreferencesStore stub)
- `.planning/phases/02-node-editor-interface/02-CONTEXT.md` — D-37~41 (PropertyPanel design — will be moved to left tabbed panel), D-42~44 (serialization — affects export), D-45~47 (templates — reused for start page)
- `.planning/phases/03-node-engine/03-CONTEXT.md` — D-03 (node status indicators — execution log/panel builds on this), D-09 (EngineStore — progress panel reads from here)
- `.planning/phases/04-ai-adapters/04-CONTEXT.md` — D-08~10 (ProviderStore — settings page reads/writes), D-11~14 (TemplateEngine/prompt templates — visual editor builds on this)
- `.planning/phases/05-ai-execution-infrastructure/05-CONTEXT.md` — D-01 (frontend-only progress — Phase 7 progress panel replaces this pattern), D-02 (AIQueueStore — progress panel reads from here), D-05 (node status indicators as progress)
- `.planning/phases/06-backend-services/06-CONTEXT.md` — D-05 (AI proxy API — settings page provider config), D-07 (direct/proxy mode toggle — settings page)

### Existing Code (Read for Patterns)
- `apps/web/src/App.tsx` — Current app shell layout (LayerPanel + CanvasWrapper + PropertyPanel). Phase 7 replaces/reorganizes this structure.
- `apps/web/src/components/LayerPanel.tsx` — Current left sidebar with layer management + save buttons. Will be refactored into tabbed panel.
- `apps/web/src/stores/stubs/uiPreferencesStore.ts` — UIPreferencesStore stub (currently only `theme: 'light'`). Phase 7 implements fully.
- `apps/web/src/stores/canvasStore.ts` — CanvasStore with `serialize()` — export reads from here.
- `apps/web/src/stores/engineStore.ts` — EngineStore with `nodeStatus`, `nodeErrors`, `isExecuting` — progress panel reads from here.
- `apps/web/src/indexedb/projectService.ts` — Full CRUD: save/update/load/delete/list. Project management UI only needs to call these.
- `apps/web/src/indexedb/db.ts` — Dexie schema with projects + providerConfigs tables. Settings page writes to providerConfigs.
- `apps/web/src/stores/providerStoreSingleton.ts` — ProviderStore singleton. Settings page uses this for API key CRUD.
- `packages/ai-core/src/prompt/templateEngine.ts` — Template engine. Visual prompt editor uses this as runtime.
- `packages/ai-core/src/prompt/templates.ts` — Template definitions (TypeScript constants). Prompt editor reads/writes to IndexedDB.
- `packages/ai-core/src/interfaces/AiAdapter.ts` — `getConfigSchema()` — drives auto-generated form fields in settings.
- `packages/shared/src/types/canvas.ts` — AIElement type with `generationStatus` — progress panel displays.

### Configuration
- `.planning/PROJECT.md` — Vision, constraints (Deployment: Web-first, SPA + Hono), key decisions
- `.planning/STATE.md` — Current project state
- `CLAUDE.md` — Tech stack constraints (React 19, TailwindCSS 4, Zustand 5, shadcn/ui, Lucide icons)
- `apps/web/package.json` — Current dependencies (add react-router-dom, Radix UI slider, shadcn/ui extensions)
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **projectService** (`apps/web/src/indexedb/projectService.ts`) — Full project CRUD: `save`, `update`, `load`, `delete`, `list`. Project management page calls these directly. No backend needed.
- **ProviderStore** (`apps/web/src/stores/providerStoreSingleton.ts`) — Provider config with encrypted API key storage. Settings page reads/writes via this.
- **EngineStore** (`apps/web/src/stores/engineStore.ts`) — `nodeStatus`, `nodeErrors`, `isExecuting`. Progress panel and execution log panel consume this.
- **AIQueueStore** (`apps/web/src/stores/aiQueueStore.ts`) — Per-provider queue state. Progress panel shows queue depth and status.
- **UIPreferencesStore** (stub, `apps/web/src/stores/stubs/uiPreferencesStore.ts`) — Currently `{ theme: 'light' }`. Phase 7 implements full store with persistence.
- **TemplateEngine** (`packages/ai-core/src/prompt/templateEngine.ts`) — Handlebars-compatible parser. Prompt editor uses this for preview/testing.
- **shadcn/ui components** — `button.tsx`, `dialog.tsx`, `input.tsx` exist. Phase 7 adds: tabs, slider, select, switch, card, dropdown-menu, tooltip, separator.
- **Lucide icons** (`lucide-react`) — Already installed. Icons for: project grid, settings, export, theme toggle, panel tabs, shortcuts.

### Established Patterns
- Zustand + Immer stores with fine-grained `useShallow` selectors (all existing stores follow this)
- `serialize()` / `loadSerialized()` interface for all state stores
- 180ms debounce merge window for auto-save and history
- `structuredClone()` for snapshot deep copies
- Blob storage for images (base64 avoided)
- shadcn/ui component pattern (className merge with cn() utility)

### Integration Points for Phase 7
- **`apps/web/src/App.tsx`** — Complete restructure: add React Router `<Routes>`, replace ad-hoc UI with minimal top bar + tabbed left panel + contextual tools. Canvas view becomes one route among others.
- **`apps/web/src/components/LayerPanel.tsx`** — Refactor: extract save buttons (move to top bar), add tab system (Layers/Assets/Properties), add collapsible behavior.
- **New: `apps/web/src/pages/`** — Create `ProjectsPage.tsx` (project grid), `SettingsPage.tsx` (settings form). Canvas stays as a page route.
- **New: `apps/web/src/components/TopBar.tsx`** — Minimal top bar with project name, save indicator, view switcher.
- **New: `apps/web/src/components/ExportDialog.tsx`** — Export configuration dialog (format, resolution, background).
- **New: `apps/web/src/components/ProgressPanel.tsx`** — Execution progress panel.
- **New: `apps/web/src/components/ExecutionLog.tsx`** — Execution log panel.
- **New: `apps/web/src/components/PromptEditor.tsx`** — Visual prompt template editor.
- **New: `apps/web/src/hooks/useKeyboardShortcuts.ts`** — Keyboard shortcut management hook.
- **New: `apps/web/src/components/ShortcutPanel.tsx`** — Shortcut discovery panel.
- **`apps/web/src/stores/stubs/uiPreferencesStore.ts`** — Replace stub with full implementation (persist to IndexedDB).
- **`apps/web/src/indexedb/db.ts`** — May need new table for prompt templates (if user-created templates are persisted beyond TypeScript constants).

### New Dependencies Required
- `react-router-dom` — SPA routing for main views (canvas, projects, settings)
- Additional shadcn/ui components via CLI: `tabs`, `slider`, `select`, `switch`, `card`, `dropdown-menu`, `tooltip`, `separator`

### Assets & Design
- Project card thumbnails — Generated from canvas state (`canvasStore.serialize()` → render to OffscreenCanvas → capture as data URL for card display)
- Dark mode — Tailwind `dark:` class strategy, CSS variables for colors, `prefers-color-scheme` media query for system mode
- Prompt editor — Builds on Phase 4's template system: `Template` interface structure, `{{variable}}` syntax parsing
</code_context>

<specifics>
## Specific Ideas

- **Start page like Figma** — New project creation should feel like Figma's start page: clean grid of options with thumbnail previews for templates, not a dropdown menu or dialog
- **Project thumbnail as auto-save byproduct** — When auto-save runs (180ms debounce), capture a low-res thumbnail of the current canvas state. This gives the project grid live previews at no additional cost
- **Dark mode as CSS variables** — Use Tailwind's `dark:` variant with CSS custom properties. `:root` for light, `.dark` for dark values. This keeps component code clean: components don't need `dark:` on every class
- **`?` key for shortcuts** — Following VS Code and Linear convention, pressing `?` opens the keyboard shortcuts panel
- **Export uses current viewport** — Export captures exactly what the user sees in the viewport, not the entire infinite canvas. This is the expected behavior for creative tools (Figma, Sketch both work this way). Full-canvas export is a future enhancement
- **Prompt editor live preview** — When editing a template, show a live preview panel rendering the template with sample variable values, giving immediate feedback on prompt construction
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope, and all accumulated deferred items from prior phases were folded into Phase 7 decisions.

### Reviewed Todos (not folded)
No pending todos matched Phase 7 scope.

</deferred>

---

*Phase: 07-application-ui*
*Context gathered: 2026-07-01*
