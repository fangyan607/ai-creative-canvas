# Roadmap: AI Unlimited Creative Canvas (AI无限创意画布)

## Overview

From foundation to full creative tool: we start by establishing the infinite canvas as the core rendering surface (Excalidraw fork with chunk rendering, element management, and IndexedDB persistence). Then we layer on the visual node editor (React Flow integration, 5 node types, parameter panel), followed by the DAG execution engine that makes nodes compute. With the editing pipeline in place, we integrate AI generation through a clean adapter pattern (OpenAI, Stability, MockAdapter) with BYOK support, then add the execution infrastructure (queue, EventEmitter progress, engine bridge). A lightweight Hono backend provides AI proxy and file services. The application UI phase wraps everything in a polished shell with project management, export, and settings. Finally, we lock in quality with comprehensive testing.

## Phases

- [x] **Phase 1: Core Canvas** - Excalidraw fork with infinite canvas, element management, undo/redo, chunk rendering, and IndexedDB persistence (completed 2026-06-29)
- [ ] **Phase 2: Node Editor Interface** - React Flow integration with 5 node types, drag-connect, parameter panel, and graph serialization
- [ ] **Phase 3: Node Engine** - Topological sort execution, parallel/incremental DAG execution, node undo/redo, and sub-group support
- [ ] **Phase 4: AI Adapters** - OpenAI and Stability.ai adapters, MockAdapter, BYOK mode, and Prompt builder system
- [x] **Phase 5: AI Execution Infrastructure** - Request queue with rate limiting, EventEmitter progress streaming, and node-engine-to-AI bridge (completed 2026-07-01)
- [ ] **Phase 6: Backend Services** - Hono-based AI proxy API and file upload/download service
- [ ] **Phase 7: Application UI** - Toolbar/sidebar/panel shell, canvas export, project management page, and settings page
- [ ] **Phase 8: Testing & Performance** - Node engine unit tests, AI adapter mock tests, core E2E flow tests

## Phase Details

### Phase 1: Core Canvas
**Goal**: Users have a performant, persistent infinite canvas with full element management
**Depends on**: Nothing (first phase)
**Requirements**: CANVAS-01, CANVAS-02, CANVAS-03, CANVAS-04, CANVAS-05, CANVAS-06
**Success Criteria** (what must be TRUE):
  1. User can pan, zoom, draw basic shapes, and drag elements freely on an infinite canvas
  2. User can manage element layers (reorder, group, lock, hide) with visual feedback
  3. User can undo/redo all canvas operations (draw, move, delete, layer change)
  4. User can save a project to IndexedDB and reload it to restore exact canvas state
  5. Canvas maintains smooth 60fps with 500+ elements rendered (chunk rendering active)
**Plans**: 6 plans in 4 waves
**UI hint**: yes
**Plan list:**
- [x] 01-01-PLAN.md — Monorepo foundation: pnpm workspace, vendored Excalidraw fork, shared types, Vite 8 SPA skeleton
- [x] 01-02-PLAN.md — Stores & AIElement: CanvasStore, HistoryStore, AIElement type in Excalidraw, store stubs, tests
- [x] 01-03-PLAN.md — Canvas bridge: CanvasWrapper (Excalidraw + Zustand), App integration, keyboard undo/redo
- [x] 01-04-PLAN.md — Layer panel: CanvasStore layer ordering, LayerPanel component with reorder/lock/hide/group
- [x] 01-05-PLAN.md — Performance: chunk rendering (2000x2000px), resolution-tiered AIElement, LRU image cache (200MB)
- [x] 01-06-PLAN.md — Persistence: Dexie.js IndexedDB, project save/load, auto-save (180ms), Save/Save As UI

### Phase 2: Node Editor Interface
**Goal**: Users can visually create and connect a node-based editing workflow on the canvas
**Depends on**: Phase 1
**Requirements**: NODE-01, NODE-02, NODE-04, NODE-05
**Success Criteria** (what must be TRUE):
  1. User can drag 5 node types (PromptNode, TextToImageNode, StyleNode, MergeNode, PreviewNode) onto the editor and position them freely
  2. User can connect node output sockets to compatible input sockets with visible wires
  3. User can select a node and see/edit all its parameters in the right-side parameter panel
  4. User can save a node graph layout and reload it with all nodes, wires, and positions restored
