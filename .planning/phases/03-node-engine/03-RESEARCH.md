# Phase 3: Node Engine - Research

**Researched:** 2026-06-30
**Domain:** DAG execution engine, topological sort, incremental dirty-path execution, sub-group node organization, undo/redo integration
**Confidence:** HIGH

## Summary

Phase 3 builds the DAG execution engine that processes node graphs in topological order with incremental updates, sub-group organization via React Flow parentId, and full undo/redo integration with the existing HistoryStore.

**Primary recommendation:** Implement the engine as `apps/web/src/engine/` (not a new workspace package) because it is tightly coupled to `NodeGraphStore` which lives in `apps/web/src/stores/`, and the engine needs direct access to store internals. A lightweight Zustand EngineStore (`useEngineStore`) tracks execution state separately from graph topology per D-09. The topological sort uses Kahn's algorithm, reusing the adjacency list traversal pattern already established in `ConnectionValidator.ts`. Sub-groups use React Flow's built-in `parentId` mechanism with the `group` node type, and collapse/expand is implemented via the `hidden` property on child nodes (no free built-in exists — Pro feature is paywalled).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NODE-03 | Node execution engine supports topological sort, parallel execution, incremental execution (dirty-path marking) | Kahn's algorithm for topological sort (verified pattern from TypeScript 2026 DAG engines). Layer-based partitioning for parallel execution of nodes at same depth. Dirty-path marking via BFS propagation from changed node, reusing adjacency pattern from ConnectionValidator. Sync-first engine with async stubs per D-01. |
| NODE-06 | Node operations support undo/redo | HistoryStore already captures nodeGraph snapshots (Phase 1 D-09). Phase 3 extends snapshots to include engine state (nodeStatus, nodeErrors). The 180ms debounce merge window is preserved. Execution events do NOT create snapshots (D-10). Only topology-changing operations (add, delete, connect, disconnect, group, ungroup) trigger snapshots. |
| NODE-07 | Nodes support sub-grouping (sub-groups) to organize complex graphs | React Flow v12 parentId mechanism with `group` node type. `parentId` field on NodeGraphNode (D-07). Flat serialization with parentId preserves existing format. Single-level only in Phase 3 (D-08, nested groups deferred). Collapse/expand via `hidden` property on child nodes. |
</phase_requirements>

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Execution Model
- **D-01: Sync-first engine with async stubs** -- Phase 3 builds a synchronous DAG execution engine. All `execute()` calls return synchronously (or via `Promise.resolve()` for interface uniformity). Nodes that require AI calls (TextToImageNode, StyleNode in generation mode) are implemented as stubs that return placeholder data. The async execution bridge (queue, SSE, result streaming) is deferred to Phase 5 (AI Execution Infrastructure). The engine interface must be designed to accept async resolvers in Phase 5 without breaking the sync-first contract.

#### Execution Trigger & Lifecycle
- **D-02: Hybrid execution trigger** -- Phase 3 implements auto-execution for sync-phase operation: graph changes (connect, disconnect, parameter update) automatically trigger dirty-path re-execution. The auto-execution is debounced at 180ms (matching the HistoryStore merge window in D-09). The explicit "Run" button and async-gating (user confirmation before AI calls) are deferred to Phase 5 when real AI providers are integrated.

#### Execution State Visualization
- **D-03: Node-level status indicators** -- Each node's visual appearance reflects its execution state via border color and/or corner badge:
  - `idle` (default gray) -- node has not executed or results are stale after a graph change
  - `queued` (blue) -- node is in the topological execution queue, waiting for dependencies
  - `executing` (yellow/amber, animated) -- node is currently running its executor
  - `done` (green) -- node completed successfully
  - `error` (red) -- node execution failed
  - `skipped` (muted gray) -- node was skipped due to an upstream error (failure propagation)
  - Status is stored in a lightweight engine state map (not in NodeGraphNode.data), keyed by node ID. This separation keeps the render model clean from execution transient state.

#### Error Handling
- **D-04: Fail-stop with downstream skip** -- When a node errors during execution:
  1. The node is marked `error` (red border, error message stored in engine state)
  2. All immediate downstream nodes are marked `skipped` (muted)
  3. Execution stops -- no further nodes are queued
  4. User fixes the error (adjusts parameters, reconnects) and the next execution clears the error state

