---
phase: 03-node-engine
plan: 02
subsystem: engine
tags: [typescript, dag, topological-sort, kahn, bfs, execution-engine, zustand]
requires:
  - phase: 03-01
    provides: Executor, ExecutorResolver, ExecutionResult types, ExecutionStatus, NodeType, NodeGraphNode, NodeGraphEdge
provides:
  - toExecutionLayers pure function (Kahn's algorithm with parallel layers)
  - findAffectedDownstream pure function (BFS dirty-path propagation)
  - NodeEngine class with execute, markDirty, setResolvers, getNodeStatus
  - Default stub resolvers for 5 node types (prompt, text-to-image, style, merge, preview)
  - EngineStore (Zustand+Immer) for transient execution state
affects: [Plan 03-03 (UI components), Plan 03-04 (store extensions), Plan 05 (AI executors)]

tech-stack:
  added: []
  patterns:
    - "Kahn's algorithm for topological sort with parallel layer grouping"
    - "BFS dirty-path marking using adjacency list traversal"
    - "fail-stop error propagation (D-04: downstream skip on error)"
    - "Node executor resolver pattern (Map<NodeType, Executor>)"
    - "EngineStore Zustand+Immer store following canvasStore pattern"

key-files:
  created:
    - apps/web/src/engine/NodeEngine.ts
    - apps/web/src/engine/resolvers.ts
    - apps/web/src/engine/__tests__/NodeEngine.test.ts
    - apps/web/src/stores/engineStore.ts
  modified: []

key-decisions:
  - "TypeScript type cast (as unknown as Record<string, unknown>) needed when passing NodeDataUnion to executor — NodeDataUnion lacks index signature"

patterns-established:
  - "Pure functions (toExecutionLayers, findAffectedDownstream) + class wrapping lifecycle"
  - "Stub executors for Phase 3, async-ready for Phase 5"
  - "Engine state (nodeStatus, nodeErrors) in separate store from graph topology (D-09)"

requirements-completed: [NODE-03]

duration: 5 min
completed: 2026-06-30
---

# Phase 03 Plan 02: Core DAG Execution Engine Summary

**Kahn's algorithm topological sort with parallel layers, BFS dirty-path propagation, fail-stop error handling, 5 stub node executors, and Zustand EngineStore for execution state management**

## Performance

- **Duration:** 5 min
- **Started:** 2026-06-30T09:01:00Z
- **Completed:** 2026-06-30T09:06:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Implemented `toExecutionLayers` using Kahn's algorithm, grouping nodes into parallel execution layers with cycle detection
- Implemented `findAffectedDownstream` using BFS traversal for dirty-path incremental execution (D-05)
- Created `NodeEngine` class wrapping pure functions with:
  - `execute()` -- topological sort, layer-by-layer execution, fail-stop error propagation (D-04)
  - `markDirty()` -- marks changed node and all downstream as dirty (idle)
  - `setResolvers()` / `getNodeStatus()` -- executor management and status queries
- Created `EngineStore` (Zustand+Immer) with:
  - State fields: `nodeStatus`, `nodeErrors`, `lastExecutedAt`, `isExecuting`
  - Actions: `setNodeStatus`, `setNodeError`, `clearNodeError`, `setExecuting`, `markAllDirty`, `clearAll`
  - Serialization: `serialize()` / `loadSerialized()` for HistoryStore integration (D-10)
- Created default stub executors for all 5 workflow node types (group nodes intentionally pass through)
- 15 comprehensive unit tests covering: linear sort, branched sort, cycle detection, diamond graph, single node, disconnected subgraphs, immediate downstream, transitive downstream, leaf node, error propagation, dirty marking, full graph execution

## Task Commits

Each task was committed atomically:

1. **Task 1a (TDD RED): Engine core test suite** - `4944438` (test)
2. **Task 1b (TDD GREEN): Engine core algorithms** - `c34f800` (feat)
3. **Task 2: EngineStore (Zustand)** - `bf11b7f` (feat)
4. **Task 3: Stub resolvers** - `5d35f16` (feat)

*Note: Task 1 used TDD flow (RED test commit, GREEN production commit).*

## Files Created

- `apps/web/src/engine/NodeEngine.ts` - Core DAG engine: toExecutionLayers, findAffectedDownstream, NodeEngine class (273 lines)
- `apps/web/src/engine/__tests__/NodeEngine.test.ts` - 15 unit tests covering topology sort, BFS, error propagation, lifecycle (153 lines)
- `apps/web/src/engine/resolvers.ts` - Default stub executors for 5 node types (68 lines)
- `apps/web/src/stores/engineStore.ts` - Zustand+Immer engine state store with serialization (117 lines)

## Decisions Made

- Used `node.data as unknown as Record<string, unknown>` in executor call because `NodeDataUnion` lacks a string index signature, making it incompatible with the `Executor` type's `Record<string, unknown>` parameter
- Engine status tracking uses internal `Map<string, string>` in `NodeEngine` class (not EngineStore directly) for performance during execution cycles -- EngineStore is the persistent/observable layer
- All 5 node types (prompt, text-to-image, style, merge, preview) get stub executors; group nodes have none (engine skips them during layer execution)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] TypeScript type mismatch between NodeDataUnion and Executor input type**
- **Found during:** Task 2 (EngineStore)
- **Issue:** `TypeScript error TS2345: Argument of type 'NodeDataUnion' is not assignable to parameter of type 'Record<string, unknown>'` when calling `executor(node.data, inputs)` in `NodeEngine.execute()`. The `Executor` type expects `Record<string, unknown>`, but `NodeDataUnion` (a discriminated union of typed interfaces) lacks a string index signature.
- **Fix:** Added `as unknown as Record<string, unknown>` cast at the executor call site. This is safe because Phase 3 stub executors access fields via `(nodeData as any).fieldName` pattern, and Phase 5 real executors will use the same pattern or add their own validation.
- **Files modified:** `apps/web/src/engine/NodeEngine.ts` (line 215)
- **Verification:** `npx tsc --noEmit --project apps/web/tsconfig.json` shows zero errors for engine files
- **Committed in:** bf11b7f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary fix for TypeScript correctness. No scope creep or behavioral changes.

