# Architecture Patterns

**Project:** AI Unlimited Creative Canvas (AI Creative Canvas)
**Domain:** Browser-based AI creative design tool (Excalidraw infinite canvas + Blender-style node editor + multi-model AI generation)
**Researched:** 2026-06-29
**Mode:** Ecosystem (with specific project architecture analysis)

---

## Recommended Architecture

The project already defines a well-structured three-layer architecture in its planning documents. This document validates that architecture against real-world 2025-2026 patterns and fills in specific interaction details, data flow protocols, and anti-pattern warnings.

### High-Level Architecture (Validated)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND — BROWSER (SPA)                           │
│                                                                             │
│  ┌───────────────────┐  ┌───────────────────┐  ┌────────────────────────┐  │
│  │   CANVAS LAYER    │  │  NODE EDITOR       │  │  UI LAYER              │  │
│  │  (Excalidraw fork)│  │  (React Flow v12)  │  │  (Radix + shadcn/ui)   │  │
│  │                   │  │                    │  │                        │  │
│  │  • AIElement      │  │  • CustomNodes     │  │  • Toolbar             │  │
│  │  • VideoElement   │  │  • NodeEngine      │  │  • Sidebar/Properties  │  │
│  │  • ChunkRenderer  │  │  • ParamMapper     │  │  • ExportDialog        │  │
│  │  • LazyLoader     │  │  • Validation      │  │  • Settings            │  │
│  └────────┬──────────┘  └────────┬───────────┘  └───────────┬────────────┘  │
│           │                      │                          │               │
│  ┌────────▼──────────────────────▼──────────────────────────▼───────────┐  │
│  │                     STATE LAYER (Zustand + Immer)                     │  │
│  │                                                                        │  │
│  │  ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌───────────┐ ┌────────┐ │  │
│  │  │ CanvasStore │ │ NodeGraph  │ │AIQueue   │ │ History   │ │ UI     │ │  │
│  │  │ (elements,  │ │ Store      │ │Store      │ │ Store    │ │ Pref   │ │  │
│  │  │  viewport)  │ │ (nodes,    │ │(queue,    │ │(undo,    │ │ Store  │ │  │
│  │  │             │ │  edges,    │ │ progress, │ │ redo,    │ │(panels,│ │  │
│  │  │             │ │  execution)│ │ results)  │ │ snapshots│ │ theme) │ │  │
│  │  └────────────┘ └────────────┘ └──────────┘ └───────────┘ └────────┘ │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                      STORAGE / API LAYER                               │  │
│  │  ┌──────────────────┐ ┌──────────────┐ ┌───────────────────────────┐  │  │
│  │  │ IndexedDB        │ │ File API     │ │ HTTP Client (ky)          │  │  │
│  │  │ (Dexie.js)       │ │ (local files)│ │ • AI Proxy API            │  │  │
│  │  │ • projects       │ │ • import     │ │ • SSE stream (progress)   │  │  │
│  │  │ • settings       │ │ • export     │ │ • File upload/download    │  │  │
│  │  │ • cache          │ │ • resources  │ │ • Auth (JWT)              │  │  │
│  │  └──────────────────┘ └──────────────┘ └───────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬───────────────────────────────────────────┘
                                   │ HTTP REST + SSE
┌──────────────────────────────────▼───────────────────────────────────────────┐
│                     BACKEND (Node.js / Hono)                                 │
│                                                                              │
│  ┌──────────────────┐  ┌────────────────┐  ┌───────────────────┐           │
│  │  AI Gateway       │  │  Project Mgmt  │  │  File Service     │           │
│  │  • Provider proxy │  │  • CRUD        │  │  • Upload/Download│           │
│  │  • SSE streaming  │  │  • Auth (JWT)  │  │  • Media handling  │           │
│  │  • Rate limiting  │  │  • Quota       │  │  • R2 storage      │           │
│  │  • Queue mgmt     │  │                │  │                   │           │
│  └────────┬──────────┘  └───────┬────────┘  └───────────────────┘           │
│           │                     │                                            │
│  ┌────────▼─────────────────────▼─────────────────────────────────────────┐  │
│  │              DATA LAYER (Drizzle ORM)                                  │  │
│  │  ┌──────────────────────┐  ┌──────────────────────────────┐           │  │
│  │  │  SQLite (dev/local)  │  │  Cloudflare D1 (production)  │           │  │
│  │  │  • users             │  │  • projects                   │           │  │
│  │  │  • projects          │  │  • ai_generations             │           │  │
│  │  │  • ai_generations    │  │  • templates                  │           │  │
│  │  └──────────────────────┘  └──────────────────────────────┘           │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Boundaries

### Frontend Component Boundaries

| Component | Responsibility | Owns | Communicates With |
|-----------|---------------|------|-------------------|
| **Canvas Layer** (packages/canvas/) | Infinite canvas rendering, element management, viewport navigation | AIElement/VideoElement rendering, chunk-based culling, element z-order/lock/hide | CanvasStore (read/write element state), HistoryStore (undo/redo), UI Layer (toolbar triggers) |
| **Node Editor** (packages/node-editor/) | Visual DAG editing, node execution engine, parameter controls | Custom React Flow nodes, NodeEngine (topological sort + parallel execution), ParamMapper, Validator | NodeGraphStore (read/write graph state), AIQueueStore (dispatch AI jobs), CanvasStore (embed results) |
| **AI Core** (packages/ai-core/) | Multi-model AI provider abstraction, request queuing, prompt engineering | AIProvider interface + adapters, AIQueue, RateLimiter, PromptBuilder | Backend AI Gateway (HTTP/SSE), NodeGraphStore (consume params, emit results) |
| **UI Layer** (apps/web/components/) | Toolbar, sidebar, properties panel, export dialog, settings | Component layout, panel resizing, keyboard shortcut scoping | All Zustand stores (read/write UI preferences) |
| **Zustand Stores** (apps/web/stores/) | Centralized client state for all domains | CanvasState, NodeGraphState, AIQueueState, HistoryState, UIPreferences | All components (via selectors), Dexie.js (persistence), HTTP Client (server sync) |
| **Shared** (packages/shared/) | Shared TypeScript types and utilities | project.ts, canvas.ts, node.ts, ai.ts type definitions, utility functions | All packages and apps |

### Backend Component Boundaries

| Component | Responsibility | Owns | Communicates With |
|-----------|---------------|------|-------------------|
| **AI Gateway** (apps/server/src/routes/ai.ts) | Proxy AI API requests, hide API keys, add rate limiting, stream results | Provider routing, SSE connection management, request queue | External AI APIs (OpenAI/Stability/Replicate), Drizzle ORM (generation records) |
| **Project Service** (apps/server/src/routes/projects.ts) | Project CRUD, user authentication, quota management | JWT auth, project metadata, user profiles | Drizzle ORM, File Service |
| **File Service** (apps/server/src/routes/files.ts) | File upload/download, media processing | Blob storage (local FS or R2), file metadata | Cloudflare R2, Drizzle ORM |

---

## Data Flow

### Primary Data Flows

#### Flow 1: AI Generation (Node-Triggered)

This is the **most critical data flow** in the system — the pipeline from user node interaction to AI-generated content appearing on the canvas.

```
User Node Interaction
       │
       ▼
┌────────────────────────────────────────────────────┐
│  1. STATE UPDATE (NodeGraphStore)                   │
│     • User edits prompt text in PromptNode          │
│     • Zustand updates node.params via Immer          │
│     • Immer produces immutable state snapshot        │
│     • HistoryStore captures snapshot for undo         │
└────────────────────────────────┬───────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────┐
│  2. NODE ENGINE SCHEDULING (NodeEngine)             │
│     • NodeEngine detects dirty path                 │
│     • Topological sort on affected subgraph         │
│     • Partition into execution levels                │
│     • Mark downstream nodes as stale                 │
└────────────────────────────────┬───────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────┐
│  3. PARAMETER MAPPING (ParamMapper)                 │
│     • Collect inputs from upstream nodes            │
│     • Map node params → AI API params                │
│     • Validate required params (Zod)                │
│     • Build final prompt via PromptBuilder           │
└────────────────────────────────┬───────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────┐
│  4. AI DISPATCH (AIQueueStore → AI Core)             │
│     • Create AIJob record (pending state)            │
│     • Enqueue to AIQueue                              │
│     • RateLimiter checks quota                       │
│     • AIProvider interface: find correct adapter     │
│     • Adapter calls AI API (backend proxy)           │
└────────────────────────────────┬───────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────┐
│  5. BACKEND PROXY (Hono AI Gateway)                 │
│     • Receive request from frontend                 │
│     • Validate + rate-limit per user                │
│     • Forward to AI provider (hidden API key)       │
│     • Begin SSE stream back to frontend             │
│     • Stream: queued → processing → chunk → done    │
└────────────────────────────────┬───────────────────┘
                                 │ SSE stream
                                 ▼
┌────────────────────────────────────────────────────┐
│  6. RESULT CONSUMPTION (Frontend SSE listener)      │
│     • AIQueueStore updates: progress %              │
│     • On completion: store result URL/data           │
│     • NodeGraphStore updates output sockets          │
│     • Downstream nodes re-execute (cascade)          │
└────────────────────────────────┬───────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────┐
│  7. CANVAS INTEGRATION                               │
│     • PreviewNode receives result → render preview   │
│     • User clicks "Apply to Canvas"                  │
│     • CanvasStore.addElement(type='ai-image', url)   │
│     • Excalidraw renders AIElement with image data   │
│     • HistoryStore captures snapshot                  │
└────────────────────────────────────────────────────┘
```

#### Flow 2: Canvas Element → Node Input (Reverse Flow)

```
Canvas Element Selection
       │
       ▼
┌────────────────────────────────────────────────────┐
│  1. User selects AI-generated image on canvas        │
│  2. Clicks "Send to Node Editor"                      │
│  3. CanvasStore exposes element data                  │
│  4. NodeGraphStore creates ImageInputNode             │
│  5. ImageInputNode has output socket with image data  │
│  6. User connects ImageInputNode → ImageToImageNode   │
│  7. NodeEngine triggers dirty propagation             │
│  8. ImageToImageNode executes with canvas image       │
└────────────────────────────────────────────────────┘
```

#### Flow 3: Project Save/Load

```
Save Trigger (auto-save debounced 180ms)
       │
       ▼
┌────────────────────────────────────────────────────┐
│  1. CanvasStore.serialize() → JSON                  │
│  2. NodeGraphStore.serialize() → JSON               │
│  3. Bundle into ProjectPayload                      │
│  4. Dexie.js: projects.update(id, payload)          │
│     • This is IndexedDB — works offline             │
│     • No server round-trip for MVP                  │
│  5. Optional: POST /api/projects/:id (server sync)  │
└────────────────────────────────────────────────────┘
```

#### Flow 4: Drag Operations (Performance-Critical)

```
MouseDown on Canvas Element
       │
       ▼
┌────────────────────────────────────────────────────┐
│  1. mousedown → capture in local useState            │
│     • NO Zustand updates during drag                 │
│     • Local state: { dragging: true, offset, start } │
│     • HistoryStore pauses snapshot capture           │
└────────────────────────────────┬───────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────┐
│  2. mousemove → update local state only             │
│     • React state updates at 60fps                  │
│     • Only the dragging component re-renders        │
│     • NO parent re-renders (no Zustand subscribe)   │
└────────────────────────────────┬───────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────┐
│  3. mouseup → commit to Zustand                     │
│     • CanvasStore.updateElement(id, { x, y })       │
│     • HistoryStore captures combined snapshot       │
│     • All other components see the final state      │
└────────────────────────────────────────────────────┘
```

---

## Patterns to Follow

### Pattern 1: Domain-Split Zustand Stores (Not One Monolithic Store)

**What:** Separate Zustand stores per domain concern, not one giant `EditorStore`.

**When:** Always. This is the single most important performance pattern for complex editors.

```typescript
// ─── CORRECT: Split by domain ───
const useCanvasStore = create<CanvasStore>()(immer((set) => ({
  elements: {},
  viewport: { x: 0, y: 0, zoom: 1 },
  visibleElementIds: [],
  addElement: (el) => set((s) => { s.elements[el.id] = el }),
  updateElement: (id, props) => set((s) => { Object.assign(s.elements[id], props) }),
  removeElement: (id) => set((s) => { delete s.elements[id] }),
})))

const useNodeGraphStore = create<NodeGraphStore>()(immer((set) => ({
  nodes: {},
  edges: [],
  executionState: 'idle',
  // ...node-specific state and actions
})))

const useAIQueueStore = create<AIQueueStore>()((set) => ({
  queue: [],
  activeJobs: {},
  progress: {},
  // ...AI-specific state and actions
})))

const useHistoryStore = create<HistoryStore>()((set) => ({
  snapshots: [],
  currentIndex: -1,
  isPaused: false,       // paused during drag operations
  // ...undo/redo state and actions
}))
```

**Why:**
- Components subscribe to only the store they need
- A canvas position update doesn't re-render the AI queue panel
- Enables independent testing of each domain
- Matches the 2025 production pattern seen in Giselle, AutoGPT, TapCanvas, and other production React Flow editors

**Source:** Verified against WebSearch results showing Giselle, TapCanvas, and gemini-flow all use split Zustand stores.

### Pattern 2: Selector-Based Subscriptions with `useShallow`

**What:** Always use fine-grained selectors, and `useShallow` for object/array selectors to prevent unnecessary re-renders.

```typescript
// ─── CORRECT: Fine-grained selector ───
const element = useCanvasStore(useShallow((s) => s.elements[id]))
// This component re-renders only when element[id] changes

// ─── CORRECT: useShallow for object return ───
const { name, size } = useNodeGraphStore(
  useShallow((s) => ({ name: s.nodes[id]?.params.name, size: s.nodes[id]?.params.size }))
)

// ─── WRONG: subscribes to entire store ───
const store = useCanvasStore()  // re-renders on ANY change
```

**Why:** Canvas editors have hundreds/thousands of elements. Without granular subscriptions, any single element update triggers re-renders of all elements.

**Source:** Confirmed by WebSearch (React Flow Guide Oct 2025, Zustand best practices 2025).

### Pattern 3: Local State for Drag, Global Store for Commitment

**What:** During pointer interactions (drag, resize, draw), use local React state. Commit to Zustand only on release.

```typescript
function DraggableElement({ id }: { id: string }) {
  // Local state during drag — no global store subscription for position
  const [dragState, setDragState] = useState<{ isDragging: boolean; offset: Point } | null>(null)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Pause history capture during drag
    useHistoryStore.getState().setPaused(true)
    setDragState({ isDragging: true, offset: computeOffset(e, initialPos) })
  }, [id])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState) return
    // Local state update — no re-render of parent components
    setDragState(prev => ({ ...prev!, offset: computeOffset(e) }))
    // Optionally: useAnimationFrame for smooth rendering
  }, [dragState])

  const handlePointerUp = useCallback(() => {
    if (!dragState) return
    // Commit to global store only once
    useCanvasStore.getState().updateElement(id, { x: dragState.offset.x, y: dragState.offset.y })
    useHistoryStore.getState().setPaused(false)
    setDragState(null)
  }, [id, dragState])
}
```

**Performance Impact:** ~75% reduction in re-renders compared to global state during drag (1004 vs 4000 re-renders per benchmark).

**Source:** Verified by WebSearch (Zustand best practices 2025 benchmarks, TapCanvas "no history capture during drag").

### Pattern 4: DAG-Based Incremental Node Execution

**What:** The node execution engine uses topological sort + dirty-path marking + parallel level execution.

```typescript
class NodeEngine {
  // Key design decisions:
  // 1. Topological sort runs only on dirty subgraph, not the full graph
  // 2. Nodes at the same depth level execute in parallel (Promise.all)
  // 3. Each node output is cached — if inputs haven't changed, skip execution
  // 4. Dirty marking propagates downstream (not upstream)

  private cache = new Map<string, CachedOutput>()

  async executeGraph(graph: NodeGraph, changedNodeId?: string): Promise<ExecutionResult> {
    // 1. Find dirty subgraph (if changedNodeId provided, start from it)
    const dirtyNodes = changedNodeId
      ? this.findAffectedSubgraph(graph, changedNodeId)
      : graph.nodes

    // 2. Topological sort on dirty nodes only
    const sorted = this.topologicalSort(dirtyNodes, graph.edges)

    // 3. Partition into parallel levels
    const levels = this.partitionIntoLevels(sorted, graph.edges)

    // 4. Execute level by level
    for (const level of levels) {
      const results = await Promise.all(
        level.map(nodeId => this.executeNodeIfNeeded(nodeId, graph))
      )
      this.storeResults(results)
    }
  }

  private async executeNodeIfNeeded(nodeId: string, graph: NodeGraph): Promise<NodeOutput> {
    const node = graph.nodes[nodeId]
    const inputHash = this.hashInputs(node, graph)

    // Skip if inputs unchanged
    if (this.cache.has(nodeId) && this.cache.get(nodeId)!.inputHash === inputHash) {
      return this.cache.get(nodeId)!.output
    }

    // Execute
    const output = await node.execute(this.buildContext(node, graph))

    // Cache
    this.cache.set(nodeId, { inputHash, output })
    return output
  }
}
```

**Why:** For a graph with 20 nodes where one parameter changed, this pattern executes ~3-5 nodes instead of all 20. This is critical for real-time preview responsiveness.

**Source:** Project architecture document (already defined), confirmed by WebSearch (TapCanvas DAG execution, Infinite Canvas dirty propagation).

### Pattern 5: Adapter-Pattern AI Gateway with Provider Abstraction

**What:** Both frontend (ai-core) and backend (AI Gateway) use the adapter pattern — the frontend has abstract `AIProvider` interface for local dispatching; the backend has its own adapter for proxy routing.

```typescript
// ─── FRONTEND: AI Core (packages/ai-core) ───
// This is the interface the NodeEngine talks to
interface AIProvider {
  readonly name: string
  textToImage(params: TextToImageParams): Promise<GenerationResult>
  imageToImage(params: ImageToImageParams): Promise<GenerationResult>
  isAvailable(): boolean
}

// ─── BACKEND: AI Gateway (apps/server) ───
// This is the proxy layer — it doesn't implement AIProvider
// Instead it routes to external APIs with API key injection
// POST /api/v1/ai/generate
//   Body: { provider: 'openai', type: 'text-to-image', params: {...} }
//   Response: SSE stream with progress + result
```

**Why:** The frontend needs a single abstract interface (so NodeEngine doesn't care about providers). The backend needs a thin proxy (to hide API keys). These are separate concerns — keep them separate.

**Source:** Project ADR-005 (already decided), confirmed by WebSearch (egoist/ai-proxy pattern).

### Pattern 6: Connection Validation Pipeline (React Flow)

**What:** Implement a multi-step connection validation pipeline rather than relying on React Flow's basic type checking.

```typescript
const isValidConnection: IsValidConnection = useCallback(
  (connection: Connection) => {
    // Step 1: Self-connection check
    if (connection.source === connection.target) return false

    // Step 2: Duplicate prevention
    if (hasExistingConnection(connection, edges)) return false

    // Step 3: Type compatibility (socket types must match)
    const sourceSocket = nodes[connection.source!]?.outputs[connection.sourceHandle!]
    const targetSocket = nodes[connection.target!]?.inputs[connection.targetHandle!]
    if (!isCompatible(sourceSocket?.type, targetSocket?.type)) return false

    // Step 4: Cycle detection (DAG must remain acyclic)
    if (wouldCreateCycle(connection, nodes, edges)) return false

    return true
  },
  [nodes, edges]
)
```

**Why:** AI generation workflows must remain acyclic (DAG) to allow topological sort. Cycle prevention at the UI level prevents runtime errors in the NodeEngine.

**Source:** Verified by WebSearch (Giselle connection validation, TapCanvas typed handles + cycle detection).

### Pattern 7: SSE Streaming for AI Generation Progress

**What:** Use Hono's `streamSSE` helper for real-time progress updates during AI generation.

```typescript
// ─── BACKEND (Hono) ───
import { streamSSE } from 'hono/streaming'

app.post('/api/v1/ai/generate', async (c) => {
  const { provider, type, params } = await c.req.json()

  // Validate + rate limit
  // ...

  return streamSSE(c, async (stream) => {
    // 1. Queued
    await stream.writeSSE({ event: 'status', data: JSON.stringify({ status: 'queued' }) })

    // 2. Processing
    await stream.writeSSE({ event: 'status', data: JSON.stringify({ status: 'processing' }) })

    // 3. Progress chunks (for long-running tasks)
    for await (const chunk of proxyToProvider(provider, type, params)) {
      await stream.writeSSE({
        event: 'progress',
        data: JSON.stringify({ progress: chunk.progress, ...chunk.data }),
      })
    }

    // 4. Complete
    await stream.writeSSE({
      event: 'complete',
      data: JSON.stringify({ url: result.url, format: result.format }),
    })
  })
})

// ─── FRONTEND ───
const eventSource = new EventSource('/api/v1/ai/generate?...')

eventSource.addEventListener('status', (e) => {
  const { status } = JSON.parse(e.data)
  useAIQueueStore.getState().updateJobStatus(jobId, status)
})

eventSource.addEventListener('progress', (e) => {
  const { progress } = JSON.parse(e.data)
  useAIQueueStore.getState().updateProgress(jobId, progress)
})

eventSource.addEventListener('complete', (e) => {
  const result = JSON.parse(e.data)
  useNodeGraphStore.getState().setNodeOutput(nodeId, result)
  eventSource.close()
})
```

**Why:** SSE is simpler than WebSocket for one-way server-to-client streaming (which AI progress is) and Hono has first-class `streamSSE` support. No need for WebSocket overhead.

**Source:** Verified by WebSearch (Hono SSE documentation, db-studio pattern, egoist/ai-proxy).

### Pattern 8: Blob-Aware History with Drag Throttling

**What:** The HistoryStore should handle both JSON state and blob references (images), and pause capture during drag operations.

```typescript
const useHistoryStore = create<HistoryStore>()((set, get) => ({
  snapshots: [],
  currentIndex: -1,
  maxSnapshots: 50,
  isPaused: false,
  mergeWindow: 180, // ms — debounce rapid changes

  captureSnapshot: () => {
    const state = get()
    if (state.isPaused) return

    // Debounce: if last snapshot within mergeWindow, replace it
    const now = Date.now()
    const lastSnapshot = state.snapshots[state.currentIndex]
    if (lastSnapshot && (now - lastSnapshot.timestamp) < 180) {
      // Replace (not append) — merges rapid changes into one snapshot
      state.snapshots[state.currentIndex] = {
        timestamp: now,
        canvas: useCanvasStore.getState().serialize(),
        nodeGraph: useNodeGraphStore.getState().serialize(),
      }
      return
    }

    // Append new snapshot, truncate if exceeded max
    set((s) => {
      s.snapshots = [
        ...s.snapshots.slice(0, s.currentIndex + 1),
        {
          timestamp: now,
          canvas: useCanvasStore.getState().serialize(),
          nodeGraph: useNodeGraphStore.getState().serialize(),
        },
      ].slice(-s.maxSnapshots)
      s.currentIndex = Math.min(s.currentIndex + 1, s.snapshots.length - 1)
    })
  },
}))
```

**Why:** Drag operations generate hundreds of intermediate states. Capturing each one would overflow the history stack and waste memory on intermediate positions that the user never meant to keep.

**Source:** Confirmed by WebSearch (Infinite Canvas: "180ms merge window", TapCanvas: "no history capture during drag").

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Monolithic Zustand Store

**What:** Putting canvas state, node graph state, AI queue, UI preferences, and history into one single `useEditorStore`.

**Why bad:** Every state update in any domain re-renders all components subscribed to the store. Canvas drag operations would re-render the properties panel, AI progress bar, toolbar, and sidebar — even if those haven't changed.

**Instead:** Split into `useCanvasStore`, `useNodeGraphStore`, `useAIQueueStore`, `useHistoryStore`, `useUIPreferencesStore` per Pattern 1.

### Anti-Pattern 2: Polling for AI Generation Status

**What:** Polling `GET /api/v1/ai/status/:id` every 1 second to check if generation is complete.

**Why bad:** Generates unnecessary HTTP requests, adds latency (best case: 1s delay to show "done"), increases server load, worse UX.

**Instead:** Use SSE streaming (Pattern 7). The server pushes status changes as they happen. No polling, no wasted requests.

### Anti-Pattern 3: Deeply Coupled Canvas-Nodes

**What:** Having the Excalidraw canvas directly depend on React Flow node types, or vice versa. E.g., importing React Flow components inside Excalidraw's renderer.

**Why bad:** Creates circular dependencies. Makes it impossible to test either module in isolation. Violates the separation of concerns between the two packages (`packages/canvas/` and `packages/node-editor/`).

**Instead:** The only bridge between canvas and nodes should be through Zustand stores and shared types (from `packages/shared/`):
- Canvas emits element selection changes to `CanvasStore`
- Node editor reads from `CanvasStore` when creating an `ImageInputNode`
- Node editor writes results to `NodeGraphStore`
- Canvas reads from `NodeGraphStore` when user clicks "Apply to Canvas"

### Anti-Pattern 4: Full Graph Re-execution on Every Change

**What:** Running topological sort + executing all nodes whenever any parameter changes, even if only one leaf node changed.

**Why bad:** For a 20-node graph, this executes 15+ unnecessary nodes per keystroke. Makes real-time preview impossibly slow. Users will complain of lag.

**Instead:** Implement dirty-path marking + caching (Pattern 4). Only execute the affected subgraph. Cache node outputs and skip if inputs haven't changed.

### Anti-Pattern 5: Custom Event Bus for Cross-Component Communication

**What:** Using a custom event emitter (`window.dispatchEvent`, `mitt`, `EventEmitter`) to pass messages between canvas, node editor, and UI components.

**Why bad:** Creates implicit dependencies that are hard to trace, debug, and test. Event names become an undocumented API surface. No TypeScript safety for event payloads.

**Instead:** Use Zustand's `getState()` for cross-store reads and `subscribe()` for cross-store reactions. All communication is explicit, typed, and visible in the store definitions.

```typescript
// ─── CORRECT: Cross-store reaction via Zustand subscribe ───
useCanvasStore.subscribe(
  (state) => state.selectedElementId,
  (selectedId) => {
    if (selectedId && isAIImage(selectedId)) {
      // When user selects an AI image on canvas, offer node editing
      useNodeGraphStore.getState().offerImageAsInput(selectedId)
    }
  }
)
```

### Anti-Pattern 6: Server-Side Rendering (SSR) for the Editor Page

**What:** Using Next.js SSR or SSG for the main editor page where the canvas and React Flow render.

**Why bad:** Excalidraw and React Flow are fully client-side rendering (CSR) — they need `window`, `canvas`, `document` APIs. SSR would either error or serve empty pages. It adds build complexity for zero benefit since the editor page has no SEO requirements.

**Instead:** Use Vite SPA (as currently planned). If a marketing/splash page is needed later, create it as a separate page or subdomain.

---

## Scalability Considerations

| Concern | At Single User (MVP) | At 100 Users | At 10K Users |
|---------|----------------------|--------------|--------------|
| **Client state** | Zustand + Immer in memory; Dexie/IndexedDB for persistence | Same (no change) | Same (no change — client-side scales per browser) |
| **AI API rate limits** | Sequential requests, mock adapter for dev | AIQueue with rate limiting per user | Distributed queue (Bull/BullMQ on Redis), per-user quota enforcement |
| **Backend AI proxy** | Hono single process, in-memory rate limiting | Scale to multiple workers behind load balancer | Consider edge deployment (Cloudflare Workers) for lower latency |
| **Database** | SQLite (better-sqlite3) — single file | SQLite still works (WAL mode) | Migrate to Cloudflare D1 (as planned in ADR-006) or PostgreSQL |
| **File storage** | Local filesystem | Local filesystem + backup | Cloudflare R2 (as planned) |
| **Node Engine** | Client-side (browser) — single user's graph | Client-side — still per-browser | Consider server-side DAG execution for complex workflows or shared templates |
| **Canvas performance** | Chunk rendering + LRU cache + Web Worker | Same | Same — scales with browser capability, not server |
| **Real-time/SSE** | Single SSE connection per user | OK per-worker | Need sticky sessions or switch to WebSocket with pub/sub (Redis) |

### Key Scalability Decision: Keep Node Engine Client-Side for MVP

**Decision:** The node execution engine runs entirely in the browser for MVP.

**Rationale:**
- No server-side graph execution means zero server load from node editing
- The browser is already doing the rendering — running the engine locally avoids network round-trips for intermediate node results
- For the foreseeable v0.1 scope (single user, <50 nodes per graph), client-side execution is more than sufficient
- Server-side execution would introduce state synchronization complexity (server renders result, sends to browser, browser renders again)

**Revisit at:** v0.3+ when cloud templates/shared workflows are introduced and node graphs grow beyond ~100 nodes.

---

## Source Hierarchies and Patterns: Synthesis

### How Real-World 2025-2026 Projects Compare to This Architecture

| Project | Our Architecture | Key Difference |
|---------|-----------------|----------------|
| **Giselle** (production AI workflow) | React Flow + Zustand split stores | Giselle uses a single `"giselle"` node type with polymorphic rendering; we register multiple node types. Trade-off: their approach simplifies ReactFlow reconciliation, ours is more explicit. |
| **TapCanvas** (polymorphic node canvas) | DAG execution + typed handles + cycle detection | TapCanvas uses magnetic snapping (96px radius) and BFS tree layout; we could adopt these in v0.2 for better DX. |
| **Infinite Canvas** (CSDN deep-dive) | Zustand + localForage + dirty propagation | They use 180ms merge window for history (we should adopt this). They also use a dual-agent system (browser agent + local agent via SSE) — we could explore this for "AI assistant" feature in v0.3. |
| **n0x** (full browser AI stack) | WebGPU inference client-side | We don't do client-side inference; we use backend proxy pattern. n0x demonstrates that full browser inference is possible (DiT + WebGPU) — may be relevant for v1.0 offline mode. |
| **Weaver** (AI ideation canvas) | React Flow + FastAPI + WebSocket | Their tree-structured conversation graph pattern is interesting but different from our DAG execution model. |

### Alignment with Project Documents

This architecture validates the design in `AI无限创意画布-项目架构文档.md` with the following specific recommendations:

1. **State split**: The architecture doc shows one "State Layer" block — we recommend splitting into 5 domain-specific Zustand stores internally (confirmed by ADR-004).
2. **Incremental execution**: The architecture doc defines the NodeEngine's topological sort + parallel execution — we add dirty-path marking and caching for performance (already mentioned in the doc's "增量执行" section).
3. **Drag performance**: The architecture doc doesn't address drag performance — we add the local-state-for-drag pattern to prevent jank.
4. **SSE pattern**: The architecture doc mentions SSE/WebSocket for progress — we specify Hono's `streamSSE` as the implementation path.
5. **Connection validation**: Not detailed in the architecture doc — we add the 4-step pipeline.

---

## Sources

### High Confidence (Context7 or Project Documents)

- Project Architecture Document (`AI无限创意画布-项目架构文档.md`) — Full architecture, module designs, directory structure
- Project ADR Document (`AI无限创意画布-技术决策记录.md`) — All 10 ADRs: Excalidraw fork, React Flow, Zustand+Immer, Adapter pattern, SQLite+D1, Vite monorepo, partition rendering, video deferral, minimal backend
- Project Plan (`AI无限创意画布项目计划书.md`) — Business requirements, feature scope, phase plan

### Medium-High Confidence (WebSearch Verified Across Multiple Sources)

- Giselle AI Workflow architecture (DeepWiki) — Zustand split stores, polymorphic node type pattern, connection validation pipeline
- TapCanvas architecture (DeepWiki) — DAG execution, typed handles, cycle detection, drag-aware history
- React Flow Guide Oct 2025 (Velt) — Zustand selector optimization, node rendering performance patterns
- Hono SSE streaming pattern (tigerabrodi.blog, egoist/ai-proxy, db-studio) — `streamSSE` helper, TransformStream piping, best practices
- Zustand state management 2025 best practices (Alibaba Cloud, Makers Den) — Split stores, local state for drag, `useShallow` selectors

### Medium Confidence (Single Source, Corroborates Known Patterns)

- Infinite Canvas project deep-dive (CSDN) — 180ms history merge window, dual agent pattern, blob management
- Browser-based AI image generation (WebNN Blog) — DiT models, WebGPU inference pipeline, ONNX runtime
- n0x full-stack browser AI (GitHub) — Client-side inference architecture with WebLLM + WebGPU
- AutoGPT PR #10922 (GitHub) — Split node/edge Zustand stores for better data isolation