#### Dirty-Path Marking
- **D-05: Node-level dirty marking** -- When a node's input changes (any upstream node re-executed and produced new output), mark all directly downstream nodes as dirty. The dirty flag means "needs re-execution before its output can be considered current."
  - Clean propagation: After a node re-executes and finishes `done`, it marks all downstream nodes dirty. A node that is already `done` but has no dirty upstream stays `done` (no re-execution needed).
  - No value-level comparison: The engine does not compare old vs new output values to determine if downstream really needs re-execution. Node-level marking is sufficient -- in most creative workflows, a node re-execution implies changed output.
  - Initial state: After loading a saved graph, all nodes start as dirty. First execution clears the entire graph.

#### Sub-Group Support (NODE-07)
- **D-06: React Flow native group nodes via parentId** -- Sub-groups are implemented using React Flow's built-in group node mechanism:
  - A group is a special `group` node type (distinct from the 5 workflow node types)
  - Child nodes reference their parent via `parentId` in the React Flow node definition
  - Child positions are relative to the parent group node's top-left corner
  - Collapsing a group hides child nodes visually; expanding shows them
  - Wires can pass through group boundaries (nodes inside group can connect to nodes outside)
  - Groups can be named (editable label on the group header)
- **D-07: Groups serialized as flat list with parentId** -- The serialization format remains a flat `{ nodes, edges }` JSON. Group membership is represented by a `parentId` field on child nodes. This avoids nested serialization complexity while preserving the group hierarchy.
  - The existing `NodeGraphNode` type gains an optional `parentId: string | null` field
  - The existing `NodeGraphSerialized` format extends naturally (no new top-level structure)
  - Coordinate transforms: on serialization, child positions are stored in group-relative coordinates; on deserialization, React Flow handles the parent-relative positioning natively
- **D-08: Groups are Phase 3, nested groups are deferred** -- Single-level grouping (a group contains nodes, but groups cannot contain other groups) is the Phase 3 scope. Nested groups (sub-groups within groups) are deferred to a future phase.

#### Engine Output Storage
- **D-09: Lightweight engine state store** -- A new Zustand store (`useEngineStore`) or a slice within NodeGraphStore manages execution state separate from graph topology:
  - `nodeStatus: Record<string, ExecutionStatus>` -- maps node ID to current execution state
  - `nodeErrors: Record<string, string>` -- maps node ID to error message (only for `error` nodes)
  - `lastExecutedAt: number | null` -- timestamp of last full execution cycle
  - `isExecuting: boolean` -- whether an execution cycle is in progress
  - This store uses the same fine-grained selector pattern (D-24) as other stores.
  - Node execution results (output data) are stored inline in `NodeGraphNode.data` -- the node's data field is updated by its executor on completion. This keeps serialization trivial (snapshot the nodes array) and avoids a separate result cache that could drift from node state.

#### Undo/Redo Integration
- **D-10: HistoryStore snapshots include engine state** -- The existing unified HistoryStore (D-09) already captures `nodeGraph` state alongside `canvas` state. Phase 3 extends this:
  - HistoryStore snapshots include the engine execution state (`nodeStatus`, `nodeErrors`) so undo/redo restores both graph topology and execution status
  - The 180ms debounce merge window is preserved
  - Execution events (running the graph) do NOT create history snapshots -- only topology-changing operations (add, delete, connect, disconnect, group, ungroup) do

### Claude's Discretion
- Engine interface API design (resolver pattern for node executors) -- planner can choose the cleanest approach
- Group collapse/expand animation style and timing
- Keyboard shortcuts for execution (execution trigger is Phase 5, but Phase 3 can reserve Ctrl+Enter for future use)
- Detailed color palette for execution state indicators (use existing node accent colors as base)

