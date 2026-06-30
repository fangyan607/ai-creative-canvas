# Phase 3: Node Engine — Context

**Gathered:** 2026-06-30
**Status:** Ready for planning
**Language:** Chinese (用户沟通语言)

<domain>
## Phase Boundary

Build the DAG execution engine that processes node graphs in topological order, with dirty-path incremental execution, sub-group node organization, and full undo/redo support for node graph operations. This is the compute layer that sits on top of the Phase 2 NodeGraphStore — it reads the node graph topology, executes nodes in dependency order, tracks execution state, and produces results that downstream phases (AI execution, preview) consume.

**Requirements covered:** NODE-03, NODE-06, NODE-07

**Success criteria:**
1. After connecting nodes and triggering execution, the engine processes nodes in correct topological order and completes all downstream nodes
2. Changing one node's parameter re-executes only the affected downstream path (dirty-path marking), not the entire graph
3. User can group nodes into named sub-groups to organize complex graphs, with collapse/expand
4. Node graph operations (add, delete, connect, disconnect) support undo/redo alongside canvas undo/redo
</domain>

<decisions>
## Implementation Decisions

### Execution Model
- **D-01: Sync-first engine with async stubs** — Phase 3 builds a synchronous DAG execution engine. All `execute()` calls return synchronously (or via `Promise.resolve()` for interface uniformity). Nodes that require AI calls (TextToImageNode, StyleNode in generation mode) are implemented as stubs that return placeholder data. The async execution bridge (queue, SSE, result streaming) is deferred to Phase 5 (AI Execution Infrastructure). The engine interface must be designed to accept async resolvers in Phase 5 without breaking the sync-first contract.
  - Rationale: Keeps Phase 3 focused on DAG execution correctness (topological sort, dirty-path, error propagation) without coupling to AI provider complexity. The engine interface (node executor resolver pattern) will allow Phase 5 to plug in async implementations.

### Execution Trigger & Lifecycle
- **D-02: Hybrid execution trigger** — Phase 3 implements auto-execution for sync-phase operation: graph changes (connect, disconnect, parameter update) automatically trigger dirty-path re-execution. The auto-execution is debounced at 180ms (matching the HistoryStore merge window in D-09). The explicit "Run" button and async-gating (user confirmation before AI calls) are deferred to Phase 5 when real AI providers are integrated.
  - Rationale: Phase 3 has no expensive operations, so auto-execution on every change is safe and provides instant feedback. The manual run gate only matters when AI API costs are at stake.

### Execution State Visualization
- **D-03: Node-level status indicators** — Each node's visual appearance reflects its execution state via border color and/or corner badge:
  - `idle` (default gray) — node has not executed or results are stale after a graph change
  - `queued` (blue) — node is in the topological execution queue, waiting for dependencies
  - `executing` (yellow/amber, animated) — node is currently running its executor
  - `done` (green) — node completed successfully
  - `error` (red) — node execution failed
  - `skipped` (muted gray) — node was skipped due to an upstream error (failure propagation)
  - Status is stored in a lightweight engine state map (not in NodeGraphNode.data), keyed by node ID. This separation keeps the render model clean from execution transient state.
  - Rationale: Node-level indicators are the most intuitive and least intrusive way to show execution flow. A global progress bar would add UI noise; a log panel is useful for debugging but can be a Phase 7 UI polish addition.

### Error Handling
- **D-04: Fail-stop with downstream skip** — When a node errors during execution:
  1. The node is marked `error` (red border, error message stored in engine state)
  2. All immediate downstream nodes are marked `skipped` (muted)
  3. Execution stops — no further nodes are queued
  4. User fixes the error (adjusts parameters, reconnects) and the next execution clears the error state
  - Rationale: Safer than "skip and continue" — prevents downstream nodes from operating on corrupted/partial data. Users get clear signal about what broke and can fix it before retrying.

### Dirty-Path Marking
- **D-05: Node-level dirty marking** — When a node's input changes (any upstream node re-executed and produced new output), mark all directly downstream nodes as dirty. The dirty flag means "needs re-execution before its output can be considered current."
  - Clean propagation: After a node re-executes and finishes `done`, it marks all downstream nodes dirty. A node that is already `done` but has no dirty upstream stays `done` (no re-execution needed).
  - No value-level comparison: The engine does not compare old vs new output values to determine if downstream really needs re-execution. Node-level marking is sufficient — in most creative workflows, a node re-execution implies changed output.
  - Initial state: After loading a saved graph, all nodes start as dirty. First execution clears the entire graph.
  - Rationale: Node-level marking strikes the right balance between correctness and complexity. Value-level comparison (comparing image buffers, large strings) would add overhead that outweighs the benefit for this use case.

