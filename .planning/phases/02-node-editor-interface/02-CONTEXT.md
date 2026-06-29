# Phase 2: Node Editor Interface — Context

**Gathered:** 2026-06-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Integrate React Flow 12.x as a transparent overlay on the Excalidraw infinite canvas, enabling users to visually create and connect a node-based AI editing workflow. Deliver 5 custom node types (PromptNode, TextToImageNode, StyleNode, MergeNode, PreviewNode) with drag-connect, parameter panel (right sidebar), graph serialization, and 2 quick-start templates.

**Requirements covered:** NODE-01, NODE-02, NODE-04, NODE-05

**Success criteria:**
1. User can drag 5 node types onto the editor and position them freely
2. User can connect node output sockets to compatible input sockets with visible wires
3. User can select a node and see/edit all its parameters in the right-side parameter panel
4. User can save a node graph layout and reload it with all nodes, wires, and positions restored
</domain>

<decisions>
## Implementation Decisions

### Layout & Canvas Integration
- **D-28: Transparent overlay** — React Flow renders as a transparent-background overlay on top of Excalidraw (absolute positioned, same viewport). Nodes appear to float on the canvas surface. The React Flow viewport (zoom/pan) is synced with the Excalidraw viewport — when the user pans/zooms the canvas, the node overlay follows.
- **D-29: Shared viewport transform** — Implement `canvasToNodeSpace()` and `nodeToCanvasSpace()` in `packages/shared/src/utils/coordinate.ts` (currently stubs). React Flow's `translateExtent` and Excalidraw's scene bounds must align. Test at 50%, 100%, 200%, 400% zoom levels.
- **D-30: Focus mode toggle** — Add a toggle (button or keyboard shortcut) to switch between "Canvas mode" (full Excalidraw interaction) and "Node mode" (full React Flow interaction). In Canvas mode, the node overlay is semi-transparent and non-interactive. In Node mode, canvas interactions are locked and nodes are fully interactive.

### Node Types & Visual Design
- **D-31: Hybrid visual style** — Node internals use clean/modern design (well-defined handles, clear labels, structured parameter layout), but color palette and overall aesthetic lean toward the warm/hand-drawn feel of the product. Think "clean but friendly" — not purely skeuomorphic, not purely cold modern.
- **D-32: 5 node types with distinct visual identity**:
  - **PromptNode** (text input) — Chat/quote icon, large text area visible
  - **TextToImageNode** (generation) — Sparkle/wand icon, shows model/params summary
  - **StyleNode** (reference control) — Palette/brush icon, shows style reference thumbnail
  - **MergeNode** (image composition) — Layers/stack icon, shows input count
  - **PreviewNode** (output display) — Eye/frame icon, shows generated image thumbnail
- **D-33: Node input/output sockets** — Single unified socket type (loose validation per D-35). All sockets rendered as small circles. Color-coded by data flow direction (input = left, output = right) following React Flow convention.
- **D-34: Socket labels** — Each socket has a text label (e.g., "Prompt", "Image", "Style Reference") visible on hover or when zoomed in.

### Connection Validation
- **D-35: Loose type validation (4-step pipeline)** — Socket types are flexible (single unified type), but the following rules are enforced:
  1. No self-connections (source ≠ target)
  2. No duplicate connections (same source→target pair)
  3. No source→source or target→target connections (direction enforced by socket side)
  4. No cycles (DAG must remain acyclic — UI-level cycle prevention)
- **D-36: Visual feedback** — Invalid connections show a red line preview during drag. Valid connections show a green preview.

### Parameter Panel
- **D-37: Right-side property panel** — New `PropertyPanel` component rendered on the right side of the screen. Shows when a node is selected in the node editor. Hidden when no node is selected. Uses `useShallow` selectors on `NodeGraphStore`.
- **D-38: Panel layout** — Header (node type name + icon), body (parameter fields rendered dynamically per node type), footer (action buttons: "Apply to Canvas" for PreviewNode, "Reset" for others).
- **D-39: Parameter field types** — Textarea (PromptNode prompt), Number input (width/height, seed), Select dropdown (model choice, style preset), File/image upload (StyleNode reference, ImageInputNode). No slider components yet — deferred to UI polish phase.
- **D-40: Panel width** — Fixed w-72 (288px). Responsive consideration deferred (mobile not in scope for MVP).
- **D-41: Panel mounted in App.tsx** — Rendered alongside LayerPanel (left) and CanvasWrapper (center). Integrated into the existing flex layout.

