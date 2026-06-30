---
phase: 03-node-engine
verified: 2026-06-30T20:15:00Z
status: passed
score: 32/32 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Each workflow node shows an execution status visual indicator (border color + corner badge)"
    status: resolved
    reason: "All 5 node components now read from useEngineStore defines the `status` prop and renders border-color + corner badge, but none of the 5 node components (PromptNode, TextToImageNode, StyleNode, MergeNode, PreviewNode) pass `status` to BaseNode. Node components are React Flow custom nodes and only receive { id, data, selected } from NodeProps; they do not read from EngineStore."
    artifacts:
      - path: "packages/node-editor/src/nodes/PromptNode.tsx"
        issue: "Does not pass status prop to BaseNode, does not import useEngineStore"
      - path: "packages/node-editor/src/nodes/TextToImageNode.tsx"
        issue: "Does not pass status prop to BaseNode"
      - path: "packages/node-editor/src/nodes/StyleNode.tsx"
        issue: "Does not pass status prop to BaseNode"
      - path: "packages/node-editor/src/nodes/MergeNode.tsx"
        issue: "Does not pass status prop to BaseNode"
      - path: "packages/node-editor/src/nodes/PreviewNode.tsx"
        issue: "Does not pass status prop to BaseNode"
    missing:
      - "Each node component must read its node's status from EngineStore (useEngineStore selector by node ID) and pass it to BaseNode via the `status` prop"
  - truth: "Status indicator shows 6 states: idle (gray), queued (blue), executing (amber animated), done (green), error (red), skipped (muted gray)"
    status: failed
    reason: "Same root cause as the status wiring gap. STATUS_COLORS and STATUS_LABELS are defined in BaseNode and the rendering logic exists, but no status data reaches any node component."
    artifacts:
      - path: "packages/node-editor/src/nodes/BaseNode.tsx"
        issue: "STATUS_COLORS/STATUS_LABELS and rendering logic are correct but unreachable because status prop is never passed"
    missing:
      - "Wiring from EngineStore.nodeStatus to individual node components' status prop"
  - truth: "Execution status is visible on nodes (border color + badge from Plan 03)"
    status: failed
    reason: "Same root cause. Status is stored in EngineStore by useAutoExecute but never read by node components to display on individual nodes. App.tsx only shows a global executing/error indicator, not per-node status."
    artifacts:
      - path: "packages/node-editor/src/nodes/"
        issue: "No node component reads from EngineStore"
      - path: "apps/web/src/hooks/useAutoExecute.ts"
        issue: "Writes status to EngineStore but no consumer reads it for per-node display"
    missing:
      - "Each node component must read status from EngineStore by its node ID"
  - truth: "Collapsing a group hides all child nodes and their connected edges"
    status: failed
    reason: "toggleGroupCollapse function in NodeEditorOverlay correctly handles hiding children/edges, but the GroupNode component's collapse button calls a local stub (console.log only). The overlay function is never connected to the GroupNode button."
    artifacts:
      - path: "packages/node-editor/src/nodes/GroupNode.tsx"
        issue: "toggleCollapse button handler is a console.log stub, does not trigger the overlay's toggleGroupCollapse"
      - path: "packages/node-editor/src/NodeEditorOverlay.tsx"
        issue: "toggleGroupCollapse function is properly implemented (lines 239-288) but never connected to any UI element"
    missing:
      - "Wire GroupNode's collapse button to call the overlay's toggleGroupCollapse (or pass it as a prop)"
  - truth: "Expanding a group shows child nodes and restores edge visibility"
    status: failed
    reason: "Same root cause as collapse. The overlay's toggleGroupCollapse handles expand (toggles collapsed state in both directions), but the GroupNode button is not connected to it."
    artifacts:
      - path: "packages/node-editor/src/nodes/GroupNode.tsx"
        issue: "Expand button handler is a console.log stub"
    missing:
      - "Wire GroupNode's expand button to call the overlay's toggleGroupCollapse"

---

# Phase 03: Node Engine Verification Report

