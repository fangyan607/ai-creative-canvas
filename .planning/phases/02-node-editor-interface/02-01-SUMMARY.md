---
phase: 02-node-editor-interface
plan: 01
subsystem: shared-contracts
tags: [node-graph, typescript-types, coordinate-transforms, excalidraw, chinese-branding]

# Dependency graph
requires:
  - phase: 01-core-canvas
    provides: monorepo skeleton, packages/shared/, vendored Excalidraw fork, README with 泱泱画布 brand
provides:
  - Node graph type definitions (5 node types, sockets, params, graph structure)
  - Coordinate transform utilities (canvasToNodeSpace / nodeToCanvasSpace)
  - Chinese branding update (AI无限创意画布, 项目简介 section)
  - Excalidraw upstream sync check documented
affects:
  - 02-02 (NodeGraphStore - imports NodeGraphNode, NodeGraphEdge, NodeGraphSerialized)
  - 02-03 (Custom nodes - imports nodeTypeDefinitions, SocketDef)
  - 02-04 (PropertyPanel - imports nodeTypeDefinitions, NodeParamDefinition)
  - 02-05 (Integration - imports coordinate transforms)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Discriminated union pattern for node data types (nodeType field for type narrowing)
    - Socket handleId convention (input-N, output-N) for React Flow compatibility
    - Identity transform pattern for coordinate space equivalence

key-files:
  created:
    - packages/shared/src/types/nodeGraph.ts
    - apps/web/src/test/shared/nodeGraphTypes.test.ts
  modified:
    - README.md
    - packages/shared/src/index.ts
    - packages/shared/src/utils/coordinate.ts
    - packages/excalidraw/FORK_CHANGES.md

key-decisions:
  - "Coordinate transforms are identity transforms: Excalidraw canvas space and React Flow node space share the same absolute coordinate system. Viewport parameter accepted for forward compatibility (Pitfall 12)."
  - "Socket handleId convention: input-0, input-1, output-0 for React Flow handle matching"
  - "nodeTypeDefinitions constant array provides runtime metadata consumed by downstream plans (node components, PropertyPanel)"

patterns-established:
  - "Discriminated union on nodeType: all 5 node data types use nodeType field for TypeScript narrowing"
  - "Socket handleId convention: input-N for inputs, output-N for outputs"

requirements-completed: [NODE-01, NODE-02]

# Metrics
duration: 8min
completed: 2026-06-30
---

# Phase 2 Plan 1: Shared Contracts Summary

**Node graph type definitions (5 core types with discriminated unions), Chinese branding with AI无限创意画布, coordinate transform utilities, and Excalidraw upstream sync check**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-30T02:08:00Z
- **Completed:** 2026-06-30T02:15:36Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- README.md updated with Chinese branding section: `## 项目简介` with "AI无限创意画布" name, tech stack table, and project status
- FORK_CHANGES.md updated with 2026-06-30 sync check: v0.19.0 not yet released, sync deferred per D-02
- Created `packages/shared/src/types/nodeGraph.ts` with complete type definitions for all 5 node types, sockets, params, graph structure, and the `nodeTypeDefinitions` metadata constant
- Updated `packages/shared/src/index.ts` to re-export nodeGraph types for downstream consumers
- Implemented `canvasToNodeSpace` and `nodeToCanvasSpace` coordinate transforms with zoom > 0 validation
- Added test suite (13 tests, all passing)

## Task Commits

Each task was committed atomically:

1. **Task 1: Chinese branding and Excalidraw sync check** - `86fb9f0` (docs)
2. **Task 2: Node graph types (TDD)** - `1d20d2e` (feat) - RED/GREEN combined in single commit (tests + implementation)
3. **Task 3: Coordinate transforms** - `c5a21d4` (feat)

## Files Created/Modified

- `README.md` - Added `## 项目简介` Chinese branding section with "AI无限创意画布" name, tech stack, status
- `packages/excalidraw/FORK_CHANGES.md` - Added 2026-06-30 sync check entry (Pending status, v0.19.0 not yet released)
- `packages/shared/src/types/nodeGraph.ts` - Type definitions: NodeType, SocketSide, SocketDef, NodeParamDefinition, 5 node data types (discriminated union), NodeGraphNode, NodeGraphEdge, NodeGraphSerialized, NodeDataUnion, nodeTypeDefinitions constant
- `packages/shared/src/index.ts` - Added `export * from './types/nodeGraph'`
- `packages/shared/src/utils/coordinate.ts` - Implemented canvasToNodeSpace and nodeToCanvasSpace (identity transforms with zoom validation)
- `apps/web/src/test/shared/nodeGraphTypes.test.ts` - 13 tests covering all type definitions and nodeTypeDefinitions

## Decisions Made

- **Coordinate identity transform**: Both Excalidraw canvas space and React Flow node space use absolute coordinates. The identity transform is correct. Viewport parameter accepted for validation and forward compatibility (Pitfall 12).
- **Socket handleId convention**: `input-N` / `output-N` format compatible with React Flow's handle system. This contract must be maintained by Plan 03's custom node components.
- **MergeNode has 2 inputs**: Exactly 2 input sockets ("Image A", "Image B") per the plan's socket definitions.
- **PreviewNode is terminal**: No output sockets, making it a sink node in the DAG.
- **Discriminated union**: All node data types use `nodeType` field for TypeScript narrowability, enabling type-safe access to per-type data in downstream stores and components.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **TypeScript compilation**: Running `tsc --noEmit` from `apps/web/` produces errors, but all pre-existing in the vendored Excalidraw fork (`packages/excalidraw/`). No errors in any files created or modified by this plan. Verified independently via grep.
- **Vitest execution**: The git worktree does not have access to `node_modules/` from the main repo (pnpm hoisted layout). Tests were run from the main repo directory using absolute paths to the vitest binary.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02-02 (NodeGraphStore) can import types `NodeGraphNode`, `NodeGraphEdge`, `NodeGraphSerialized` from `@ac-canvas/shared`
- Plan 02-03 (Custom nodes) can use `nodeTypeDefinitions` for node metadata and `SocketDef` for handle definitions
- Plan 02-04 (PropertyPanel) uses `NodeParamDefinition` from `nodeTypeDefinitions` for dynamic parameter rendering
- Plan 02-05 (Integration) imports `canvasToNodeSpace` / `nodeToCanvasSpace` from `@ac-canvas/shared/utils/coordinate`

---
*Phase: 02-node-editor-interface*
*Completed: 2026-06-30*