### Graph Serialization (NODE-05)
- **D-42: Flat JSON format** — Node graph serialized as `{ nodes: Node[], edges: Edge[] }` where each Node includes `id`, `type`, `position`, `data` (parameters), and `selected` / `dragging` are filtered out (following D-09 transient filter pattern from Phase 1).
- **D-43: Integration with project save** — Serialized graph data stored in IndexedDB as part of the existing `projects` table. Add a `nodeGraph` field to the `Project` type alongside `canvasState` and `viewport`. The existing auto-save hook (`useAutoSave`) is extended to save node graph state as well.
- **D-44: HistoryStore integration** — Node graph state included in unified HistoryStore snapshots (alongside canvas state). This was pre-planned in Phase 1 (D-09). The `NodeGraphStore.serialize()` method (currently stub) is implemented for this purpose.

### Templates (CEO Review Expansion #4)
- **D-45: 2 built-in quick-start templates**:
  1. **Text-to-Image**: PromptNode → TextToImageNode → PreviewNode
  2. **Style Transfer**: ImageInput (canvas element picker) → StyleNode → TextToImageNode → PreviewNode
- **D-46: Template UI** — "Quick Start" button in the node editor toolbar area (top-right corner of the overlay). Clicking opens a small dialog showing template cards (name + short description). Selecting a template replaces the current node graph with the pre-configured nodes and connections.
- **D-47: Templates stored as static JSON** — Template definitions stored in a TypeScript constants file (`apps/web/src/templates/`), not in IndexedDB. Hardcoded for Phase 2; defer user-customizable templates to v0.2.

### Package Structure
- **D-48: New `@ac-canvas/node-editor` package** — Phase 2 introduces a `packages/node-editor/` workspace package containing custom React Flow node components, connection validation helpers, and the ParamMapper. This aligns with D-03's plan to add packages per-phase.
- **D-49: Existing NodeGraphStore stub replaced** — The placeholder in `stores/stubs/nodeGraphStore.ts` is replaced with a real Zustand store in `apps/web/src/stores/nodeGraphStore.ts`, following the same pattern as CanvasStore (Zustand + Immer, fine-grained selectors, serialize/loadSerialized).

### Pre-Phase 2 Steps (CEO Review)
- **D-50: Chinese branding + README** — Define project Chinese name (品牌名) and create/update root README.md with Chinese documentation before starting Phase 2 implementation.
- **D-51: Excalidraw upstream sync** — Sync the vendored fork with upstream Excalidraw before making additional modifications in Phase 2. This minimizes fork drift risk.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & Design
- `.planning/ROADMAP.md` — Phase 2 goal, success criteria, NODE requirements
- `.planning/REQUIREMENTS.md` — Full requirement definitions (NODE-01 through NODE-05)
- `.planning/phases/01-core-canvas/01-CONTEXT.md` — Phase 1 decisions (D-09 unified HistoryStore, D-22 store stubs, D-24 selectors)
- `.planning/phases/01-core-canvas/01-FEASIBILITY-REVIEW.md` — CEO Review: accepted expansions (templates, Chinese branding, upstream sync)
- `.planning/PROJECT.md` — Vision, core value, constraints
- `.planning/STATE.md` — Current project state and progress
- `docs/designs/office-hours-2026-06-29.md` — Office hours design document with product positioning

