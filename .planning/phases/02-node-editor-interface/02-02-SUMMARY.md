---
phase: 02
plan: 02
subsystem: node-editor
tags:
  - store
  - zustand
  - immer
  - node-graph
  - serialization
requires:
  - 02-01 (shared node graph types, nodeTypeDefinitions)
provides:
  - useNodeGraphStore
affects:
  - Plan 03 (custom React Flow node components consume the store)
  - Plan 04 (PropertyPanel reads node data via useNodeGraphStore selector)
  - Plan 05 (integration wires Excalidraw <-> React Flow via store)
tech-stack:
  added: []
  patterns:
    - Zustand v5 + Immer middleware store pattern
    - Fine-grained selectors matching CanvasStore convention
    - crypto.randomUUID() for id generation
    - nodeTypeDefinitions-driven default data creation
key-files:
  created:
    - apps/web/src/stores/nodeGraphStore.ts
    - apps/web/src/test/stores/nodeGraphStore.test.ts
  modified:
    - apps/web/src/test/stores/stubs/stores.test.ts
  deleted:
    - apps/web/src/stores/stubs/nodeGraphStore.ts
decisions: []
metrics:
  duration: 2m
  completed_date: "2026-06-30"
  tests_added: 12
  tests_passing: 64 (all)
commit_docs: false
---

# Phase 02 Plan 02: NodeGraphStore Implementation Summary

Zustand + Immer store replacing the stub for node graph state management, with full CRUD operations, serialization/deserialization, and matching CanvasStore conventions.

## What Was Built

### NodeGraphStore (`apps/web/src/stores/nodeGraphStore.ts`)

A Zustand v5 store with Immer middleware providing the complete state management surface for the node editor:

**State:**
- `nodes: NodeGraphNode[]` — array of graph nodes with discriminated union data
- `edges: NodeGraphEdge[]` — array of graph edges with source/target handles
- `selectedNodeId: string | null` — currently selected node
- `focusMode: 'canvas' | 'nodes'` — editor focus toggle

**Node CRUD operations:**
- `addNode(type, position)` — creates a node with auto-generated UUID, fills default data from `nodeTypeDefinitions` params
- `removeNode(id)` — removes node AND all connected edges (cascading cleanup)
- `updateNodeData(id, partial)` — Immer-patches node data fields
- `setNodePosition(id, position)` — updates node position

**Edge operations:**
- `addEdge({ source, target, sourceHandle, targetHandle })` — creates edge with UUID
- `removeEdge(id)` — removes edge by id

**Selection:**
- `selectNode(id | null)` — sets selected node
- `clearSelection()` — resets to null

**Focus mode:**
- `setFocusMode('canvas' | 'nodes')` — toggles focus

**Serialization:**
- `serialize()` — returns `{ nodes, edges }` with deep copies, no transient props
- `loadSerialized(serialized)` — restores full graph state from JSON

### Test Suite (`apps/web/src/test/stores/nodeGraphStore.test.ts`)

12 tests covering all CRUD operations, edge cleanup cascading, serialization round-trip, edge cases (empty graph, non-existent node), and focus mode toggle.

### Cleanup

- Deleted obsolete stub at `apps/web/src/stores/stubs/nodeGraphStore.ts`
- Updated `stores.test.ts` Test 19 to import from the real store instead of the stub

### Deviation: Missing `@asamuzakjp/generational-cache` dependency

During test execution, vitest failed with `ERR_MODULE_NOT_FOUND` for `@asamuzakjp/generational-cache`. This transitive dependency of `jsdom` (via `@asamuzakjp/css-color`) was missing from the pnpm store. Fixed by forcing a reinstall of `jsdom` via `pnpm add -D jsdom` to populate the v1.0.1 store entry.

## Threat Surface Scan

No new threat surface introduced. The store operates entirely in-memory client-side. Serialize/loadSerialized creates defensive copies (not reference leaks). All O(n) operations are acceptable for MVP-scale graphs (<100 nodes).

## Known Stubs

None. The stub file was deleted and replaced with a full implementation.

## Self-Check

- [x] All 12 store tests pass
- [x] No stale imports of `stubs/nodeGraphStore` remain
- [x] Stub file deleted
- [x] Imports use `@ac-canvas/shared` (not local copies)
- [x] Pattern matches CanvasStore: Zustand + Immer, fine-grained selectors, serialization

## Self-Check: PASSED
