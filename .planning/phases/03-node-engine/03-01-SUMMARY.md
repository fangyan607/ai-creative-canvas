---
phase: 03-node-engine
plan: 01
subsystem: types
tags: [typescript, types, node-graph, execution-engine, dag]
requires:
  - phase: 02-node-editor-interface
    provides: NodeGraphNode, NodeType, NodeDataUnion, NodeGraphEdge types
provides:
  - Extended NodeType union with 'group'
  - GroupNodeData interface with name and collapsed fields
  - ExecutionStatus type with 6 states
  - NodeGraphNode.parentId optional field for group membership
  - Engine Executor, ExecutorResolver, ExecutionResult types
  - toExecutionLayers and findAffectedDownstream function signatures
affects: [Plan 03-02 (engine core), Plan 03-03 (UI components), Plan 03-04 (store extensions), Plan 05 (AI executors)]

tech-stack:
  added: []
  patterns:
    - "export declare function for ambient type declarations"
    - "ExecutorResolver as Map<NodeType | 'group', Executor>"

key-files:
  created:
    - apps/web/src/engine/types.ts
  modified:
    - packages/shared/src/types/nodeGraph.ts

key-decisions:
  - "Use export declare function instead of export function for ambient declarations without implementation bodies (TypeScript TS2391 requirement)"

patterns-established:
  - "Function signatures for topological sort and downstream detection are declared in types.ts, to be implemented in NodeEngine.ts"

requirements-completed: [NODE-03, NODE-07]

duration: 5 min
completed: 2026-06-30
---

# Phase 03 Plan 01: Node Graph Type Contracts Summary

**Extended shared node graph type definitions (parentId, GroupNodeData, ExecutionStatus, 'group' NodeType) and created engine core type contracts (Executor, ExecutorResolver, ExecutionResult, topological sort function signatures)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-06-30T08:52:12Z
- **Completed:** 2026-06-30T08:57:31Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Extended `NodeType` union with `'group'` for visual grouping support
- Added `parentId?: string | null` to `NodeGraphNode` for group membership
- Created `GroupNodeData` interface (name, collapsed fields)
- Added `ExecutionStatus` type with all 6 states: idle, queued, executing, done, error, skipped
- Created `apps/web/src/engine/types.ts` with Executor, ExecutorResolver, and ExecutionResult contracts
- Declared `toExecutionLayers` (Kahn's topological sort) and `findAffectedDownstream` (BFS) function signatures
- All 25 existing Phase 2 tests pass (13 nodeGraph types + 12 nodeGraphStore)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend shared node graph types** - `c7a768e` (feat)
2. **Task 2: Create engine type definitions** - `c6ca950` (feat)

## Files Created/Modified

- `packages/shared/src/types/nodeGraph.ts` - Extended with parentId, GroupNodeData, ExecutionStatus, 'group' type
- `apps/web/src/engine/types.ts` - New file with Executor, ExecutorResolver, ExecutionResult, function signatures

## Decisions Made

- Used `export declare function` instead of `export function` for ambient declarations in types.ts (TypeScript requires implementations for `export function`, TS2391)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Use `export declare function` for ambient type declarations**
- **Found during:** Task 2 (Create engine type definitions)
- **Issue:** TypeScript compilation failed with TS2391: "Function implementation is missing or not immediately following the declaration" for `toExecutionLayers` and `findAffectedDownstream`
- **Fix:** Changed `export function` to `export declare function` — the correct TypeScript syntax for type declarations without implementation bodies
- **Files modified:** `apps/web/src/engine/types.ts`
- **Verification:** TypeScript compilation shows zero errors for engine/types.ts
- **Committed in:** c6ca950 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary fix for TypeScript correctness. No scope creep or behavioral changes.

## Issues Encountered

None. All changes compiled cleanly and existing tests passed.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Type contracts established for all Phase 3 downstream plans (02 engine core, 03 UI components, 04 store extensions)
- Plan 03-02 (Engine Core) can start immediately — it implements the function signatures declared here
- Plan 03-03 (UI Components) can consume GroupNodeData and NodeGraphNode.parentId
- Plan 03-04 (Store Extensions) can reference ExecutionStatus and parentId

## Self-Check: PASSED

- [x] All files exist: nodeGraph.ts, engine/types.ts, SUMMARY.md
- [x] Commits verified: c7a768e (Task 1), c6ca950 (Task 2)
- [x] All 25 existing Phase 2 tests pass (13 nodeGraph types + 12 nodeGraphStore)
- [x] NodeType includes 'group', NodeGraphNode has parentId, GroupNodeData exported, ExecutionStatus with 6 states
- [x] engine/types.ts compiles cleanly with all required exports
- [x] Backward compatible — parentId is optional, union extensions are additive

---
*Phase: 03-node-engine*
*Completed: 2026-06-30*