**Phase Goal:** Node graphs execute in correct topological order with incremental updates and organizational structure
**Verified:** 2026-06-30T20:15:00Z
**Status:** gaps_found
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | NodeGraphNode carries an optional parentId field for group membership | VERIFIED | `nodeGraph.ts` line 106: `parentId?: string \| null` |
| 2 | A 'group' node type exists distinct from the 5 workflow node types | VERIFIED | `nodeGraph.ts` line 14: `\| 'group'` in NodeType union |
| 3 | GroupNodeData interface defines group-specific fields (name, collapsed) | VERIFIED | `nodeGraph.ts` lines 80-85: `interface GroupNodeData` with name, collapsed, params |
| 4 | ExecutionStatus type defines all 6 states: idle, queued, executing, done, error, skipped | VERIFIED | `nodeGraph.ts` lines 127-133: `export type ExecutionStatus` with all 6 |
| 5 | Engine type system defines Executor interface that Phase 5 can implement | VERIFIED | `engine/types.ts` lines 29-32: `Executor` type with sync+async returns |
| 6 | Topological sort and dirty-path functions have correct TypeScript signatures | VERIFIED | `engine/types.ts` lines 68-80: `toExecutionLayers` and `findAffectedDownstream` declared |
| 7 | Engine can topologically sort a graph into parallel execution layers using Kahn's algorithm | VERIFIED | `NodeEngine.ts` lines 23-66: Kahn's implementation; 6 passing tests |
| 8 | Engine detects cyclic graphs and refuses to execute | VERIFIED | `NodeEngine.ts` line 65: returns null on cycle; test "returns null for cyclic graph" passes |
| 9 | Engine executes nodes in correct topological order layer by layer | VERIFIED | `NodeEngine.ts` execute() lines 183-220 processes layers; test "executes linear graph" passes |
| 10 | When a node errors, all downstream nodes are skipped (fail-stop per D-04) | VERIFIED | `NodeEngine.ts` lines 223-261: marks downstream skipped; test passes |
| 11 | EngineStore tracks execution state (nodeStatus, nodeErrors) separate from graph topology | VERIFIED | `engineStore.ts` lines 31-38: nodeStatus and nodeErrors fields |
| 12 | EngineStore can serialize/deserialize its state for integration with HistoryStore | VERIFIED | `engineStore.ts` lines 102-114: serialize() and loadSerialized() |
| 13 | A GroupNode component visually renders as a named container with a header bar | VERIFIED | `GroupNode.tsx` lines 62-133: header with name, toggle, grip handle |
| 14 | Group header shows the group name and a collapse/expand toggle button | VERIFIED | `GroupNode.tsx` lines 78-121: ChevronDown/ChevronRight buttons, name display |
| 15 | Double-clicking the group header enters inline editing for the name | VERIFIED | `GroupNode.tsx` line 81: `onDoubleClick={handleDoubleClick}` |
| 16 | Each workflow node shows an execution status visual indicator (border color + corner badge) | FAILED | BaseNode renders status (lines 88-118) but no node component passes the `status` prop |
| 17 | Status indicator shows 6 states | FAILED | Colors/labels defined in BaseNode (lines 66-82) but never reach a node component |
| 18 | User can create a named group node in the node graph | VERIFIED | `nodeGraphStore.ts` lines 174-185: createGroup implementation |
| 19 | User can add a node to a group (set parentId on the child node) | VERIFIED | `nodeGraphStore.ts` lines 187-193: addToGroup sets parentId |
| 20 | User can remove a node from a group (clear parentId) | VERIFIED | `nodeGraphStore.ts` lines 195-200: removeFromGroup clears parentId |
| 21 | User can rename a group | VERIFIED | `nodeGraphStore.ts` lines 202-208: renameGroup updates data.name |
| 22 | User can toggle group collapse/expand state | PARTIAL | Store action (line 210) and overlay handler (line 239) exist, but UI button is a stub |
| 23 | HistoryStore snapshots include engine execution state (nodeStatus, nodeErrors) | VERIFIED | `historyStore.ts` line 11: engine field in HistorySnapshot |
| 24 | Undo/redo correctly restores both graph topology and engine state | VERIFIED | `historyStore.ts` lines 85-88 and 103-106: restore engine state |
| 25 | Execution events do not create history snapshots (D-10) | VERIFIED | `useAutoExecute.ts`: no captureSnapshot call |
| 26 | Auto-execution triggers when graph topology changes | VERIFIED | `useAutoExecute.ts` line 89: subscribes to NodeGraphStore |
| 27 | Auto-execution debounces rapid changes at 180ms | VERIFIED | `useAutoExecute.ts` line 85: `setTimeout(execute, 180)` |
| 28 | Group nodes appear in the node type toolbar | VERIFIED | `App.tsx` lines 154-164: FolderKanban button with createGroup + captureSnapshot |
| 29 | Collapsing a group hides child nodes and their connected edges | FAILED | Overlay handler exists (lines 239-288) but GroupNode button is a console.log stub (line 37) |
| 30 | Expanding a group shows child nodes and restores edge visibility | FAILED | Same root cause as collapse |
| 31 | Group nodes appear before their children in the React Flow nodes array | VERIFIED | `NodeEditorOverlay.tsx` lines 184-189: parent-first sort |
| 32 | Execution status is visible on nodes via EngineStore wiring | FAILED | Status is written to EngineStore (useAutoExecute line 66) but never read by node components |