### Sub-Group Support (NODE-07)
- **D-06: React Flow native group nodes via parentId** — Sub-groups are implemented using React Flow's built-in group node mechanism:
  - A group is a special `group` node type (distinct from the 5 workflow node types)
  - Child nodes reference their parent via `parentId` in the React Flow node definition
  - Child positions are relative to the parent group node's top-left corner
  - Collapsing a group hides child nodes visually; expanding shows them
  - Wires can pass through group boundaries (nodes inside group can connect to nodes outside)
  - Groups can be named (editable label on the group header)
- **D-07: Groups serialized as flat list with parentId** — The serialization format remains a flat `{ nodes, edges }` JSON. Group membership is represented by a `parentId` field on child nodes. This avoids nested serialization complexity while preserving the group hierarchy.
  - The existing `NodeGraphNode` type gains an optional `parentId: string | null` field
  - The existing `NodeGraphSerialized` format extends naturally (no new top-level structure)
  - Coordinate transforms: on serialization, child positions are stored in group-relative coordinates; on deserialization, React Flow handles the parent-relative positioning natively
- **D-08: Groups are Phase 3, nested groups are deferred** — Single-level grouping (a group contains nodes, but groups cannot contain other groups) is the Phase 3 scope. Nested groups (sub-groups within groups) are deferred to a future phase.

### Engine Output Storage
- **D-09: Lightweight engine state store** — A new Zustand store (`useEngineStore`) or a slice within NodeGraphStore manages execution state separate from graph topology:
  - `nodeStatus: Record<string, ExecutionStatus>` — maps node ID to current execution state
  - `nodeErrors: Record<string, string>` — maps node ID to error message (only for `error` nodes)
  - `lastExecutedAt: number | null` — timestamp of last full execution cycle
  - `isExecuting: boolean` — whether an execution cycle is in progress
  - This store uses the same fine-grained selector pattern (D-24) as other stores.
  - Node execution results (output data) are stored inline in `NodeGraphNode.data` — the node's data field is updated by its executor on completion. This keeps serialization trivial (snapshot the nodes array) and avoids a separate result cache that could drift from node state.

### Undo/Redo Integration
- **D-10: HistoryStore snapshots include engine state** — The existing unified HistoryStore (D-09) already captures `nodeGraph` state alongside `canvas` state. Phase 3 extends this:
  - HistoryStore snapshots include the engine execution state (`nodeStatus`, `nodeErrors`) so undo/redo restores both graph topology and execution status
  - The 180ms debounce merge window is preserved
  - Execution events (running the graph) do NOT create history snapshots — only topology-changing operations (add, delete, connect, disconnect, group, ungroup) do
  - Rationale: Prevents the undo stack from being polluted by execution noise. Users undo "what they did" (added a node, changed a parameter), not "what the engine computed."

### Claude's Discretion
- Engine interface API design (resolver pattern for node executors) — planner can choose the cleanest approach
- Group collapse/expand animation style and timing
- Keyboard shortcuts for execution (execution trigger is Phase 5, but Phase 3 can reserve Ctrl+Enter for future use)
- Detailed color palette for execution state indicators (use existing node accent colors as base)
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Boundary & Requirements
- `.planning/ROADMAP.md` — Phase 3 goal, success criteria (topological order, dirty-path, sub-groups, undo/redo)
- `.planning/REQUIREMENTS.md` — NODE-03 (engine: topology + parallel + dirty), NODE-06 (undo/redo), NODE-07 (sub-groups)

### Prior Phase Decisions (Mandatory Reading)
- `.planning/phases/01-core-canvas/01-CONTEXT.md` — D-09 (unified HistoryStore), D-24 (fine-grained selectors), D-27 (contribute upstream)
- `.planning/phases/02-node-editor-interface/02-CONTEXT.md` — D-35 (connection validation / cycle prevention), D-42 (flat JSON serialization), D-44 (HistoryStore node graph integration), D-49 (NodeGraphStore)
- `.planning/phases/02-node-editor-interface/02-UI-SPEC.md` — UI design contract for node editor (if exists)

### Technical Research
- `.planning/research/ARCHITECTURE.md` — Three-layer architecture, data flows, state patterns
- `.planning/research/PITFALLS.md` — Pitfall 3 (Node Soup, mitigation via sub-groups), Pitfall 6 (Zustand re-render cascade), Pitfall 7 (undo/redo state corruption)

### Existing Code (Read for patterns)
- `apps/web/src/stores/nodeGraphStore.ts` — Existing store that engine reads from and writes to
- `apps/web/src/stores/historyStore.ts` — Unified undo/redo, to be extended with engine state
- `apps/web/src/stores/canvasStore.ts` — Serialization pattern reference
- `packages/shared/src/types/nodeGraph.ts` — Node graph type definitions (NodeGraphNode, NodeGraphEdge, NodeGraphSerialized)
- `packages/shared/src/types/canvas.ts` — AIElement type with generationStatus field
- `packages/node-editor/src/ConnectionValidator.ts` — Existing cycle detection (BFS), engine should also use or wrap this
- `apps/web/src/App.tsx` — App layout, integration point for execution UI
- `packages/node-editor/src/NodeEditorOverlay.tsx` — Node editor overlay component
- `packages/node-editor/src/nodes/BaseNode.tsx` — Base node component (status indicator rendering anchor)

