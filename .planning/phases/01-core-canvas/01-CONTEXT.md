# Phase 1: Core Canvas — Context

**Gathered:** 2026-06-29
**Status:** Ready for planning
**Mode:** Auto-discussed (--auto)

<domain>
## Phase Boundary

Establish the infinite canvas foundation — an Excalidraw v0.18.x fork (`packages/excalidraw/`) with full drawing tools, element management (layers, grouping, lock, hide), unified undo/redo, chunk-based performance rendering, and IndexedDB project persistence. This is the rendering surface that all subsequent phases (node editor overlay, AI elements, UI shell) build upon.

**Requirements covered:** CANVAS-01, CANVAS-02, CANVAS-03, CANVAS-04, CANVAS-05, CANVAS-06

**Success criteria:**
1. User can pan, zoom, draw basic shapes, and drag elements freely on an infinite canvas
2. User can manage element layers (reorder, group, lock, hide) with visual feedback
3. User can undo/redo all canvas operations (draw, move, delete, layer change)
4. User can save a project to IndexedDB and reload it to restore exact canvas state
5. Canvas maintains smooth 60fps with 500+ elements rendered (chunk rendering active)
</domain>

<decisions>
## Implementation Decisions

### Repository & Structure
- **D-01: Full vendored fork** — Excalidraw source is copied wholesale as `packages/excalidraw/` (not an npm wrapper). This gives full control to add AIElement types and integrate deeply. FORK_CHANGES.md must exist from commit 1, documenting every modified file.
- **D-02: Fork base** — Fork from the latest Excalidraw v0.18.x release tag (not `develop`) that supports React 19. Verified via Excalidraw PR #9182.
- **D-03: Monorepo for Phase 1** — Minimal monorepo structure: `packages/excalidraw/` (forked source), `packages/shared/` (TypeScript types, constants, transform utilities), `apps/web/` (Vite 8 SPA entry point, Zustand stores, UI shell). Other packages (node-editor, ai-core) are added in later phases.
- **D-04: pnpm workspace** — Use pnpm 11 workspaces with `pnpm-workspace.yaml`. Lockfile in root.

### Drawing & Canvas
- **D-05: Full Excalidraw drawing toolset** — Ship with Excalidraw's built-in tools: rectangle, ellipse, arrow, line, freehand, text, image, eraser. Removing tools is extra work with zero benefit. Custom tools can be added per-phase.
- **D-06: Excalidraw UI intact** — Keep Excalidraw's native toolbar and context menus in Phase 1. Application-level toolbar and sidebar replacements come in Phase 7 (Application UI).

### Element Management (CANVAS-03)
- **D-07: Hybrid layer management** — Sidebar layer panel (custom React component) for visual layer operations (reorder, group, lock, hide, delete) + Excalidraw native context menu for quick actions. The sidebar panel reads from CanvasStore and dispatches through Excalidraw's element API.
- **D-08: Layer panel as a new React component** — Not embedded in Excalidraw's source. Built as an `apps/web` component that communicates via CanvasStore. This keeps Excalidraw modifications minimal (D-01/FORK_CHANGES.md scope).

### Undo/Redo (CANVAS-05)
- **D-09: Custom unified HistoryStore** — Not Excalidraw's built-in undo, not zundo middleware. A dedicated Zustand store (`useHistoryStore`) that snapshots both canvas and (future) node graph state atomically on a single stack.
  - 180ms debounce merge window (identical rapid changes collapse into one snapshot)
  - Pause history capture during drag operations; commit one snapshot on `pointerup`
  - 50-snapshot maximum depth
  - Deep clone via `structuredClone()` before storing
  - Filter Excalidraw transient properties (`isSelected`, `dragging`, `measured`) from snapshots
  - Scope history per active project (clear on project switch)
- **D-10: Excalidraw's native undo disabled** — Hook into Excalidraw's `onChange` to capture external state changes, but route all undo/redo through the unified HistoryStore. Prevent conflicts between two undo stacks.