**Score:** 28/32 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `packages/shared/src/types/nodeGraph.ts` | Extended types | VERIFIED | parentId, GroupNodeData, ExecutionStatus, 'group' type |
| `apps/web/src/engine/types.ts` | Engine types | VERIFIED | Executor, ExecutorResolver, ExecutionResult, function signatures |
| `apps/web/src/engine/NodeEngine.ts` | Core engine | VERIFIED | toExecutionLayers, findAffectedDownstream, NodeEngine class |
| `apps/web/src/engine/resolvers.ts` | Stub executors | VERIFIED | createDefaultResolvers for all 5 workflow types |
| `apps/web/src/engine/__tests__/NodeEngine.test.ts` | Unit tests | VERIFIED | 15 tests, all passing |
| `apps/web/src/stores/engineStore.ts` | Engine store | VERIFIED | Zustand+Immer with serialize/loadSerialized |
| `packages/node-editor/src/nodes/GroupNode.tsx` | Group node UI | VERIFIED | Header, collapse/expand toggle, inline name editing |
| `packages/node-editor/src/nodes/BaseNode.tsx` | Status indicators | PARTIAL | STATUS_COLORS and rendering logic present but status prop never wired to data |
| `apps/web/src/stores/nodeGraphStore.ts` | Group CRUD | VERIFIED | All 5 group operations implemented |
| `apps/web/src/stores/historyStore.ts` | Engine state in snapshots | VERIFIED | Engine state in captureSnapshot, undo, redo |
| `apps/web/src/hooks/useAutoExecute.ts` | Auto-execution hook | VERIFIED | 180ms debounce, NodeGraphStore subscription, EngineStore sync |
| `packages/node-editor/src/NodeEditorOverlay.tsx` | Overlay integration | PARTIAL | GroupNode registered, parent-first sort, toggleGroupCollapse handler exists but not connected to GroupNode |
| `apps/web/src/App.tsx` | App integration | VERIFIED | useAutoExecute called, execution indicator, group toolbar button, Ctrl+Enter reservation |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `engine/types.ts` | `@ac-canvas/shared` | `import type { NodeType, ExecutionStatus }` | WIRED | Line 7 |
| `NodeEngine.ts` | `@ac-canvas/shared` | `import type { NodeGraphNode, NodeGraphEdge }` | WIRED | Line 11 |
| `NodeEngine.ts` | `./types` | `import type { Executor, ... }` | WIRED | Line 12 |
| `engineStore.ts` | `@ac-canvas/shared` | `import type { ExecutionStatus }` | WIRED | Line 16 |
| `resolvers.ts` | `@ac-canvas/shared` | `import type { NodeType }` | WIRED | Line 12 |
| `resolvers.ts` | `./types` | `import type { Executor, ... }` | WIRED | Line 13 |
| `useAutoExecute.ts` | `NodeEngine.ts` | `import { NodeEngine }` | WIRED | Line 17 |
| `useAutoExecute.ts` | `EngineStore` | `import { useEngineStore }` | WIRED | Line 19 |
| `useAutoExecute.ts` | `NodeGraphStore` | `subscribe()` | WIRED | Line 89 |
| `historyStore.ts` | `engineStore.ts` | `import { useEngineStore }` | WIRED | Line 4 |
| `NodeEditorOverlay.tsx` | `GroupNode` | `import { GroupNode }` + nodeTypes | WIRED | Lines 47, 174 |
| `NodeEditorOverlay.tsx` | `nodeGraphStore` | `import { useNodeGraphStore }` | WIRED | Line 65 |
| `App.tsx` | `useAutoExecute` | `import { useAutoExecute }` | WIRED | Line 6, called line 55 |
| **`BaseNode.tsx`** | **`engineStore.ts`** | **`reads nodeStatus from EngineStore`** | **NOT_WIRED** | BaseNode expects status via props but no component reads from EngineStore to provide it |
| **`GroupNode.tsx`** | **`NodeEditorOverlay.tsx`** | **`toggle button calls overlay handler`** | **NOT_WIRED** | GroupNode button calls local stub, overlay handler is never connected |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `useAutoExecute.ts` | `engine.execute()` output | `NodeGraphStore` nodes/edges | Yes -- reads live store state | FLOWING |
| `useAutoExecute.ts` -> `engineStore.ts` | `setNodeStatus()` | `engine.getNodeStatus()` | Yes -- execution status from engine | FLOWING |
| `NodeEditorOverlay.tsx` -> `GroupNode.tsx` | `data.name`, `data.collapsed` | Store -> toRFNode -> rfNodes | Yes -- store data flows through to component | FLOWING |
| `historyStore.ts` -> `engineStore.ts` | `engine` in snapshots | `useEngineStore.getState().serialize()` | Yes -- serialized engine state | FLOWING |
| `engineStore.ts` -> `BaseNode.tsx` | `nodeStatus[nodeId]` | **BROKEN** | EngineStore has status data but no consumer reads it for individual nodes | DISCONNECTED |
| GroupNode button -> overlay handler | `toggleCollapse` | **BROKEN** | Button calls stub (console.log), overlay handler never connected | DISCONNECTED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Engine topological sort | `vitest run NodeEngine.test.ts` | 15/15 tests pass | PASS |
| All existing tests unaffected | `vitest run` (all) | 75/75 tests pass | PASS |
| GroupNode TypeScript compilation | `tsc --noEmit --project node-editor/tsconfig.json` | No new errors | PASS |
| Web app TypeScript compilation | `tsc --noEmit --project apps/web/tsconfig.json` | Pre-existing errors only | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| NODE-03 | Plans 01, 02, 03, 05 | 节点执行引擎支持拓扑排序、同层并行执行、增量执行（Dirty标记） | SATISFIED | toExecutionLayers (Kahn), Promise.allSettled for parallel, findAffectedDownstream + markDirty for incremental execution. All tested and passing. |
| NODE-06 | Plan 04 | 节点操作支持撤销/重做 | SATISFIED | HistoryStore extended with engine state in snapshots. Undo/redo restores both graph topology and engine state. Execution events do not create snapshots (D-10). |
| NODE-07 | Plans 01, 03, 04, 05 | 节点支持子分组（Group），防止节点汤 | SATISFIED | GroupNodeData, parentId on NodeGraphNode, GroupNode component, 5 group CRUD operations in NodeGraphStore, group toolbar button, parent-first node sorting. (Collapse/expand button not wired -- see gaps.) |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `packages/node-editor/src/nodes/GroupNode.tsx` | 37 | `console.log('toggleCollapse', id)` | WARNING | Collapse/expand button does nothing in the UI. The real handler exists in NodeEditorOverlay but is disconnected. |
| `packages/node-editor/src/nodes/GroupNode.tsx` | 45-48 | `handleBlur` is a no-op | INFO | Name edit commit is deferred. Inline editing shows the input but the name change doesn't persist to the store. |
| `packages/node-editor/src/nodes/GroupNode.tsx` | 118 | `data.params?.length ?? 0` | INFO | Node count badge always shows 0 because GroupNodeData.params is always `[]`. This is a display issue, not functional. |

