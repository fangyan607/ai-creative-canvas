---
phase: 03-node-engine
reviewed: 2026-06-30T18:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - apps/web/src/App.css
  - apps/web/src/App.tsx
  - apps/web/src/components/LayerPanel.tsx
  - apps/web/src/engine/NodeEngine.ts
  - apps/web/src/engine/__tests__/NodeEngine.test.ts
  - apps/web/src/engine/resolvers.ts
  - apps/web/src/engine/types.ts
  - apps/web/src/hooks/useAutoExecute.ts
  - apps/web/src/stores/engineStore.ts
  - apps/web/src/stores/historyStore.ts
  - apps/web/src/stores/nodeGraphStore.ts
  - apps/web/vite.config.ts
  - package.json
  - packages/excalidraw/package.json
  - packages/excalidraw/src/locales/en.json
  - packages/node-editor/src/FocusModeToggle.tsx
  - packages/node-editor/src/NodeEditorOverlay.tsx
  - packages/node-editor/src/nodes/BaseNode.tsx
  - packages/node-editor/src/nodes/GroupNode.tsx
  - packages/shared/src/types/nodeGraph.ts
findings:
  critical: 0
  warning: 5
  info: 5
  total: 10
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-06-30T18:00:00Z
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Reviewed 20 source files spanning the node engine, stores, hooks, React components, and shared types. The codebase is well-structured with clear comments and consistent patterns (Immer middleware, Zustand fine-grained selectors, D-spec references). No critical security vulnerabilities or data-loss risks were found.

However, there is one significant logic bug: the auto-execute hook (`useAutoExecute`) only triggers execution once because the `NodeEngine` instance persists node status (`done`) across calls, causing all subsequent graph changes to be no-ops. Additionally, the history store's merge path skips `structuredClone`, risking snapshot corruption on undo/redo. Several type-safety bypasses and a non-functional group collapse toggle round out the findings.

## Warnings

### WR-01: Auto-execute is one-shot -- subsequent graph changes silently ignored

**File:** `apps/web/src/hooks/useAutoExecute.ts:43-79`
**Issue:** The `NodeEngine` instance persists across calls (stored in `engineRef`). After the first execution, all node statuses are set to `'done'`. On every subsequent call, `engine.execute()` skips all nodes because its filter (NodeEngine.ts line 185-188) only picks nodes with status `'queued'`, `'idle'`, or `undefined` -- `'done'` nodes are excluded. This means parameter edits, node additions, or edge changes never trigger re-execution after the initial graph load.

**Tracing the execution path:**
1. `useAutoExecute` subscribes to `useNodeGraphStore` changes (line 89)
2. On any change, `debouncedExecute` fires the `execute` function (line 83-85)
3. `execute` reads fresh `nodes`/`edges` from store, calls `engine.execute(nodes, edges)` (line 57)
4. Inside the engine, all nodes are `'done'`, so `toExecute` is empty in every layer (line 185-188)
5. Returns `{ success: true, executedNodes: [] }` -- no actual execution occurred

**Fix:** Before calling `engine.execute()`, reset the engine's internal statuses so nodes can be re-executed. Add a public method to `NodeEngine` (e.g. `resetStatuses()`) and call it in `useAutoExecute.execute()`:

```typescript
// In NodeEngine.ts:
resetStatuses(): void {
  this.nodeStatus.clear()
}

// In useAutoExecute.ts execute():
const engine = engineRef.current
if (!engine) return

engine.resetStatuses()  // <-- add this line

const result = await engine.execute(nodes, edges)
```

---

### WR-02: HistoryStore merge path skips structuredClone -- snapshot corruption risk

**File:** `apps/web/src/stores/historyStore.ts:43-53`
**Issue:** The `captureSnapshot` method's merge path (used when two changes occur within the `mergeWindow` of 180ms) stores serialized data WITHOUT `structuredClone`. The append path (lines 56-61) correctly uses `structuredClone`. This inconsistency means that if the store's internal data is later mutated (e.g., through `loadSerialized` or a state update), the snapshot's data could be mutated too, since `serialize()` only performs shallow copies.

In `nodeGraphStore.serialize()` (nodeGraphStore.ts:220-225), the spread operator creates new objects but nested contents (arrays, nested objects within `data`) share references. Without `structuredClone`, these references are preserved in the snapshot, opening the door to data corruption on undo.