**Plans**: 5 plans in 4 waves
**UI hint**: yes
**Plan list:**
- [x] 02-01-PLAN.md — Contracts + branding: shared node graph types, coordinate transforms, Chinese README, Excalidraw sync check (Wave 1)
- [x] 02-02-PLAN.md — NodeGraphStore: full Zustand+Immer store with tests, delete stub (Wave 2)
- [x] 02-03-PLAN.md — Node editor package: @ac-canvas/node-editor, 5 node components, ConnectionValidator (Wave 2)
- [x] 02-04-PLAN.md — Interactive UI: NodeEditorOverlay, PropertyPanel, FocusModeToggle, TemplateDialog (Wave 3)
- [x] 02-05-PLAN.md — Integration: persistence, HistoryStore, App.tsx layout wiring, checkpoint verification (Wave 4)

### Phase 3: Node Engine
**Goal**: Node graphs execute in correct topological order with incremental updates and organizational structure
**Depends on**: Phase 2
**Requirements**: NODE-03, NODE-06, NODE-07
**Success Criteria** (what must be TRUE):
  1. After connecting nodes and triggering execution, the engine processes nodes in correct topological order and completes all downstream nodes
  2. Changing one node's parameter re-executes only the affected downstream path (dirty-path marking), not the entire graph
  3. User can group nodes into named sub-groups to organize complex graphs, with collapse/expand
  4. Node graph operations (add, delete, connect, disconnect) support undo/redo alongside canvas undo/redo
**Plans**: 5 plans in 3 waves
**UI hint**: yes
**Plan list:**
- [x] 03-01-PLAN.md — Types & Contracts: parentId, GroupNodeData, ExecutionStatus, engine type system (Wave 1)
- [x] 03-02-PLAN.md — Engine Core: toExecutionLayers, findAffectedDownstream, NodeEngine, EngineStore, stub resolvers, unit tests (Wave 2)
- [x] 03-03-PLAN.md — GroupNode + Status UI: GroupNode component with collapse/expand, BaseNode status indicator (Wave 2)
- [x] 03-04-PLAN.md — Store Extensions: NodeGraphStore group CRUD, HistoryStore engine state (Wave 2)
- [x] 03-05-PLAN.md — Wiring + Verification: useAutoExecute, NodeEditorOverlay integration, App.tsx, checkpoint (Wave 3)

### Phase 4: AI Adapters
**Goal**: System generates images through multiple AI providers via a clean adapter pattern with user-owned keys
**Depends on**: Nothing (can be developed in parallel with Phases 2-3)
**Requirements**: AI-01, AI-02, AI-03, AI-05, AI-06
**Success Criteria** (what must be TRUE):
  1. User can select an AI provider (MockAdapter, OpenAI DALL-E 3, or Stability.ai) from a dropdown and generate a text-to-image result
  2. User can configure a custom API key and base URL for each provider (BYOK mode)
  3. User can use provided prompt templates to construct effective generation prompts with variable substitution
  4. Changing between AI providers does not require code changes or restarts (adapter interface is stable)
  5. While offline or during development, MockAdapter returns realistic test images without any API call
**Plans**: 6 plans in 2 waves
**Plan list:**
- [x] 04-01-PLAN.md — Foundation: packages/ai-core package, types, AiAdapter abstract class, AdapterRegistry, contract tests (Wave 1)
- [x] 04-02-PLAN.md — MockAdapter: offline canvas-rendered image generator with dual-mode fallback (Wave 2)
- [x] 04-03-PLAN.md — OpenAI DALL-E 3 adapter: direct fetch() with error sanitization (Wave 2)
- [x] 04-04-PLAN.md — Stability.ai adapter: dual v1/v2beta API dispatch with image-to-image (Wave 2)
- [x] 04-05-PLAN.md — ProviderStore: BYOK config with Web Crypto encrypted IndexedDB storage (Wave 2)
- [x] 04-06-PLAN.md — Template engine + prompt templates: tempura-based rendering with 4-source variable resolution (Wave 2)