### Technical Research
- `.planning/research/ARCHITECTURE.md` — Three-layer architecture, connection validation pipeline (Pattern 6), state patterns, React Flow performance notes
- `.planning/research/PITFALLS.md` — Pitfall 3 (Node Soup, sub-groups), Pitfall 6 (Zustand re-render cascade), Pitfall 7 (undo/redo state corruption), Pitfall 12 (coordinate system drift)
- `.planning/research/SUMMARY.md` — Full research synthesis
- `.planning/research/STACK.md` — Version-verified tech stack (@xyflow/react 12.11.1)

### Existing Code
- `apps/web/src/stores/canvasStore.ts` — CanvasStore implementation (serialize pattern reference)
- `apps/web/src/stores/historyStore.ts` — HistoryStore (will receive node graph snapshots)
- `apps/web/src/stores/stubs/nodeGraphStore.ts` — Current stub to be replaced
- `apps/web/src/App.tsx` — Current app layout (will add PropertyPanel + node overlay)
- `packages/shared/src/utils/coordinate.ts` — Coordinate transform stubs to implement
- `packages/shared/src/types/canvas.ts` — Shared type definitions
- `CLAUDE.md` — Project instructions, tech stack constraints
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable from Phase 1
- **HistoryStore** — Unified undo/redo with phase-2-ready architecture (accepts nodeGraph snapshots)
- **CanvasStore** — Fine-grained selector pattern (D-24) to replicate in NodeGraphStore
- **Coordinate stubs** — `canvasToNodeSpace()` / `nodeToCanvasSpace()` need implementation (coordinate normalization per Pitfall 12)
- **App.tsx layout** — Flex layout with LayerPanel left + CanvasWrapper center. Right sidebar property panel slot is available
- **IndexedDB project schema** — Extendable; `nodeGraph` field can be added alongside `canvasState`

### Established Patterns
- Zustand + Immer for stores (with serializers)
- `useShallow` for fine-grained selectors
- Local state for drag, commit on release
- 180ms debounce for auto-save
- `structuredClone()` for history snapshots
- Blob storage for images
- FORK_CHANGES.md for all Excalidraw modifications

### Integration Points for Phase 2
- `apps/web/src/App.tsx` — Will add PropertyPanel (right sidebar) + node editor overlay
- `apps/web/src/stores/nodeGraphStore.ts` — New store (replaces stub)
- `packages/node-editor/` — New package for custom React Flow nodes
- `packages/shared/src/utils/coordinate.ts` — Coordinate transforms (currently throw stubs)
- `apps/web/src/indexedb/` — Project CRUD extended for node graph field
- `packages/excalidraw/FORK_CHANGES.md` — Must be updated if any Excalidraw source changes
</code_context>

<specifics>
## Specific Ideas

- **Overlay interaction model** — When in "Node mode," the Excalidraw canvas beneath becomes non-interactive (pointer events disabled). The React Flow overlay captures all interactions. When in "Canvas mode," the node overlay shows nodes as semi-transparent floating cards that don't interfere with drawing.
- **PreviewNode → Canvas** — PreviewNode has an "Apply to Canvas" button in its parameter panel footer. Clicking places the generated image as an AIElement on the Excalidraw canvas at a configurable position.
- **Node editor panel state** — Panel toggling: Ctrl+Shift+N toggles node editor visibility. When hidden, the canvas is full-screen (useful for focused drawing).
- **Template loading UX** — Loading a template shows a brief confirmation dialog ("This will replace your current node layout"). Undo via Ctrl+Z restores the previous graph state.
</specifics>

<deferred>
## Deferred Ideas

- **Custom node types beyond the 5 core** — Future phases may add ImageInputNode, VideoNode, UpscaleNode, etc.
- **Node sub-groups / "Node Soup" prevention** — Phase 3 (Node Engine) addresses sub-group support (NODE-07)
- **Node execution engine** — Phase 3 (topological sort, dirty-path marking, parallel execution)
- **UI polish pass** — Slider components for numeric parameters, dark mode, responsive layout — Phase 7
- **User-customizable templates** — Saving user-created graphs as reusable templates — v0.2+
- **Mobile/responsive** — Deferred to v1.0
</deferred>

---

*Phase: 02-node-editor-interface*
*Context gathered: 2026-06-29*