**Fix:** Wrap the merge path's store snapshots in `structuredClone`:

```typescript
// historyStore.ts line 43-53, replace:
const canvas = useCanvasStore.getState().serialize()
const nodeGraph = useNodeGraphStore.getState().serialize()
const engine = useEngineStore.getState().serialize()

// With:
const canvas = structuredClone(useCanvasStore.getState().serialize())
const nodeGraph = structuredClone(useNodeGraphStore.getState().serialize())
const engine = structuredClone(useEngineStore.getState().serialize())
```

---

### WR-03: GroupNode collapse toggle is non-functional (console.log only)

**File:** `packages/node-editor/src/nodes/GroupNode.tsx:37`
**Issue:** The collapse/expand button in `GroupNode` calls `toggleCollapse()`, which only logs `'toggleCollapse'` + node ID to the console. The actual collapse logic lives in `NodeEditorOverlay.toggleGroupCollapse()` (NodeEditorOverlay.tsx:239-289), but this function is never wired to the `GroupNode` component. Users clicking the collapse button see no visible effect.

**Fix:** There are two approaches:

**Option A:** Remove the toggle button from `GroupNode` and let `NodeEditorOverlay` handle collapsing entirely (e.g., via a context menu or keyboard shortcut). Remove the `console.log`.

**Option B:** Pass a `onToggleCollapse` callback prop to `GroupNode`:

```typescript
// In NodeEditorOverlay.tsx, when rendering GroupNode, pass the callback:
const nodeTypes: NodeTypes = useMemo(() => ({
  // ...
  group: (props) => (
    <GroupNode
      {...props}
      onToggleCollapse={() => toggleGroupCollapse(props.id)}
    />
  ),
}), [toggleGroupCollapse])
```

```typescript
// In GroupNode.tsx, accept and call the prop:
interface GroupNodeProps extends NodeProps {
  data: GroupNodeData
  onToggleCollapse?: () => void
}

// Replace the toggleCollapse function with:
const toggleCollapse = useCallback(() => {
  onToggleCollapse?.()
}, [onToggleCollapse])
```

---

### WR-04: Type safety bypass between NodeEngine and EngineStore

**File:** `apps/web/src/hooks/useAutoExecute.ts:64`
**Issue:** `engine.getNodeStatus(node.id)` returns `string` (defined in `NodeEngine.ts` line 118-119 as `string` return type), but `useEngineStore.getState().setNodeStatus()` expects `ExecutionStatus` (a union of literal strings: `'idle' | 'queued' | 'executing' | 'done' | 'error' | 'skipped'`). The `as any` cast on line 64 silences this type mismatch at runtime instead of fixing the root cause.

**Fix:** Align the return type of `NodeEngine.getNodeStatus()` with `ExecutionStatus`:

```typescript
// In NodeEngine.ts:
import type { ExecutionStatus } from '@ac-canvas/shared'

private nodeStatus: Map<string, ExecutionStatus>  // instead of Map<string, string>

getNodeStatus(nodeId: string): ExecutionStatus {
  return this.nodeStatus.get(nodeId) ?? 'idle'
}
```

This makes the `as any` cast in `useAutoExecute.ts` unnecessary:
```typescript
const status = engine.getNodeStatus(node.id)
if (status && status !== 'idle') {
  useEngineStore.getState().setNodeStatus(node.id, status)  // type-safe now
```

---

### WR-05: Non-transitive sort comparator for group-parent ordering

**File:** `packages/node-editor/src/NodeEditorOverlay.tsx:185-189`
**Issue:** The sort comparator used to ensure group parent nodes appear before their children in React Flow's node array violates the comparator contract for transitivity:

```typescript
const sorted = [...storeNodes].sort((a, b) => {
  if (a.id === b.parentId) return -1  // a is b's parent
  if (b.id === a.parentId) return 1   // b is a's parent
  return 0
})
```

With single-level grouping (per D-08, nested groups deferred), this works in practice but is fragile. If nested groups are ever introduced, `compare(A, B) < 0` and `compare(B, C) < 0` would NOT imply `compare(A, C) < 0` for nested chains (A parent of B, B parent of C). JavaScript's sort algorithm may produce incorrect ordering with a non-transitive comparator.

