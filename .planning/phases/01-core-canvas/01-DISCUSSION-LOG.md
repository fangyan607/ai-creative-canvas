# Phase 1: Core Canvas — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-29
**Phase:** 01-core-canvas
**Areas discussed:** Fork Strategy, Excalidraw Version, Monorepo Structure, Drawing Toolset, Element Management UI, Undo/Redo, Persistence Design, AIElement Design, Performance Strategy, Chunk Configuration, Project Model
**Mode:** Auto-discussed (--auto)

---

## Fork Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Vendored source copy (`packages/excalidraw/`) | Full control, modify directly, FORK_CHANGES.md from day one | ✓ |
| NPM package + wrapper patches | Less control, harder to add custom element types | |

**Claude's choice:** Vendored source copy
**Rationale:** Architecture requires full control for AIElement type additions. Wrapper pattern would require deep monkey-patching of Excalidraw's element registry. FORK_CHANGES.md discipline is non-negotiable per research (Pitfall 1: Fork Drift).

---

## Excalidraw Version

| Option | Description | Selected |
|--------|-------------|----------|
| Latest v0.18.x stable with React 19 support | Verified via PR #9182, minimizes divergence | ✓ |
| Specific pinned old version | Known behavior but more to upgrade later | |

**Claude's choice:** Latest v0.18.x release tag supporting React 19
**Rationale:** Minimizes initial divergence from upstream. React 19 compatibility verified.

---

## Monorepo Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal for Phase 1: packages/canvas/, packages/shared/, apps/web/ | Only what this phase needs | ✓ |
| Full structure from day one | All packages created empty | |

**Claude's choice:** Minimal for Phase 1
**Rationale:** Avoid premature package scaffolding. Add packages as each phase introduces them.

---

## Drawing Tool Set

| Option | Description | Selected |
|--------|-------------|----------|
| Full Excalidraw built-in tools | Rectangle, ellipse, arrow, line, freehand, text, image, eraser | ✓ |
| Custom port of tools | Rebuild from scratch | |

**Claude's choice:** Full Excalidraw built-in tools
**Rationale:** Removing tools is extra work with zero benefit. Users expect basic drawing from a canvas tool.

---

## Element Management UI

| Option | Description | Selected |
|--------|-------------|----------|
| Hybrid: sidebar layer panel + context menu | Sidebar for visual layer ops, context menu for quick actions | ✓ |
| Excalidraw native context menu only | No custom layer panel | |
| Custom layer panel only | Replace all Excalidraw menus | |

**Claude's choice:** Hybrid: sidebar layer panel + context menu
**Rationale:** Sidebar panel enables visual drag-to-reorder and batch operations (CANVAS-03 requirement). Context menu preserves familiar Excalidraw UX.

---

## Undo/Redo Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Custom unified HistoryStore | Shared stack for canvas + future node graph. 180ms merge, 50 snapshots | ✓ |
| Zustand temporal middleware (zundo) | Less control over merge logic | |
| Excalidraw's built-in undo | Can't extend to node graph later | |

**Claude's choice:** Custom unified HistoryStore
**Rationale:** Must future-proof for node graph undo in Phase 2-3. Excalidraw's native undo is canvas-only. Research confirms unified stack + 180ms merge window + drag-pause pattern.

---

## Persistence Design

| Option | Description | Selected |
|--------|-------------|----------|
| Dexie.js single-table + auto-save (debounced) + explicit save | MVP simplicity | ✓ |
| Normalized multi-table | Premature optimization for MVP | |

**Claude's choice:** Single-table, auto-save + explicit save
**Rationale:** MVP scope. One `projects` table with JSON blob for canvas state. Normalize when multi-project features or server sync demand it.

---

## AIElement Design

| Option | Description | Selected |
|--------|-------------|----------|
| Custom AIElement extending Excalidraw base | Full control, metadata fields, distinct rendering | ✓ |
| Wrap existing Image element | Limited metadata, hacky status handling | |

**Claude's choice:** Custom AIElement
**Rationale:** Need metadata (prompt, provider, status) and distinct rendering behavior (loading state, error state, resolution-tiered rendering). Wrapping Image element would be fragile.

---

## Performance Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Chunk rendering + LRU cache + resolution-tiered rendering | Full performance suite from day one | ✓ |
| Chunk rendering only | Defers LRU and tiered rendering | |

**Claude's choice:** All three
**Rationale:** Research mandates "from day one" for Pitfall 2 (Rendering Performance). 500+ elements at 60fps is a hard success criterion.

---

## Chunk Configuration

| Option | Description | Selected |
|--------|-------------|----------|
| 2000×2000px chunks + LRU cache | Balance of granularity and overhead | ✓ |
| 1000×1000px chunks | More granular but more chunks to manage | |
| Configurable chunk size | Adds complexity without proven need | |

**Claude's choice:** 2000×2000px chunks with LRU cache
**Rationale:** Established in research. Fine balance between culling precision and management overhead.

---

## Project Data Model

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal: Project { id, name, canvasState, viewport, timestamps } | MVP scope, expandable | ✓ |
| Full model with settings, templates, versions | Premature for Phase 1 | |

**Claude's choice:** Minimal model
**Rationale:** Phase 1 only needs canvas storage. Add fields as requirements emerge.

---

## Claude's Discretion

All decisions auto-selected via `--auto` mode using recommended defaults from research documents.

## Deferred Ideas

None — all discussion items remained within Phase 1 scope.