### Deferred Ideas (OUT OF SCOPE)
- Nested sub-groups (groups within groups)
- Execution log panel
- Global execution progress bar
- Node-level value comparison for dirty marking
- Manual "Run" button
- User-customizable group colors/themes
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @xyflow/react | ^12.11.1 | DAG visualization + group node parentId | Already in stack, installed, and used by Phase 2. Group node support via `parentId` is built-in [VERIFIED: npm registry, reactflow.dev docs]. |
| Zustand | ^5.0.14 | Engine state store | Already in stack (5 stores). EngineStore follows established Zustand+Immer pattern from canvasStore and nodeGraphStore [VERIFIED: npm registry, codebase]. |
| Immer | ^11.1.8 | Immutable state mutations | Already in stack. EngineStore inner mutations use Immer for ergonomic `set()` calls [VERIFIED: npm registry, codebase]. |
| Vitest | ^4.1.9 | Unit tests for engine logic | Already in stack via vite.config.ts inline config. All Phase 1-2 tests use Vitest [VERIFIED: codebase]. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript | ^5.x | Type definitions for ExecutionStatus, engine interfaces | Type definitions in `packages/shared/src/types/nodeGraph.ts` (extend with parentId, ExecutionStatus) [VERIFIED: codebase]. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom topological sort (Kahn's) | `@skillsregistry/dag` | External DAG library adds dependency for ~50 lines of well-understood algorithm. Project already has BFS traversal in ConnectionValidator -- reusing the pattern is simpler and avoids dependency drift. |
| Custom group collapse/expand | React Flow Pro `useExpandCollapse` | Pro feature requires paid license. Community approach using `hidden` property + custom toggle is MIT-compatible and well-documented. |

**Installation:**
```bash
pnpm install  # dependencies already in lockfile; no new packages needed
```

**Version verification:** All libraries are already installed in the workspace (node_modules present from Phase 1-2). No new packages required for Phase 3.

## Architecture Patterns

### Recommended Project Structure

Phase 3 adds to the existing structure:

```
apps/web/src/
├── engine/                          # NEW: Engine package (not a workspace package)
│   ├── NodeEngine.ts                # Core DAG engine: topological sort, dirty-path, execution
│   ├── types.ts                     # Engine-specific types (ExecutionStatus, Executor interface)
│   ├── resolvers.ts                 # Default stub resolvers (sync, returns placeholder data)
│   └── __tests__/
│       └── NodeEngine.test.ts       # Unit tests: topological sort, dirty-path, error propagation
├── stores/
│   ├── engineStore.ts               # NEW: Zustand store for execution transient state
│   ├── nodeGraphStore.ts            # EXISTING: add parentId field handling + group CRUD
│   └── historyStore.ts              # EXISTING: extend snapshots with engine state
└── components/
    └── NodeStatusIndicator.tsx      # NEW: Status badge/border overlay component

packages/
├── shared/src/types/
│   └── nodeGraph.ts                 # EXTEND: add parentId, add ExecutionStatus type, add group node type
├── node-editor/src/
│   ├── nodes/
│   │   ├── BaseNode.tsx             # EXTEND: render status indicator (border color, badge)
│   │   └── GroupNode.tsx            # NEW: Custom group node component with header, collapse/expand
│   ├── NodeEditorOverlay.tsx        # EXTEND: auto-execution trigger, group toolbar UI
│   └── ConnectionValidator.ts       # REUSE: adjacency traversal pattern for topological sort
```

**Rationale:** Engine lives in `apps/web/src/engine/` (not `packages/engine/`) because:
- The engine is tightly coupled to `NodeGraphStore` which lives in `apps/web/src/stores/`
- The engine needs direct `getState()` access to store internals during execution
- Cross-package dependency (`apps/web` -> `packages/node-editor`) already exists, but adding engine as another package would create `packages/node-editor` -> `packages/engine` -> `apps/web` circular dependency potential
- Future engine server-side extraction (v0.3+) can factor into a package then

### Pattern 1: Kahn's Algorithm for Topological Sort

**What:** Queue-based topological sort that starts with nodes having zero in-degree. Used by `@skillsregistry/dag`, `@577-industries/workflow-dag`, and Network-AI in 2026 TypeScript DAG engines.

**When to use:** Always for Phase 3. This is the most straightforward and well-understood algorithm for topologically sorting a DAG.

**Example:**
```typescript
// Source: Derived from Kahn's algorithm as implemented by @skillsregistry/dag
// and the existing ConnectionValidator BFS pattern.

interface Edge { source: string; target: string }

/**
 * Kahn's algorithm: topological sort returning nodes grouped by depth.
 * Each sub-array is a batch of nodes that can execute in parallel.
 * Returns `null` if a cycle is detected.
 */
export function toExecutionLayers(
  nodeIds: string[],
  edges: Edge[],
): string[][] | null {
  // Build adjacency list and in-degree map
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()
  for (const id of nodeIds) {
    inDegree.set(id, 0)
    adjacency.set(id, [])
  }
  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target)
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1)
  }

  // Queue nodes with zero in-degree
  const queue: string[] = []
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id)
  }

  const layers: string[][] = []
  let processed = 0

  while (queue.length > 0) {
    const currentLayer = [...queue]
    queue.length = 0
    layers.push(currentLayer)

    for (const nodeId of currentLayer) {
      processed++
      const neighbors = adjacency.get(nodeId) ?? []
      for (const neighbor of neighbors) {
        const deg = (inDegree.get(neighbor) ?? 1) - 1
        inDegree.set(neighbor, deg)
        if (deg === 0) queue.push(neighbor)
      }
    }
  }

  // Cycle detection: if not all nodes were processed, there's a cycle
  return processed === nodeIds.length ? layers : null
}
```

**Key insight:** The adjacency list building pattern (`for edge of edges { adjacency.get(edge.source)?.push(edge.target) }`) is already used in `ConnectionValidator.ts` line 78-84. The existing `wouldCreateCycle` function can be reused for pre-execution validation.

### Pattern 2: Dirty-Path Marking via BFS Propagation

**What:** When a node's input changes, propagate a "dirty" flag downstream through BFS. Only nodes marked dirty are included in the next topological sort.

**When to use:** On every user-initiated graph change (parameter update, reconnect, add/remove node) before triggering auto-execution.

```typescript
// Source: Derived from CONTEXT.md D-05 and common DAG dirty-marking patterns.

/**
 * Find all nodes downstream from a changed node (BFS).
 * Returns the set of node IDs that need re-execution.
 */
export function findAffectedDownstream(
  changedNodeId: string,
  edges: { source: string; target: string }[],
): Set<string> {
  // Build forward adjacency: source -> [targets]
  const forward = new Map<string, string[]>()
  for (const edge of edges) {
    const neighbors = forward.get(edge.source) ?? []
    neighbors.push(edge.target)
    forward.set(edge.source, neighbors)
  }

  // BFS from changed node
  const affected = new Set<string>()
  const queue = [changedNodeId]
  while (queue.length > 0) {
    const current = queue.shift()!
    const neighbors = forward.get(current) ?? []
    for (const neighbor of neighbors) {
      if (!affected.has(neighbor)) {
        affected.add(neighbor)
        queue.push(neighbor)
      }
    }
  }

  return affected
}
```

### Pattern 3: Node Executor Resolver Pattern

**What:** Engine resolves node executors via a `Map<NodeType, Executor>` that Phase 5 replaces with real AI implementations.

**When to use:** Always. This is the D-01 contract for Phase 3 -> Phase 5 bridge.

```typescript
// Source: Derived from D-01 and Claude's Discretion (resolver pattern).

// Input to an executor: upstream node outputs keyed by input socket ID
type ExecutorInput = Record<string, unknown>

// Output from an executor: data merged into node.data
type ExecutorOutput = Record<string, unknown>

// An executor function
type Executor = (nodeData: Record<string, unknown>, inputs: ExecutorInput) => ExecutorOutput | Promise<ExecutorOutput>

// Resolver map: pluggable by Phase 5
type ExecutorResolver = Map<string, Executor>
```

### Anti-Patterns to Avoid
- **Full graph re-execution on every change:** Always use dirty-path marking (D-05). Only sort/execute the affected subgraph, not the entire graph.
- **Storing execution state in NodeGraphNode.data:** Engine state (nodeStatus, nodeErrors) belongs in EngineStore, not in node data (D-09). Only node output data goes in `.data`.
- **Creating history snapshots on execution events:** Only topology changes create snapshots (D-10). Execution silence prevents undo stack pollution.
- **Mutating React Flow's node hidden property directly:** Always create new objects for `hidden` changes (React Flow doesn't detect mutations). Verified by community approach from xyflow discussion #1265.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DAG cycle detection | BFS cycle detection from scratch | Reuse `ConnectionValidator.wouldCreateCycle()` | Already implemented and tested in Phase 2. BFS traversal with adjacency list. 105 lines of production code with 5 test cases. |
| Group node visual container | Custom group node with resize | React Flow `group` type + custom GroupNode component | React Flow's `group` node type handles parentId, extent, expandParent. Custom component only needed for header UI (name, collapse button). |
| Undo/redo stack | New undo/redo mechanism | Extend existing HistoryStore (D-10) | HistoryStore already captures nodeGraph+canvas snapshots, has 180ms debounce, 50-snapshot depth, pause during drag. Engine state just needs to be added to the snapshot payload. |
| Auto-execution debounce | New debounce utility | Reuse 180ms pattern from HistoryStore captureSnapshot | Existing merge window pattern. Auto-save already uses 180ms debounce. Using the same timer pattern for execution avoids introducing a new debounce scheduler. |

