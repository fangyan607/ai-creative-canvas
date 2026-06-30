---
phase: 02-node-editor-interface
plan: 04
subsystem: ui
tags: [reactflow, shadcn, dialog, tailwindcss, lucide, pnpm-workspace]

requires:
  - phase: 02-02-node-graph-store
    provides: NodeGraphStore with CRUD, serialization, focus mode, selection
  - phase: 02-03-node-components
    provides: 5 node components (PromptNode, TextToImageNode, StyleNode, MergeNode, PreviewNode), ConnectionValidator

provides:
  - NodeEditorOverlay with transparent ReactFlow over Excalidraw canvas
  - FocusModeToggle for Canvas/Node mode switching
  - ConnectionLine custom bezier preview (green/red per validation)
  - PropertyPanel with dynamic per-node-type parameter fields
  - TemplateDialog with hardcoded quick-start templates
  - Template data constants (Text-to-Image, Style Transfer)

affects:
  - 02-05-integration: App.tsx layout, CanvasStore integration
  - Phase 4-5: AI generation
  - Phase 7: Excalidraw viewport sync

tech-stack:
  added:
    - ReactFlow v12.11.1 connection line component pattern
    - Dynamic import for cross-package module resolution
    - shadcn Dialog (base-nova style) with template selection UI
  patterns:
    - Bidirectional node/edge sync between Zustand store and ReactFlow
    - Store subscription for external graph mutations (template load, undo)
    - 300ms debounced text field updates in PropertyPanel
    - Cross-package imports via pnpm workspace (node-editor -> apps/web)

key-files:
  created:
    - packages/node-editor/src/NodeEditorOverlay.tsx
    - packages/node-editor/src/FocusModeToggle.tsx
    - packages/node-editor/src/ConnectionLine.tsx
    - packages/node-editor/src/PropertyPanel.tsx
    - packages/node-editor/src/TemplateDialog.tsx
    - packages/node-editor/src/templates/index.ts
    - apps/web/tsconfig.json (@/ path alias for shadcn)
  modified:
    - packages/node-editor/src/index.ts
    - packages/node-editor/tsconfig.json

decisions:
  - Custom keyboard handler for delete confirmation (instead of ReactFlow`s deleteKeyCode) to show shadcn Dialog before removal
  - Lazy import of templates module via dynamic import() in template selection handler to avoid circular dependencies
  - Store data passed through `useNodeGraphStore` hook (direct import cross-package) rather than prop-drilled callbacks, as pnpm workspace links resolve to source
  - PropertyPanel accepts no callbacks — reads store via cross-package import for simplicity

---

# Phase 2 Plan 4: Interactive UI Components — Summary

One-liner: Transparent ReactFlow overlay with focus toggle, dynamic property panel, template selection dialog, and connection line — all wired bidirectionally to NodeGraphStore.

## Tasks Executed

### Task 1: NodeEditorOverlay, FocusModeToggle, ConnectionLine

Built the core interactive layer:

- **ConnectionLine**: Custom React Flow `ConnectionLineComponent` renders a bezier path preview. Stroke is `var(--color-connection-valid)` (green, #1ea64a) when valid, `var(--color-connection-invalid)` (red, #ef4444) when invalid. Matches D-36 connection color spec. Exported as default and named export.

- **FocusModeToggle**: Segmented button group (Canvas/Nodes) with `rounded-pill` overflow-hidden style. Active button: `bg-black text-white`. Inactive: `bg-white text-black`. Keyboard hint text below each label. Exports `FocusMode` type (`'canvas' | 'nodes'`).

- **NodeEditorOverlay**: Main ReactFlow wrapper with:
  - ReactFlowProvider/OverlayInner split for hook access
  - `useMemo` nodeTypes mapping all 5 node types (PromptNode, TextToImageNode, StyleNode, MergeNode, PreviewNode)
  - Bidirectional sync: store nodes/edges -> local ReactFlow state via useEffect; user changes -> store via onNodesChange/onEdgesChange callbacks
  - Connection validation via `isValidConnection` prop using existing ConnectionValidator
  - Drag-to-create: draggable node type toolbar buttons with HTML drag-and-drop
  - "Quick Start" button opening TemplateDialog
  - Keyboard delete (Delete/Backspace) with shadcn Dialog confirmation
  - Viewport sync from CanvasStore on focus mode change
  - Transparent bg, `pointerEvents: 'auto'` in node mode, `pointerEvents: 'none'` + opacity 0.4 in canvas mode

### Task 2: PropertyPanel

Created the right-side parameter panel (w-72, full-height, white bg, border-left):
- Empty state: centered "妙手即成" in `text-2xl font-semibold text-muted-foreground/40` with caption
- Loaded state: header (icon + type label), body (dynamic param fields), footer (action button)
- Four field type renderers: TextField (textarea, 300ms debounce), NumberField (number input), SelectField (dropdown), FileField (disabled placeholder)
- Footer: PreviewNode shows disabled "Apply to Canvas" button; other types show "Reset" that restores defaults
- Cross-package imports from `@ac-canvas/shared` for nodeTypeDefinitions, from `apps/web/src/stores/nodeGraphStore` for store access

### Task 3: TemplateDialog and Templates

Created template infrastructure:
- `templates/index.ts`: `Template` interface, `TEMPLATES` array with 2 entries (Text-to-Image: 3 nodes, 2 edges; Style Transfer: 3 nodes, 2 edges), `applyTemplate()` deep-clone function
- `TemplateDialog.tsx`: shadcn Dialog with "天从人愿" heading (per UI-SPEC copy contract), card grid (grid-cols-1, gap-3), Cancel button
- History snapshot captured via `useHistoryStore.captureSnapshot()` before template replaces graph
- Template selection loads via `useNodeGraphStore.loadSerialized()`

## Deviations from Plan

None — plan executed as written.

## Verification

- `npx tsc --noEmit -p packages/node-editor/tsconfig.json`: PASS (no errors)
- `npx tsc --noEmit -p apps/web/tsconfig.json`: PASS for node-editor (pre-existing errors in excalidraw, shadcn missing deps unrelated)
- All 6 new components exported from `@ac-canvas/node-editor`

## Key Metrics

- **Duration**: ~25 minutes
- **Files created**: 6 (+ 2 stubs replaced)
- **Files modified**: 2 (index.ts, tsconfig.json)
- **Commits**: 3 (one per task)

## Commits

- `2d768bd`: feat(02-04): create NodeEditorOverlay, FocusModeToggle, and ConnectionLine
- `8130712`: feat(02-04): create PropertyPanel with dynamic parameter fields
- `9fa05e5`: feat(02-04): create TemplateDialog and template definitions

## Self-Check: PASSED

All 6 new files exist. All 3 task commits verified. No stubs found beyond intentional MVP placeholders (disabled "Apply to Canvas", file upload placeholders).

## Threat Flags

None — this plan creates UI components within existing trust boundaries. No new network endpoints, auth paths, or schema changes introduced.