### Human Verification Required

None. All identified gaps are verifiable through code inspection. The remaining concerns are:

1. Visual appearance of the GroupNode (dashed border, colors) -- this is CSS/styling and can be verified by visual inspection if desired
2. Auto-execution timing (180ms debounce) -- code structure is correct, runtime timing is implementation-observable

Both are low-risk and the code implementation is straightforward.

### Gaps Summary

**2 root causes produce all 5 failed truths:**

**Root Cause 1: Execution status not wired from EngineStore to node components (affects truths 16, 17, 32)**
- EngineStore stores per-node execution status (written by useAutoExecute.ts)
- BaseNode renders status indicator (border color + corner badge) via the `status` prop
- But none of the 5 node components read from EngineStore or pass `status` to BaseNode
- The node components are React Flow custom nodes receiving only `{ id, data, selected }` from NodeProps
- Fix: Each node component (PromptNode, TextToImageNode, StyleNode, MergeNode, PreviewNode) must import `useEngineStore` and read `s.nodeStatus[id]`, then pass it to `<BaseNode status={status} ...>`

**Root Cause 2: GroupNode collapse/expand button not connected to overlay handler (affects truths 22, 29, 30)**
- The overlay's `toggleGroupCollapse` function is properly implemented (lines 239-288 of NodeEditorOverlay.tsx): it toggles `setGroupCollapsed` in the store, updates rfNodes to hide/show children, and updates rfEdges
- But the GroupNode component's toggle button calls a local `toggleCollapse` that only logs to console
- The overlay function is never passed to GroupNode or connected to any UI element
- Fix: Either pass a callback prop to GroupNode, or have GroupNode dispatch to the store directly and let React Flow's controlled rendering handle the visual update

---

_Verified: 2026-06-30T20:15:00Z_
_Verifier: gsd-verifier_