**Key insight:** The existing codebase already has the patterns needed for Phase 3. The engine's core work is algorithmic (topological sort, BFS propagation) and integration (wiring existing stores together). No new external libraries are needed.

## Common Pitfalls

### Pitfall 1: Engine state appearing in history when it shouldn't

**What goes wrong:** Execution events (node completing, status changes) are captured by the HistoryStore's `captureSnapshot` call, filling the undo stack with noise.

**Why it happens:** `HistoryStore.captureSnapshot()` is called by the auto-save hook `useAutoSave` which runs on any state change. If the EngineStore triggers auto-save on status changes, every status transition becomes an undo point.

**How to avoid:** EngineStore should NOT trigger `captureSnapshot()` on execution status changes. Only hook `captureSnapshot()` into topology-changing operations (addNode, removeNode, addEdge, removeEdge, groupNodes, ungroupNodes). This is already the intended design per D-10.

**Warning signs:** After running a graph, Ctrl+Z undoes execution results instead of topology changes. Undo stack depth grows past 50 after a single execution cycle.

### Pitfall 2: React Flow group node rendering order

**What goes wrong:** Group nodes render below their children instead of containing them, or children appear at wrong positions.

**Why it happens:** React Flow requires parent nodes to appear BEFORE their children in the `nodes` array. If the order is wrong, parent-relative coordinate calculations are incorrect.