## Issues Encountered

None. All changes compiled cleanly, all 75 tests pass (60 existing + 15 new engine tests).

## User Setup Required

None -- no external service configuration required.

## Next Phase Readiness

- Core DAG engine complete with topological sort, dirty-path BFS, fail-stop error handling
- EngineStore ready for Plan 03-04 (HistoryStore integration) -- `serialize()`/`loadSerialized()` interface is the contract
- Stub resolvers ready for Plan 03-03 (UI components) -- resolver wiring will be in auto-execution hook
- Plan 03-03 (UI Components) can start: NodeStatusIndicator and auto-execution trigger
- Plan 03-04 (Store Extensions) can start: extend HistoryStore snapshots with engine state
- Phase 5 (AI executors) will replace stub resolvers with real implementations

## Self-Check: PASSED

- [x] `apps/web/src/engine/NodeEngine.ts` exists with all 3 exports
- [x] `apps/web/src/engine/resolvers.ts` exists with createDefaultResolvers and 5 executors
- [x] `apps/web/src/engine/__tests__/NodeEngine.test.ts` exists with 15 test cases
- [x] `apps/web/src/stores/engineStore.ts` exists with all exports
- [x] Commits verified: 4944438 (Task 1 RED), c34f800 (Task 1 GREEN), bf11b7f (Task 2), 5d35f16 (Task 3)
- [x] All 15 engine tests pass
- [x] All 75 tests pass (9 test files, zero failures)
- [x] TypeScript compilation clean for engine files
- [x] EngineStore has useEngineStore, immer, serialize, loadSerialized, markAllDirty
- [x] All 6 executor types accounted for (5 registered + 1 group intentionally omitted)

---
*Phase: 03-node-engine*
*Completed: 2026-06-30*