### AIElement Design (CANVAS-02)
- **D-11: Custom AIElement type** — Extends Excalidraw's `NonDeletedExcalidrawElement` base with metadata fields: `prompt`, `aiProvider`, `generationParams`, `generationStatus` (idle | queued | generating | done | error), `imageBlobId` (reference to Blob store). This is a placeholder now; actual AI generation integration comes in Phases 4-5.
- **D-12: AIElement rendering as Image with overlay** — When `generationStatus === 'done'`, renders the image. While generating, shows a placeholder rectangle with loading indicator and the prompt text. Uses Excalidraw's existing image rendering path internally.
- **D-13: Blob storage for images** — Store AI-generated images as Blob references (not base64-encoded data URLs). Saves ~33% space. Assign a `blobId` stored in the AIElement; load into `ImageBitmap` via `createImageBitmap()` when rendering.

### Persistence (CANVAS-06)
- **D-14: Dexie.js single-table design** — One table `projects` with schema: `id (autoIncrement), name, canvasState (JSON blob), viewport (JSON), createdAt, updatedAt`. This is MVP-simple; normalize in later milestones if needed.
- **D-15: Auto-save + explicit Save/Save As** — Auto-save triggered on canvas changes with 180ms debounce (matches history merge window). Explicit "Save" (updates current project) and "Save As" (creates new project copy) available. First save on a new project always prompts for a name.
- **D-16: Serialization** — `CanvasStore.serialize()` exports clean element data (no transient rendering state). `NodeGraphStore.serialize()` is a stub in Phase 1. The serialized payload is a flat JSON bundle stored as a single IndexedDB record.
- **D-17: Storage monitoring** — Use `navigator.storage.estimate()` to check available quota before saving. Warn user when approaching browser storage limits. Request persistent storage via `navigator.storage.persist()`.

### Performance (CANVAS-04)
- **D-18: Chunk rendering** — Partition canvas into 2000×2000px chunks. Only render chunks intersecting the current viewport plus one chunk buffer in each direction. Use Excalidraw's existing rendering pipeline with chunk-aware culling.
- **D-19: LRU image cache** — In-memory LRU cache for decoded AI images with 200MB hard memory limit. Evict least-recently-viewed images to IndexedDB when exceeded. `URL.revokeObjectURL()` in cleanup.
- **D-20: Resolution-tiered rendering** — AI images render at tiered resolution based on zoom level:
  - Zoom < 50%: colored rectangle + label (no image decode)
  - Zoom 50-100%: half-resolution via OffscreenCanvas
  - Zoom > 100%: full resolution
  - This applies only to AIElement types, not to native Excalidraw drawing elements.
- **D-21: Dual-canvas separation sacred** — Maintain Excalidraw's `StaticCanvas` / `InteractiveCanvas` separation. AIElement rendering only touches `StaticCanvas`. Never trigger StaticCanvas redraws from transient UI interactions (hover, selection drag).

### State Management
- **D-22: CanvasStore active in Phase 1** — Domain-split per architecture. Phase 1 creates `CanvasStore` (elements, viewport, selection) and `HistoryStore` (undo/redo). Other stores (NodeGraphStore, AIQueueStore, UIPreferencesStore) are stubs or created later.
- **D-23: Local-state-for-drag** — During element drag/resize/draw, use local React state. Only commit to CanvasStore (and capture history snapshot) on `pointerup`. Reduces re-renders ~75% during drag interactions.
- **D-24: Fine-grained selectors** — All components use `useShallow()` with narrow selectors. No component subscribes to an entire store. This pattern is enforced from Phase 1 to prevent re-render cascade when stores grow.

### Fork Maintenance
- **D-25: Upstream sync cadence** — Sync Excalidraw upstream every 2-4 weeks. Set calendar reminder. Before each sync, review FORK_CHANGES.md to identify customizations that may conflict.
- **D-26: FORK_CHANGES.md discipline** — Every phase that touches `packages/excalidraw/` must update FORK_CHANGES.md with: file changed, reason, date, phase reference. No exception.
- **D-27: Contribute upstream** — Any generic (non-domain-specific) bug fix found in Excalidraw should be PR'd to the upstream repo. If accepted, it becomes the community's maintenance burden.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & Design
- `.planning/research/SUMMARY.md` — Full research synthesis including fork strategy, performance patterns, undo/redo design, and pitfall mitigations
- `.planning/research/ARCHITECTURE.md` — Three-layer architecture, Zustand store split, data flows, patterns to follow and anti-patterns to avoid
- `.planning/research/PITFALLS.md` — All identified pitfalls; Phase 1 critical: Fork Drift (Pitfall 1), Rendering Performance (Pitfall 2), Browser Memory (Pitfall 8), Scope Creep (Pitfall 10)
- `.planning/research/FEATURES.md` — Feature definitions, competitive analysis, "three-body linkage" concept
- `.planning/research/STACK.md` — Version-verified tech stack with ADR-level decisions
- `.planning/PROJECT.md` — Vision, key decisions, constraints, requirements (CANVAS-01 through CANVAS-06)
- `.planning/REQUIREMENTS.md` — Full requirement traceability matrix
- `.planning/ROADMAP.md` — Phase 1 goal, success criteria, dependency structure
- `.planning/config.json` — Workflow configuration (auto_advance, code review settings)