**How to avoid:** Always emit group nodes before their children when converting from `NodeGraphStore.nodes` to React Flow nodes. The `toRFNode()` converter in `NodeEditorOverlay.tsx` must sort nodes array so group nodes precede their children.

**Warning signs:** Nodes inside groups appear at unexpected positions (absolute instead of relative). Group nodes render on top of their children.

**Source:** Verified by reactflow.dev docs: "Parent nodes must appear before their children in the nodes/defaultNodes array."

### Pitfall 3: Circular import between EngineStore and auto-execution

**What goes wrong:** Engine imports NodeGraphStore to read topology; NodeEditorOverlay imports EngineStore to trigger execution. If EngineStore imports NodeEditorOverlay or vice versa through a cycle, imports break.

**Why it happens:** NodeEditorOverlay subscribes to NodeGraphStore changes and triggers engine execution. The engine reads NodeGraphStore topology and writes status to EngineStore. If these are wired circularly, module resolution can fail.

**How to avoid:** The engine should be a pure function that accepts topology as input and returns results. EngineStore is a separate Zustand store. Auto-execution trigger lives in a lightweight hook (e.g., `useAutoExecute`) that orchestrates the flow: subscribe to NodeGraphStore -> debounce (180ms) -> call engine with current topology -> write results to EngineStore + NodeGraphStore.

**Warning signs:** `ReferenceError: Cannot access 'X' before initialization` on module load. Webpack/Vite circular dependency warnings.

### Pitfall 4: Group collapse breaks wire visibility

**What goes wrong:** When a group is collapsed and child nodes are hidden, the edges connected to those children remain visible (dangling wires).

**Why it happens:** When setting `hidden: true` on child nodes, their connected edges must also be hidden. React Flow renders edges independently from nodes — hiding a node does not auto-hide its edges.

**How to avoid:** When collapsing a group, iterate over all edges and hide any edge whose source or target is a child node of the collapsed group. React Flow's `getConnectedEdges()` helper can be used to find affected edges.

**Warning signs:** Collapsing a group shows orphaned wires. Expanding shows wires but they connect to half-visible nodes. Hiding children but not edges creates UI confusion.