### Phase 5: AI Execution Infrastructure
**Goal**: AI tasks flow from the node engine through a managed queue with real-time progress streaming back to the canvas
**Depends on**: Phase 4, Phase 3
**Requirements**: AI-04, AI-07, AI-08
**Success Criteria** (what must be TRUE):
  1. Multiple AI requests queue and execute sequentially within configured rate limits (no concurrent overrun per D-02/D-03)
  2. User sees real-time generation progress via node status indicators driven by EventEmitter events (queued -> executing -> done/error per D-05)
  3. TextToImageNode and StyleNode correctly pass their parameters through the engine bridge to AI adapters and receive results back (no auto-placement per D-06; PreviewNode Apply controls canvas placement)
**Plans**: 3 plans in 3 waves
**Plan list:**
- [x] 05-01-PLAN.md — Rate limiter utility (sliding window, hardcoded defaults) + ImageBlobStore (in-memory MVP) (Wave 1)
- [x] 05-02-PLAN.md — AIQueueStore (per-provider queues, rate limiter integration, serial execution loop) + EngineStore queue state extension (Wave 2)
- [x] 05-03-PLAN.md — Engine-AI bridge factory (createAiExecutor) + ProviderStore singleton + Dexie backend + resolver swap + App.tsx bootstrap (Wave 3)

### Phase 6: Backend Services
**Goal**: Backend proxies AI requests to hide client-side API keys and handles file storage
**Depends on**: Nothing (independent service; can be developed anytime)
**Requirements**: BKND-01, BKND-02
**Success Criteria** (what must be TRUE):
  1. Client sends AI generation requests through the backend proxy; API keys remain server-side only
  2. User can upload image files to the backend and download them later
  3. Frontend works in both direct-API-key mode (dev) and backend-proxy mode (production) with a configuration toggle
**Plans**: 2 plans in 2 waves
**Plan list:**
- [ ] 06-01-PLAN.md — Backend infrastructure: Hono app factory, SSE broadcast/AI proxy/file upload routes, tests (Wave 1)
- [ ] 06-02-PLAN.md — Frontend integration: Vite proxy, SSEService, useSSEProgress hook, proxy mode in aiBridge (Wave 2)

### Phase 7: Application UI
**Goal**: Complete application experience with project management, export, and configuration
**Depends on**: Phase 1, Phase 5 (needs working canvas and AI pipeline for full integration)
**Requirements**: UI-01, UI-02, UI-03, UI-04
**Success Criteria** (what must be TRUE):
  1. User sees a consistent application shell with toolbar, resizable sidebar, and asset panel
  2. User can create a new project, browse a project list, open an existing project, save changes, and delete projects
  3. User can export the current canvas as PNG or JPG with configurable resolution
  4. User can navigate to a settings page and configure AI API keys, default provider, and other preferences
**Plans**: TBD

### Phase 8: Testing & Performance
**Goal**: Critical paths and edge cases are covered by automated tests
**Depends on**: Phase 3 (node engine tests), Phase 4 (AI adapter tests), Phase 5/7 (E2E flow)
**Requirements**: TEST-01, TEST-02, TEST-03
**Success Criteria** (what must be TRUE):
  1. Node engine unit tests pass: topological sort handles linear, branched, and cyclic graphs; dirty-path marking correctly identifies affected nodes
  2. AI adapter mock tests pass: each provider adapter returns expected output shapes; MockAdapter returns valid test images
  3. Core E2E flow passes: create project -> add nodes -> connect nodes -> trigger AI generation -> see result on canvas -> export as PNG
  4. All tests run in CI without external API calls or network dependencies
**Plans**: TBD

## Progress

**Execution Order:** Phases execute in numeric order (1 through 8). Phases 4 and 6 have no dependency on prior phases and could be parallelized if needed.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Core Canvas | 6/6 | Complete    | 2026-06-29 |
| 2. Node Editor Interface | 0/5 | Not started | - |
| 3. Node Engine | 0/5 | Not started | - |
| 4. AI Adapters | 0/6 | Not started | - |
| 5. AI Execution Infrastructure | 3/3 | Complete    | 2026-07-01 |
| 6. Backend Services | 0/2 | Not started | - |
| 7. Application UI | 0/0 | Not started | - |
| 8. Testing & Performance | 0/0 | Not started | - |