### Codebase State
- `.planning/STATE.md` — Current project state, progress tracking, blocker log
- `CLAUDE.md` (project root) — Project instructions, tech stack constraints, GSD workflow enforcement
</canonical_refs>

<code_context>
## Existing Code Insights

### Greenfield Project
- **No existing code** — This is the first phase. Zero reusable assets or existing patterns to integrate with.
- **Planning documents only** — `.planning/*.md` files, `.planning/research/*.md`, and `.planning/config.json` contain all prior decisions.
- **CLAUDE.md** at project root contains tech stack specifications, constraints, and GSD workflow rules.

### Key Integration Points (Will Be Created in Phase 1)
- `packages/excalidraw/` — The Excalidraw fork (vendored source). Every subsequent phase depends on this.
- `packages/shared/` — Shared TypeScript types. Must export `AIElement` type, `Project` type, and coordinate transform utilities.
- `apps/web/stores/` — Zustand stores: `canvasStore.ts`, `historyStore.ts` (active); stubs for others.
- `apps/web/` — Vite 8 SPA entry, App shell with the Excalidraw canvas component.
- `apps/web/indexedb/` — Dexie.js database setup and CRUD operations.

### Established Patterns (from Research)
- Domain-split Zustand stores with fine-grained selectors
- Local state for drag, commit to global store on release
- 180ms debounce merge window for rapid state changes
- All images stored as Blob (not base64)
- `structuredClone()` for history snapshot deep copies
- `URL.revokeObjectURL()` in component cleanup

### What Phase 2+ Expects From Phase 1
- Clean `CanvasStore.elements` that can be read by node editor (Phase 2)
- `HistoryStore` that accepts both canvas and node graph snapshots (Phase 2)
- `AIElement` type definition in `packages/shared/` (Phase 3)
- Working project save/load flow via IndexedDB (Phase 2)
- Chunk rendering that handles AI-generated images as elements (Phase 3)
</code_context>

<specifics>
## Specific Ideas

- **FORK_CHANGES.md template** — All modifications to Excalidraw source tracked in a single file at `packages/excalidraw/FORK_CHANGES.md`. Each entry: file path, modification reason, date, phase reference. This prevents fork drift (Pitfall 1).
- **Chip-based element type for AI** — AIElement is a new element type added to Excalidraw's element registry, not a wrapper around the existing Image element. This allows distinct rendering and interaction behavior.
- **Performance-first mindset** — Chunk rendering, LRU cache, and resolution-tiered rendering are built in Phase 1, not deferred. This prevents performance collapse when AI images arrive in Phase 3 (Pitfall 2 mitigation).
- **Excalidraw's dual-canvas stays intact** — The StaticCanvas/InteractiveCanvas separation is preserved. AIElement additions only touch the rendering pipeline where strictly necessary.
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

### Out-of-Scope for Phase 1 (Belong in Later Phases)
- Application toolbar/sidebar/panel shell — Phase 7 (Application UI)
- Node editor integration — Phase 2
- AI generation integration — Phases 4-5
- Image export (PNG/JPG) — Phase 7
- Keyboard shortcut manager — Phase 7 (but ensure EventListener hygiene from Phase 1)
- React Flow coordinate system normalization — Phase 2
- Project list/management page — Phase 7
- Settings page with API key config — Phase 7
- Custom node types — Phase 2
</deferred>

---

*Phase: 01-core-canvas*
*Context gathered: 2026-06-29*