**Source:** Verified by community discussion (xyflow/xyflow discussion #1265) and Stack Overflow examples on React Flow collapse.

### Pitfall 5: Engine state not restored on project load

**What goes wrong:** After loading a saved project, all nodes show as `idle` (default) instead of `dirty` (needs re-execution). User expects to trigger execution but nodes appear already done.

**Why it happens:** D-05 specifies "After loading a saved graph, all nodes start as dirty." But if EngineStore initializes with empty `nodeStatus` on load, no nodes are marked dirty. The engine skips execution because there's no trigger.

**How to avoid:** On project load, after `loadSerialized()` restores nodes and edges, call `engineStore.markAllDirty()` which sets every node's status to `idle` (which the engine interprets as "needs execution"). Alternatively, store a `dirty` flag per node or just clear the status map on load — the first auto-execution will process everything.

**Warning signs:** After loading a saved project, nodes show no status indicators. Editing a parameter doesn't trigger re-execution. The canvas stays empty.

## Code Examples

### Topological Sort with Parallel Layers

```typescript
// Source: Derived from Kahn's algorithm as implemented by @skillsregistry/dag
// and the existing ConnectionValidator.ts BFS adjacency pattern.

export interface ExecutableEdge {
  source: string
  target: string
}

/**
 * Kahn's algorithm producing parallel execution layers.
 * Layer 0 = roots (no dependencies), Layer 1 = depends on Layer 0, etc.
 * Returns null if cycle detected.
 */
export function toExecutionLayers(
  nodeIds: string[],
  edges: ExecutableEdge[],
): string[][] | null {
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  for (const id of nodeIds) {
    inDegree.set(id, 0)
    adjacency.set(id, [])
  }
  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target)
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1)
  }

  const queue: string[] = []
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id)
  }

  const layers: string[][] = []
  let processed = 0

  while (queue.length > 0) {
    const layer = [...queue]
    queue.length = 0
    layers.push(layer)

    for (const nodeId of layer) {
      processed++
      const neighbors = adjacency.get(nodeId) ?? []
      for (const neighbor of neighbors) {
        const deg = (inDegree.get(neighbor) ?? 1) - 1
        inDegree.set(neighbor, deg)
        if (deg === 0) queue.push(neighbor)
      }
    }
  }

  return processed === nodeIds.length ? layers : null
}
```

### React Flow Group Node with Collapse/Expand

```typescript
// Source: Derived from reactflow.dev sub-flows docs and community
// collapse/expand patterns (xyflow discussion #1265).
// Pro license NOT required — uses public `hidden` API.

type ReactFlowNode = {
  id: string
  type?: string
  position: { x: number; y: number }
  data: Record<string, unknown>
  parentId?: string
  extent?: 'parent'
  hidden?: boolean
}

type ReactFlowEdge = {
  id: string
  source: string
  target: string
  hidden?: boolean
}

/**
 * Toggle a group node's collapsed state.
 * When collapsing: hide all child nodes and their connected edges.
 * When expanding: show all child nodes and their connected edges.
 */
function toggleGroupCollapse(
  groupId: string,
  nodes: ReactFlowNode[],
  edges: ReactFlowEdge[],
): { nodes: ReactFlowNode[]; edges: ReactFlowEdge[] } {
  const groupNode = nodes.find((n) => n.id === groupId)
  if (!groupNode) return { nodes, edges }

  const currentlyCollapsed = groupNode.data.collapsed === true
  const newCollapsed = !currentlyCollapsed

  // Find child node IDs
  const childIds = new Set(
    nodes
      .filter((n) => n.parentId === groupId)
      .map((n) => n.id),
  )

  // Hide/show children and their connected edges
  const updatedNodes = nodes.map((n) => {
    if (childIds.has(n.id)) {
      return { ...n, hidden: newCollapsed }
    }
    if (n.id === groupId) {
      return {
        ...n,
        data: { ...n.data, collapsed: newCollapsed },
        // Optionally resize group when collapsed
        style: newCollapsed
          ? { ...n.style, width: 200, height: 60 }
          : n.style,
      }
    }
    return n
  })

  const updatedEdges = edges.map((e) => {
    if (childIds.has(e.source) || childIds.has(e.target)) {
      return { ...e, hidden: newCollapsed }
    }
    return e
  })

  return { nodes: updatedNodes, edges: updatedEdges }
}
```

### EngineStore State Shape

```typescript
// Source: Derived from D-09 (lightweight engine state store).
// Follows the same Zustand+Immer pattern as canvasStore and nodeGraphStore.

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export type ExecutionStatus =
  | 'idle'     // default - not executed or stale
  | 'queued'   // in topological queue, waiting for dependencies
  | 'executing' // currently running executor
  | 'done'     // completed successfully
  | 'error'    // execution failed
  | 'skipped'  // skipped due to upstream error

export interface EngineStoreState {
  nodeStatus: Record<string, ExecutionStatus>
  nodeErrors: Record<string, string>
  lastExecutedAt: number | null
  isExecuting: boolean

  // Actions
  setNodeStatus: (id: string, status: ExecutionStatus) => void
  setNodeError: (id: string, message: string) => void
  clearNodeError: (id: string) => void
  setExecuting: (executing: boolean) => void
  markAllDirty: () => void
  clearAll: () => void
  getStatus: (id: string) => ExecutionStatus

  // Serialization (for HistoryStore integration, D-10)
  serialize: () => EngineSerializedState
  loadSerialized: (state: EngineSerializedState) => void
}

export interface EngineSerializedState {
  nodeStatus: Record<string, ExecutionStatus>
  nodeErrors: Record<string, string>
}
```

### NodeGraphNode Type Extension for parentId

```typescript
// Source: Extending existing types in packages/shared/src/types/nodeGraph.ts
// per D-07 (flat serialization with parentId).

export interface NodeGraphNode {
  id: string
  type: NodeType | 'group'  // EXTENDED: add 'group' as valid type
  position: { x: number; y: number }
  data: NodeDataUnion | GroupNodeData  // EXTENDED: add GroupNodeData
  parentId?: string | null  // NEW: D-07 group membership
}

// NEW: Group node data type
export interface GroupNodeData {
  nodeType: 'group'
  name: string
  collapsed: boolean
  params: []  // groups have no params
}

// EXTENDED: NodeDataUnion to include GroupNodeData
export type NodeDataUnion =
  | PromptNodeData
  | TextToImageNodeData
  | StyleNodeData
  | MergeNodeData
  | PreviewNodeData
  | GroupNodeData  // NEW
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| React Flow v11 `parentNode` | React Flow v12 `parentId` | v12 release (2025) | `parentNode` deprecated, renamed to `parentId`. All Phase 2 code uses `@xyflow/react` v12.x, so we use `parentId` from the start. |
| Full graph re-execution | Dirty-path incremental execution | Phase 3 (2026) | Instead of topological-sorting and executing all nodes on every change, only the affected downstream subgraph is processed. Critical for performance with 10+ node graphs. |
| Execution state in node data | Separate engine state store (EngineStore) | Phase 3 (D-09) | Transient execution state (status, errors) lives in EngineStore. Only persistent output data lives in NodeGraphNode.data. Keeps serialization clean. |

**Deprecated/outdated:**
- `parentNode` property in React Flow: Use `parentId` instead. Renamed in v11.11.0, removed in v12.
- zundo middleware for undo/redo: Project uses custom HistoryStore (D-09), not zundo. Don't introduce it for Phase 3.
- Excalidraw native undo: Disabled in Phase 1 (D-10) in favor of unified HistoryStore.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | React Flow v12 `parentId` + `extent: 'parent'` is the correct mechanism for sub-groups. | Architecture Patterns | If React Flow group nodes have coordinate calculation bugs at non-standard zoom levels, custom offset math may be needed. Verified by reactflow.dev docs and community examples. |
| A2 | Collapse/expand via `hidden` property is the free (MIT) approach, not behind Pro license. | Architecture Patterns | If xyflow changes the license terms for group node collapse, alternative: DOM-level visibility toggle (CSS `display: none`) on children instead of React Flow's `hidden`. |
| A3 | Engine as `apps/web/src/engine/` is better than a workspace package. | Architecture Patterns | If Phase 5 (AI Execution) needs the engine as a separate package, refactoring from `apps/web/src/engine/` to `packages/engine/` is straightforward: move directory, add package.json, update imports. |
| A4 | No new npm packages are needed for Phase 3. | Standard Stack | The DAG engine is ~200 lines of well-understood algorithm. If cycle detection needs edge cases (multi-edge, self-loop variants), the existing ConnectionValidator covers them. |
| A5 | The 180ms debounce for auto-execution matches HistoryStore's merge window. | Don't Hand-Roll | If rapid parameter changes produce visual lag (every debounce triggers a re-render), the debounce could be increased to 300ms or switched to a requestAnimationFrame pattern. |

## Open Questions (RESOLVED)

1. **How to handle initial execution on project load?** — RESOLVED: Auto-execute after load. EngineStore.markAllDirty() sets all nodes to idle, then the 180ms debounced auto-execution (useAutoExecute hook) processes the entire graph on the next store change trigger.

2. **Should engine be a class-based API or a functional API?** — RESOLVED: Hybrid approach. Pure functions (toExecutionLayers, findAffectedDownstream) for deterministic, testable operations. NodeEngine class wraps these with lifecycle management (execute, markDirty, setResolvers). Pattern implemented in Plan 02.

3. **Where does group CRUD (create, delete, rename, addToGroup, removeFromGroup) live?** — RESOLVED: Group operations live in NodeGraphStore as 5 new actions (createGroup, addToGroup, removeFromGroup, renameGroup, setGroupCollapsed). No separate store needed. Implemented in Plan 04.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest v4 (configured inline in `apps/web/vite.config.ts`) |
| Config file | `apps/web/vite.config.ts` (inline `test` section) |
| Quick run command | `pnpm --filter @ac-canvas/web exec vitest run --reporter verbose` |
| Full suite command | `pnpm --filter @ac-canvas/web exec vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NODE-03 | Topological sort handles linear graphs | unit | `vitest run apps/web/src/engine/__tests__/NodeEngine.test.ts -t "linear"` | Wave 0 |
| NODE-03 | Topological sort handles branched graphs | unit | `vitest run apps/web/src/engine/__tests__/NodeEngine.test.ts -t "branched"` | Wave 0 |
| NODE-03 | Topological sort detects cycles | unit | `vitest run apps/web/src/engine/__tests__/NodeEngine.test.ts -t "cycle"` | Wave 0 |
| NODE-03 | Dirty-path marking correctly identifies affected downstream | unit | `vitest run apps/web/src/engine/__tests__/NodeEngine.test.ts -t "dirty"` | Wave 0 |
| NODE-03 | Error propagation marks downstream as skipped | unit | `vitest run apps/web/src/engine/__tests__/NodeEngine.test.ts -t "error"` | Wave 0 |
| NODE-03 | Parallel layer execution runs nodes in correct order | unit | `vitest run apps/web/src/engine/__tests__/NodeEngine.test.ts -t "layers"` | Wave 0 |
| NODE-07 | Group nodes serialize with parentId | unit | `vitest run apps/web/src/engine/__tests__/NodeEngine.test.ts -t "group"` | Wave 0 |
| NODE-06 | Undo/redo restores engine state | unit | `vitest run apps/web/src/engine/__tests__/NodeEngine.test.ts -t "undo"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `vitest run apps/web/src/engine/__tests__/NodeEngine.test.ts`
- **Per wave merge:** `vitest run --reporter verbose`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `apps/web/src/engine/__tests__/NodeEngine.test.ts` -- engine core tests (topological sort, dirty-path, error propagation, group serialization)
- [ ] `apps/web/src/stores/__tests__/engineStore.test.ts` -- EngineStore actions and serialization
- [ ] Vitest setup for engine directory -- eligible to inherit `apps/web/vite.config.ts` since it's under `apps/web/src/`

*(Gaps are expected -- Phase 3 adds new directories with no prior test infrastructure.)*

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | 23.8.0 | Close enough to 24 LTS |
| pnpm | Package management | Yes | 11.8.0 | Matches project requirement |
| npm | Package management | Yes | 11.13.0 | Fallback for pnpm-issued commands |

**Missing dependencies:** None. All dependencies are in the lockfile from Phase 1-2. No new external services or tools are needed for Phase 3 (all execution is client-side).

## Security Domain

> Security enforcement is not explicitly set in config (absent defaults apply). However, Phase 3 has no network I/O, no authentication, and no external data processing. Security concerns are minimal.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Client-side only, no auth |
| V3 Session Management | no | No sessions |
| V4 Access Control | no | Single-user client app |
| V5 Input Validation | yes | Node params validated via NodeParamDefinition types; executor inputs validated via engine |
| V6 Cryptography | no | No encryption in scope |

**Phase-specific note:** The engine processes only in-memory data (node params, execution results). No network requests, no file system access, no cross-origin communication. Security domain is effectively N/A for Phase 3 -- the security surface is introduced in Phase 4 (AI Adapters, external API calls) and Phase 5 (AI queue, SSE streaming).

## Sources

### Primary (HIGH confidence)
- [CONTEXT.md] - All 10 decisions (D-01 through D-10) from `/gsd-discuss-phase`
- [codebase] - `apps/web/src/stores/nodeGraphStore.ts` - existing store patterns
- [codebase] - `apps/web/src/stores/historyStore.ts` - snapshots, debounce, undo/redo
- [codebase] - `apps/web/src/stores/canvasStore.ts` - Zustand+Immer pattern reference
- [codebase] - `packages/shared/src/types/nodeGraph.ts` - existing type definitions
- [codebase] - `packages/node-editor/src/ConnectionValidator.ts` - BFS adjacency pattern
- [codebase] - `packages/node-editor/src/nodes/BaseNode.tsx` - status indicator anchor
- [codebase] - `packages/node-editor/src/NodeEditorOverlay.tsx` - integration point

### Secondary (MEDIUM confidence)
- [reactflow.dev Sub-Flows docs] - parentId, extent, expandParent, group node type, ordering requirement
- [reactflow.dev Expand/Collapse example] - Pro feature (behind license), uses `useExpandCollapse` + dagre
- [xyflow discussion #1265] - Community collapse/expand via `hidden` property, getConnectedEdges()
- [@skillsregistry/dag npm] - `toExecutionLayers()` Kahn's algorithm pattern
- [Network-AI GitHub f0997c1] - `topologicalLayers()` utility, layer-based scheduling
- [AgenC issue #261] - DependencyGraph design: Kahn's algorithm, DFS cycle detection, depth caching
- [CGraph DeepWiki] - GTopoEngine, GStaticEngine layer-based partitioning pattern
- [zustand-patterns skill] - Zustand 5 middleware order, Immer slice typing, engine store patterns
- [Zustand PR #3371] - Immer middleware typing fix for slices (v5.0.10+)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries are already in the project, versions verified via npm registry
- Architecture: HIGH - Patterns validated against reactflow.dev docs, existing codebase, and TypeScript DAG engine landscape
- Pitfalls: HIGH - Derived from specific DAG engine pitfalls (cycle detection, group node ordering, edge visibility) and project-specific integration risks (HistoryStore pollution, circular imports)

**Research date:** 2026-06-30
**Valid until:** 2026-07-30 (stable stack, no fast-moving dependencies)