**Fix:** Implement a stable topological sort that computes all ancestor relationships:

```typescript
function sortGroupsFirst(nodes: NodeGraphNode[]): NodeGraphNode[] {
  // Build parent-child relationship map
  const parentIds = new Map<string, string>()  // childId -> parentId
  for (const n of nodes) {
    if (n.parentId) parentIds.set(n.id, n.parentId)
  }

  // Compute depth for each node (0 for root, 1 for children, etc.)
  function getDepth(id: string): number {
    const parentId = parentIds.get(id)
    if (!parentId) return 0
    return 1 + getDepth(parentId)
  }

  return [...nodes].sort((a, b) => getDepth(a.id) - getDepth(b.id))
}
```

## Info

### IN-01: Duplicate TOOLBAR_ICON_MAP definition

**Files:** `apps/web/src/App.tsx:24-30`, `packages/node-editor/src/NodeEditorOverlay.tsx:83-89`
**Issue:** The exact same `TOOLBAR_ICON_MAP` Record and `getToolbarIcon` function are defined in both files. This duplication increases maintenance burden if icons need to be added or changed.

**Fix:** Export a shared icon map from `@ac-canvas/shared` and import it in both locations.

---

### IN-02: Debug console.log left in production component

**File:** `packages/node-editor/src/nodes/GroupNode.tsx:37`
**Issue:** `console.log('toggleCollapse', id)` remains in the production component. While the toggle is non-functional (WR-03), the console log is a leftover debug artifact.

**Fix:** Remove the `console.log` statement.

---

### IN-03: Executor outputs never persisted back to node graph store

**File:** `apps/web/src/hooks/useAutoExecute.ts:59-74`
**Issue:** The engine's `execute()` method collects executor outputs in its internal `nodeOutputs` map, but neither the engine nor the hook writes these outputs back into the node graph store's `node.data`. The comment on line 59 says "Write results to NodeGraphStore (node.data updates)" but the code only syncs execution status and errors to `engineStore`. In Phase 3 stub mode this is harmless (stubs return placeholder data), but in Phase 5 with real AI executors, the outputs (image IDs, generated content) must be persisted somewhere accessible.

**Fix:** After execution, merge outputs into `nodeGraphStore`:
```typescript
// useAutoExecute.ts, after engine.execute():
for (const node of nodes) {
  const output = engine.getNodeOutput(node.id)  // hypothetical accessor
  if (output) {
    useNodeGraphStore.getState().updateNodeData(node.id, output)
  }
}
```
(Requires adding a `getNodeOutput()` method to `NodeEngine` that exposes the private `nodeOutputs` map.)

---

### IN-04: Cross-package dependency coupling

**File:** `packages/node-editor/src/NodeEditorOverlay.tsx:57-67`
**Issue:** The `@ac-canvas/node-editor` package imports stores (`useNodeGraphStore`, `useCanvasStore`, `useHistoryStore`) and UI components (`Dialog`, `Button`) directly from `@ac-canvas/web` (via `../../../apps/web/src/stores/*`). This creates a build-time dependency from the "library" package to the "app" package, preventing independent building or testing of the node-editor package. The import arrow goes `node-editor` -> `web` when it logically should be the reverse.

**Fix (future):** Extract the shared store interfaces into `@ac-canvas/shared` and inject store references via React context or prop-drilling from `App.tsx` where both packages are consumed. For Phase 3, this is acceptable as a monorepo shortcut.

---

### IN-05: Duplicate function signatures in types.ts and NodeEngine.ts

**File:** `apps/web/src/engine/types.ts:68-80`
**Issue:** The `toExecutionLayers` and `findAffectedDownstream` functions are declared twice: once as implementations in `NodeEngine.ts` (exported), and once as `declare function` signatures in `types.ts`. The `types.ts` versions serve as documentation but are not linked to the implementations -- they could easily diverge.

**Fix:** Either remove the `declare function` declarations from `types.ts` (the implementations in `NodeEngine.ts` already have JSDoc) or convert them to `type` aliases:
```typescript
export type ToExecutionLayers = typeof toExecutionLayers
export type FindAffectedDownstream = typeof findAffectedDownstream
```

---

_Reviewed: 2026-06-30T18:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