### Configuration
- `.planning/config.json` — Workflow configuration
- `CLAUDE.md` — Project instructions, tech stack constraints
- `.planning/PROJECT.md` — Vision, constraints, key decisions
- `.planning/STATE.md` — Current project state
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **NodeGraphStore** — Full Zustand+Immer store with CRUD operations, serialization. Engine reads topology from here and writes execution results back.
- **HistoryStore** — Unified undo/redo with 50-snapshot depth, 180ms merge window, already captures nodeGraph state. Phase 3 extends to include engine state.
- **ConnectionValidator** — BFS-based cycle detection. Engine's topological sort should use this or its underlying graph traversal logic.
- **BaseNode component** — All 5 node types extend BaseNode. Status indicator rendering can be added here centrally.
- **CanvasStore serialize/loadSerialized pattern** — Clean separation of concerns for store state persistence. Engine state store should follow same pattern.
- **NodeType enum & definitions** — `NodeType`, `NodeDataUnion`, `nodeTypeDefinitions` in `packages/shared/src/types/nodeGraph.ts`. Engine dispatches execution based on node type.

### Established Patterns
- Zustand + Immer for stores (with `useShallow` for fine-grained selectors)
- `serialize()` / `loadSerialized()` interface for all state stores
- Local state for drag interactions, commit on release
- 180ms debounce merge window for auto-save and history
- `structuredClone()` for history snapshot deep copies
- Flat JSON serialization (D-42): `{ nodes, edges }` with no nesting

### Integration Points for Phase 3
- **New package or store** — Engine can be `packages/engine/` (new workspace package) or a module within `apps/web/src/engine/`. Decision deferred to planner.
- **NodeGraphStore** — Engine reads `nodes` and `edges`, writes execution results back to `node.data`
- **HistoryStore** — Extend snapshot to include engine state (`nodeStatus`, `nodeErrors`)
- **BaseNode component** — Add status indicator rendering (border color, badge)
- **App.tsx** — Minimal UI additions (execution indicator, no toolbar button in Phase 3)
- **NodeEditorOverlay** — Integrate auto-execution trigger on graph changes
- **packages/shared/types/nodeGraph.ts** — Add `parentId` to `NodeGraphNode`, add `ExecutionStatus` type

### What Phase 4+ Expects From Phase 3
- Stable engine execution API that Phase 5's AI bridge can call
- Execution results stored in node.data (TextToImageNode output = generated image blob ID)
- Clean interface for node resolvers/executors that Phase 4 AI adapters can implement
- Error propagation that AI execution bridge can extend with retry logic
- Group-aware serialization that survives project save/load
</code_context>

<specifics>
## Specific Ideas

- **Execution as a pipeline** — The engine should expose a simple functional API: `execute(graph: { nodes, edges }, resolvers: Map<NodeType, Executor>) → Promise<ExecutionResult>`. The resolvers map is where Phase 5 plugs in real AI executors.
- **Node status stored separately from node data** — Engine state (`nodeStatus`, `nodeErrors`) is transient and managed by the engine, not stored in the node's data payload. This keeps serialization clean: only persist the node's output data, not its execution metadata.
- **Auto-execution debounce** — Match the 180ms debounce from HistoryStore (D-09) for consistency. When the user adjusts a slider/text field rapidly, rapid intermediate states collapse into one execution.
- **Group naming UX** — Double-click group header to edit name. Group name stored in the group node's data field.
- **Sub-group wire transparency** — Wires entering/exiting a group should render cleanly at group boundaries. React Flow's built-in group handles this when the wire source/target is outside the group.
</specifics>

<deferred>
## Deferred Ideas

- **Nested sub-groups** — Groups within groups (multi-level hierarchy). Single-level groups only in Phase 3.
- **Execution log panel** — A dedicated panel showing node execution history, timing, and outputs. Would be a Phase 7 UI feature.
- **Global execution progress bar** — UI enhancement, not needed for Phase 3 MVP.
- **Node-level value comparison for dirty marking** — If profile data later shows unnecessary re-executions, this optimization can be added as a performance pass.
- **Manual "Run" button** — Deferred to Phase 5 when AI API costs make explicit execution gating meaningful.
- **User-customizable group colors/themes** — Groups use default styling in Phase 3.
</deferred>

---

*Phase: 03-node-engine*
*Context gathered: 2026-06-30*
