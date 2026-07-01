# Phase 5: AI Execution Infrastructure - Research

**Researched:** 2026-07-01
**Domain:** AI execution queue, rate limiting, engine-adapter bridge, progress feedback
**Confidence:** HIGH

## Summary

Phase 5 builds the bridge between the Node Engine (Phase 3) and the AI Adapters (Phase 4). The engine currently executes stub resolvers that return placeholder data. This phase replaces the `text-to-image` and `style` resolvers with real async adapters, backed by a per-provider queuing system with sliding-window rate limiting, frontend-only progress events (via EventEmitter, not SSE), and fail-stop error handling. The AIQueueStore is the central new piece: a Zustand store managing per-provider job queues, rate limiter state, and job lifecycle.

**Primary recommendation:** Build in this order: (1) Rate limiter utility (pure function, testable without Zustand), (2) AIQueueStore (per-provider queues, integrates rate limiter), (3) AI bridge resolvers (swaps stub executors for real adapter calls with EventEmitter progress wiring), (4) Adapter bootstrap and integration wiring in App.tsx.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01: 纯前端进度模式** — Phase 5 does not implement SSE server push. Adapters drive engine state updates directly via EventEmitter `'progress'`/`'error'`/`'done'` events in the browser. Engine state already supports `queued` -> `executing` -> `done`/`error` flow (Phase 3 D-03 node status indicators). Adapter EventEmitter progress events (`percent`, `stage`) map to engine execution stage visual feedback. This is a temporary state; Phase 6 backend will add a real Hono streamSSE endpoint and frontend EventSource client, requiring no changes to the engine and adapter layers.
- **D-02: 按 provider 分队列** — Each AI provider has an independent request queue. `AIQueueStore` manages multiple sub-queues (`Map<providerId, AIJob[]>`). One provider's slow request or rate limiting does not affect other providers. Queues execute in FIFO order (no priority in MVP). Same-provider requests execute serially (only one request within the hardcoded rate limit window). Queue state is stored in `useAIQueueStore` (replacing the existing stub).
- **D-03: 硬编码默认限流值** — Code-hardcoded per-provider rate limits, invisible and not user-configurable. OpenAI DALL-E 3: 5 requests/minute. Stability.ai: 10 requests/minute. MockAdapter: unlimited (rate: Infinity). Defined in `packages/ai-core/src/config/rateLimits.ts`, indexed by `providerId`. Rate limiter uses a sliding window algorithm, recording each provider's timestamp queue. When rate limited, requests remain in the queue waiting for the window to reset.
- **D-04: 失败即停，不自动重试** — AI execution failure follows Phase 3 D-04 fail-stop pattern. Node marked `error`, error stored in EngineStore. Downstream nodes marked `skipped`. Execution stops. No automatic retry, even for `rate_limit` or `server_error` errors. User fixes and re-triggers execution. Adapter's `AiAdapterError.code` (`'auth_failed'`, `'rate_limited'`, `'server_error'`, `'invalid_params'`) is stored in EngineStore for user viewing.
- **D-05: 节点状态指示器即进度反馈** — User perceives generation progress through Phase 3 node status indicators (border color + corner badge). `queued` (blue) -> `executing` (amber animated) -> `done` (green) -> `error` (red). Node status is driven by EngineStore, adapter progress events update EngineStore state. No additional progress panel, Toast notification, or global progress bar needed. If the Phase 5 team believes adapter percent/stage details are worth exposing, they can be shown via node tooltips.
- **D-06: PreviewNode Apply 按钮放置** — Generated images do NOT auto-place on the canvas. Generation results pass to PreviewNode (via engine output). PreviewNode property panel shows generated image preview. User clicks "Apply to Canvas" (designed in Phase 2 D-38) to place the image as an AIElement on the canvas. Placement position either user-dragged from PreviewNode output or a default offset position on Apply. Maintains the "user full control" product philosophy.
- **D-07: 只替换 text-to-image 和 style resolver** — Engine bridge only replaces these two node resolvers that directly call AI adapters. text-to-image: replaces current stub with real AI adapter call (query AdapterRegistry for node's provider, read API config from ProviderStore, build prompt via TemplateEngine, call adapter.execute(), return `{ imageBlobId, width, height, seed, model, timing }`). style: similar bridge logic with upstream image + style preset, results `{ imageBlobId, stylePreset, ...AdapterResult }`. prompt/merge/preview: keep existing stub behavior (prompt passthrough, merge stub, preview passthrough).

### Claude's Discretion
- AIQueueStore's specific data structure (Job type containing providerId, nodeId, params, etc.)
- Rate limiter sliding window implementation details (timestamp queue deduplication, window boundary handling)
- Engine-AI bridge code placement (new file `apps/web/src/engine/aiBridge.ts` or directly modifying `resolvers.ts`)
- How adapter progress events map to EngineStore node status update granularity
- "Apply to Canvas" button's AIElement default position offset value
- Concurrency limit: same-provider queue serialization strategy (await previous completion before starting next)

### Deferred Ideas (OUT OF SCOPE)
- SSE server push (Phase 6 backend adds real Hono streamSSE endpoint)
- User-configurable rate limits (consider exposing in settings after MVP)
- Automatic retry on failure (can be added as configurable behavior in the future)
- Global progress panel (consider in Phase 7 UI phase)
- Manual queue control (pause, cancel, reorder priority) — future enhancement
- Fully automatic image placement (conflicts with Phase 5's "user control" philosophy)
- Merge node real merge logic (keep stub, can be replaced with canvas-level merge in the future)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AI-04 | AI request queue + rate limiting | Per-provider FIFO queues in AIQueueStore, sliding-window rate limiter at `packages/ai-core/src/config/rateLimits.ts`, hardcoded defaults per D-03 |
| AI-07 | SSE progress streaming (Phase 5: EventEmitter frontend-only) | Adapter EventEmitter `'progress'`/`'error'`/`'done'` events wired directly to EngineStore node status updates. True Hono streamSSE deferred to Phase 6 per D-01. |
| AI-08 | Engine-adapter bridge | Replace `text-to-image` and `style` resolvers in `resolvers.ts` with real adapter calls via AIQueueStore. Bridge reads ProviderStore for API config, uses TemplateEngine for prompt building, calls adapter.execute() and returns ExecutorOutput. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Extracted from `j:\ai-creative-canvas/CLAUDE.md`:

**Tech Stack:**
- Full-stack TypeScript -- unified language for lower context-switching
- MVP storage: IndexedDB local, no cloud
- AI: MVP only 2-3 commercial APIs via adapter pattern, no video generation
- Deployment: Web-first, browser SPA + Hono lightweight backend
- Performance: Canvas must support 500+ elements smoothly
- Budget: Personal project, prioritize free/low-cost solutions, AI API uses Mock mode for dev/debug

**Stack specifics (relevant to Phase 5):**
- React 19.2.7, @xyflow/react 12.11.1, Zustand 5.0.12 + Immer 11.1.8
- TailwindCSS 4.3.1, Vite 8.0.x, pnpm 11.8.0
- Node 24 LTS required, Zod 4.4.3 for validation (if needed)
- Vitest 4.1.x for testing with jsdom environment

**GSD Workflow:** Before using Edit/Write, start work through a GSD command (`/gsd-quick`, `/gsd-debug`, `/gsd-execute-phase`) so planning artifacts and execution context stay in sync.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand | 5.0.12 | AIQueueStore state management | All existing stores use Zustand+Immer. New AIQueueStore follows same pattern as EngineStore, NodeGraphStore, CanvasStore for unified state architecture. |
| eventemitter3 | ^5.0.4 | Adapter progress event transport | AiAdapter base class extends EventEmitter. Phase 5 bridge subscribes to its `'progress'`, `'error'`, `'done'` events. Already a dependency of `@ac-canvas/ai-core`. |
| tempura | ^0.4.1 | Template rendering | TemplateEngine uses tempura for Handlebars-compatible template rendering. Bridge uses `renderPrompt()` to construct final prompts. Already a dependency of `@ac-canvas/ai-core`. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| eventemitter3 | ^5.0.4 | Memory-safe listener cleanup | Bridge must remove EventEmitter listeners after each execution to prevent memory leaks from repeated node executions (see Specific Ideas in CONTEXT.md). |
| Vitest | ^4.1.x | Unit testing | Rate limiter (pure function), AIQueueStore, and bridge all need unit tests. `jsdom` environment in `apps/web` may need `fake-indexeddb` for ProviderStore integration tests. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Per-provider per-store queue | Global FIFO queue | Global FIFO would block one provider's requests while another provider is rate-limited. Rejected by D-02. |
| Zustand + Immer for AIQueueStore | Redux Toolkit | Adds ~14KB bundle overhead. All existing stores use Zustand; consistency wins. |
| Inline EventEmitter subscription | Centralized event bus | Adds indirection. Adapter already extends EventEmitter; direct subscription is simplest. |

**Installation:**
```bash
# All needed dependencies already installed by Phase 4:
# eventemitter3, tempura are in packages/ai-core/package.json
# Zustand is in apps/web/package.json (from Phase 1)
```

**Version verification:** All packages confirmed installed — eventemitter3 ^5.0.4, tempura ^0.4.1, Zustand 5.0.12.

## Architecture Patterns

### Recommended Project Structure (additions to existing)

```
apps/web/src/
├── engine/
│   ├── NodeEngine.ts          # EXISTING — no changes needed
│   ├── resolvers.ts           # EXISTING — replace text-to-image & style entries
│   ├── types.ts               # EXISTING — Executor type supports async natively
│   ├── aiBridge.ts            # NEW — bridge factory that produces executor functions
│   │                           #   wrapping adapter instantiation + prompt building
│   │                           #   + progress event wiring + result mapping
│   └── __tests__/
│       ├── NodeEngine.test.ts # EXISTING
│       └── aiBridge.test.ts   # NEW — bridge unit tests
├── stores/
│   ├── engineStore.ts         # EXISTING — extend isExecuting semantics for queue state
│   ├── stubs/
│   │   └── aiQueueStore.ts    # REPLACE — full AIQueueStore implementation
│   └── __tests__/
│       └── aiQueueStore.test.ts  # NEW
├── hooks/
│   ├── useAutoExecute.ts      # EXISTING — no changes (engine resolvers provided externally)
│   └── useAIQueue.ts           # NEW — bridge wiring hook (optional, could inline in App.tsx)
├── App.tsx                    # EXISTING — add adapter registry bootstrap
└── indexedb/
    └── db.ts                  # EXISTING — optionally extend for blob storage or queue state

packages/ai-core/src/config/
├── providerStore.ts           # EXISTING — bridge reads API config
├── encryption.ts              # EXISTING — key decryption
├── rateLimits.ts              # NEW — hardcoded rate limit definitions + sliding window
└── __tests__/
    └── rateLimits.test.ts     # NEW

packages/ai-core/src/
├── registry.ts                # EXISTING — bridge queries get(providerId)
├── index.ts                   # EXISTING — may need to export rateLimits
└── interfaces/
    ├── AiAdapter.ts           # EXISTING — EventEmitter-based base class
    └── types.ts               # EXISTING — AdapterResult, AiAdapterError types
```

### Pattern 1: Per-Provider Queue with Rate Limiter Integration

**What:** Each provider has its own FIFO queue managed by AIQueueStore. Before dequeuing a job, the rate limiter is checked. If allowed, the job executes via the bridge. If rate-limited, the job stays queued until the window resets.

**When to use:** Default for all AI provider requests in Phase 5. Matches D-02 and D-03.

**Data flow:**
```
NodeEngine execute() -> resolver for text-to-image
  -> AIQueueStore.enqueue({ providerId, nodeId, params })
  -> AIQueueStore internally: check rate limiter for providerId
     -> if allowed: dequeue -> call bridge(providerId, nodeData)
        -> bridge: instantiate adapter via AdapterRegistry.get(providerId)
        -> bridge: read API config via ProviderStore.getApiKey()
        -> bridge: build prompt via TemplateEngine.renderPrompt()
        -> bridge: call adapter.execute(nodeData, inputs, onStoreImage)
        -> adapter: emits 'progress' events
        -> bridge: subscribes to 'progress', updates EngineStore.setNodeStatus()
        -> adapter: returns AdapterResult
        -> bridge: maps to ExecutorOutput format
        -> queue processes next job
     -> if rate-limited: job remains queued
        -> set timer for when window resets
        -> when timer fires, recheck
```

### Pattern 2: AI Bridge as Resolver Factory

**What:** A factory function `createAiExecutor(providerId)` that returns an `Executor` function matching the existing `Executor` type signature `(nodeData, inputs) => Promise<ExecutorOutput>`. The returned executor handles all adapter lifecycle internally.

**Source:** Inspired by the Specific Ideas in CONTEXT.md: "AI bridge as resolver factory -- The bridge should be a function that takes (providerId, nodeData) and returns an Executor function."

**Example structure:**
```typescript
// apps/web/src/engine/aiBridge.ts
import { AdapterRegistry } from '@ac-canvas/ai-core'
import { ProviderStore } from '@ac-canvas/ai-core/config/providerStore'
import { renderPrompt } from '@ac-canvas/ai-core/prompt/templateEngine'
import { useEngineStore } from '../stores/engineStore'
import type { Executor, ExecutorOutput } from './types'

export function createAiExecutor(providerId: string): Executor {
  return async (nodeData, inputs) => {
    // 1. Find adapter constructor
    const AdapterClass = AdapterRegistry.getInstance().get(providerId)
    if (!AdapterClass) throw new Error(`No adapter for provider: ${providerId}`)

    // 2. Read provider config (needs ProviderStore instance - DI or singleton)
    const apiKey = await providerStore.getApiKey(providerId)
    // ...

    // 3. Build prompt via TemplateEngine
    const finalPrompt = renderPrompt(templateString, {
      params: nodeData,
      upstream: inputs,
    })

    // 4. Instantiate adapter
    const adapter = new AdapterClass({ apiKey, baseUrl })

    // 5. Wire progress events - update EngineStore
    const nodeId = (nodeData as any).__nodeId // injected by engine
    adapter.on('progress', ({ percent, stage }) => {
      useEngineStore.getState().setNodeStatus(nodeId, 'executing')
      // Optionally store stage info for tooltip
    })

    // 6. Execute
    const result = await adapter.execute(nodeData, inputs, storeImageCallback)

    // 7. Clean up listeners
    adapter.removeAllListeners()

    // 8. Return ExecutorOutput
    return {
      imageBlobId: result.imageBlobId,
      width: result.width,
      height: result.height,
      seed: result.seed,
      model: result.model,
      timing: result.timing,
    } as ExecutorOutput
  }
}
```

### Pattern 3: Sliding Window Rate Limiter (Pure Function)

**What:** A pure function + a timestamp queue manager. The rate limiter stores a deque of timestamps per provider. On each check: prune timestamps outside the window, count remaining, compare with the rate limit.

**Source:** CONTEXT.md specifics: "Rate limiter as a standalone utility -- `packages/ai-core/src/config/rateLimits.ts` with a pure function `checkRateLimit(providerId, timestamps[]): { allowed, waitMs }` -- testable without Zustand."

**Example:**
```typescript
// packages/ai-core/src/config/rateLimits.ts
export const DEFAULT_RATE_LIMITS: Record<string, { rate: number; windowMs: number }> = {
  openai:    { rate: 5,  windowMs: 60000 },
  stability: { rate: 10, windowMs: 60000 },
  mock:      { rate: Infinity, windowMs: 60000 },
}

export function checkRateLimit(
  providerId: string,
  timestamps: number[],
  now: number = Date.now(),
): { allowed: boolean; waitMs: number } {
  const limits = DEFAULT_RATE_LIMITS[providerId]
  if (!limits || limits.rate === Infinity) {
    return { allowed: true, waitMs: 0 }
  }

  const windowStart = now - limits.windowMs
  const recent = timestamps.filter(t => t > windowStart)

  if (recent.length < limits.rate) {
    return { allowed: true, waitMs: 0 }
  }

  // Wait until the oldest timestamp in the window expires
  const oldestInWindow = recent[0]
  const waitMs = oldestInWindow + limits.windowMs - now
  return { allowed: false, waitMs: Math.max(waitMs, 0) }
}
```

### Anti-Patterns to Avoid
- **Global FIFO queue:** Rejected by D-02. Per-provider queues are locked. Do not design for global.
- **Auto-retry on failure:** Rejected by D-04. Fail-stop is locked. Do not implement retry logic.
- **Storing timestamps in Zustand:** Rate limiter timestamps must survive across the lifetime of queued jobs. Zustand state resets on page reload are acceptable (queue clears on page reload). However, timestamps should be in-memory (Zustand OK) not persisted to IndexedDB.
- **Memory leaks from EventEmitter subscriptions:** Each bridge execution creates a new adapter instance with event listeners. Use `adapter.removeAllListeners()` in a `finally` block after `execute()` completes, or use single-use listeners (`adapter.once('done', ...)` + manual cleanup).
- **Leaking adapter instances:** Create a new adapter instance per execution. Do not cache adapter instances -- they hold EventEmitter references and config that may change. Per Specific Ideas: "After bridge execution, clean up EventEmitter listeners to prevent memory leaks."

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Progress event transport | Custom event system | eventemitter3 (already in ai-core deps) | AiAdapter already extends EventEmitter. Bridge subscribes directly. Adding another abstraction layer adds complexity for zero gain. |
| Template rendering | Handlebars or regex variable substitution | tempura (already in ai-core deps) | TemplateEngine already uses tempura. Bridge calls `renderPrompt()` or `renderTemplate()`. |
| Per-provider queue serialization | Complex promise chain orchestration | Simple async loop with await | Each provider queue processes one job at a time. `async nextJob() { while (jobs.length) { await executeJob(jobs.shift()) } }` is sufficient. Complex semaphore/worker patterns are overkill. |
| RSA/AES encryption | Custom encryption | Web Crypto API via `packages/ai-core/src/config/encryption.ts` | Already implemented. Bridge reads decrypted API key via `ProviderStore.getApiKey()`. |

**Key insight:** Everything Phase 5 needs already exists as building blocks. The bridge is wiring these blocks together, not creating new infrastructure.

## Common Pitfalls

### Pitfall 1: EventEmitter Memory Leak from Repeated Node Executions
**What goes wrong:** Each time a node executes, the bridge creates a new adapter instance and subscribes to its events. If listeners are not cleaned up, each node execution leaks one set of listeners. After 1000 executions of the same node, 1000 stale listener sets exist.
**Why it happens:** The adapter is instantiated fresh in each `Executor` call, but the executor itself may be reused. If listeners are added but never removed, they accumulate.
**How to avoid:** Always remove listeners in a `finally` block after `adapter.execute()` completes (success or error). Use `adapter.removeAllListeners()` or track specific listener references.
**Warning signs:** Node executions slowing down over time, memory growth in browser devtools.

### Pitfall 2: Race Condition Between Queue Dequeue and Rate Limiter Window Reset
**What goes wrong:** A job is rate-limited, so the queue waits `waitMs` milliseconds. But by the time the timer fires, another job may have already consumed the available slot.
**Why it happens:** Multiple concurrent timer callbacks for the same provider queue can race.
**How to avoid:** Process the queue serially. After a job completes or a rate-limit wait fires, always recheck the rate limiter before dequeuing the next job. Never schedule timers aggressively; instead, poll on completion of each job. Simpler: after a job completes (or a wait timer fires), re-enter the queue processing loop which rechecks rate limits.
**Warning signs:** API rate limit errors (`429`) despite the rate limiter, queue processing out of order.

### Pitfall 3: EngineStore Node Status Overwrites During Queue Delay
**What goes wrong:** When a node is queued but waits for rate limiting, its status is set to `queued` (blue). If the user makes a graph change during the wait, the auto-execute triggers, marking the node `idle`. But the queued job is still in-flight and may later set the status back to `executing`, creating confusion.
**Why it happens:** Queued jobs hold references to node IDs and update EngineStore asynchronously. Graph changes during queue processing can cause stale node status updates.
**How to avoid:** AIQueueStore should check if the node still exists in the graph before updating its status. After each queue job processes, verify the node ID is still in the current graph topology. Alternatively, use an execution ID or cancel stale jobs on graph change.
**Warning signs:** Node status flickers between states, "ghost" execution indicators on deleted nodes.

### Pitfall 4: Adapter Instance Leaks Across Re-Renders
**What goes wrong:** If the bridge factory is called inside a React effect or render, adapter instances are created and discarded on every re-render, potentially creating thousands of short-lived adapter objects.
**Why it happens:** The `Executor` function is called by the NodeEngine (not React). But if the bridge factory that creates executors is called inside a React component, it may recreate executors on re-render.
**How to avoid:** Create bridge executors once (at app bootstrap or in `useAutoExecute` setup), not in render paths. The `createDefaultResolvers()` pattern is already correct; just extend it with the bridge. Executors are stable function references, not recreated per render.
**Warning signs:** High garbage collection pressure, thousands of AiAdapter instances in heap snapshots.

### Pitfall 5: onStoreImage Callback Without Concrete Blob Storage
**What goes wrong:** The adapter's `execute()` expects an `onStoreImage` callback to persist generated image blobs. If the bridge does not provide one, the adapter falls back to generating placeholder IDs, and the generated image data is lost.
**Why it happens:** Phase 4 designed the `onStoreImage` callback pattern but Phase 1's blob storage is a pattern, not a concrete API. There is no `blobService.store(blob)` function yet.
**How to avoid:** The bridge must implement the `onStoreImage` callback. Options: (a) inline IndexedDB blob storage using the existing Dexie database, (b) an in-memory Map<string, Blob> (acceptable for MVP since blobs are shown immediately and can be lazy-loaded). The callback signature is `(blob: Blob) => Promise<string>` where the returned string is the blob ID.
**Warning signs:** Generated images show placeholder mock IDs instead of real image data, `isStub: true` in results.

## Code Examples

### Pattern: AIQueueStore Structure (based on existing Zustand store patterns)

```typescript
// Source: Based on EngineStore pattern (apps/web/src/stores/engineStore.ts) + CONTEXT.md D-02
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { checkRateLimit, DEFAULT_RATE_LIMITS } from '@ac-canvas/ai-core/config/rateLimits'
import type { Executor } from '../engine/types'

export interface AIJob {
  id: string
  nodeId: string
  providerId: string
  executor: Executor
  nodeData: Record<string, unknown>
  inputs: Record<string, unknown>
  status: 'queued' | 'executing' | 'done' | 'error'
  queuedAt: number
  error?: string
}

export interface AIQueueStoreState {
  queues: Record<string, AIJob[]>  // providerId -> job[]
  timestamps: Record<string, number[]>  // providerId -> execution timestamp array

  enqueue: (providerId: string, job: Omit<AIJob, 'id' | 'status' | 'queuedAt'>) => void
  processQueue: (providerId: string) => Promise<void>
  cancelAll: () => void
}

export const useAIQueueStore = create<AIQueueStoreState>()(
  immer((set, get) => ({
    queues: {},
    timestamps: {},

    enqueue: (providerId, job) => set((state) => {
      const fullJob: AIJob = {
        ...job,
        id: crypto.randomUUID(),
        status: 'queued',
        queuedAt: Date.now(),
      }
      if (!state.queues[providerId]) state.queues[providerId] = []
      state.queues[providerId].push(fullJob)
    }),

    processQueue: async (providerId) => {
      // Serial processing per D-02: one job at a time per provider
      while (true) {
        const state = get()
        const queue = state.queues[providerId] ?? []
        if (queue.length === 0) return

        // Check rate limit
        const { allowed, waitMs } = checkRateLimit(
          providerId,
          state.timestamps[providerId] ?? [],
        )

        if (!allowed) {
          // Wait and retry
          await new Promise(resolve => setTimeout(resolve, waitMs))
          continue
        }

        // Dequeue next job
        const job = queue[0]
        set((s) => { s.queues[providerId] = queue.slice(1) })

        // Execute
        try {
          const result = await job.executor(job.nodeData, job.inputs)
          // Record timestamp
          set((s) => {
            if (!s.timestamps[providerId]) s.timestamps[providerId] = []
            s.timestamps[providerId].push(Date.now())
          })
        } catch (err) {
          // D-04: fail-stop, error handled by EngineStore
          console.error(`[AIQueue] Job ${job.nodeId} failed:`, err)
        }
      }
    },

    cancelAll: () => set((state) => {
      state.queues = {}
    }),
  })),
)
```

### Pattern: Bridge Resolver Integration

```typescript
// Source: apps/web/src/engine/resolvers.ts modification pattern + CONTEXT.md D-07
// This replaces the text-to-image and style entries in createDefaultResolvers()

import { createAiExecutor } from './aiBridge'

export function createDefaultResolvers(): ExecutorResolver {
  const resolvers: ExecutorResolver = new Map()

  // ... prompt, merge, preview stubs remain unchanged ...

  // text-to-image: replaced with real adapter call
  resolvers.set('text-to-image', createAiExecutor('openai') as Executor)
  // Note: actual providerId should be read from nodeData.model at runtime
  // The bridge factory should dynamically resolve providerId from nodeData

  // style: replaced with real adapter call
  resolvers.set('style', createAiExecutor('stability') as Executor)

  return resolvers
}
```

### Pattern: EngineStore Queue State Extension

```typescript
// Source: apps/web/src/stores/engineStore.ts — extending for Phase 5
// Add to EngineStoreState interface:
queuedNodeIds: string[]  // Track which nodes are currently queued
setQueuedNodeIds: (ids: string[]) => void
```

### Pattern: Adapter Bootstrap in App.tsx

```typescript
// Source: apps/web/src/App.tsx — mount-time adapter registration
import { AdapterRegistry } from '@ac-canvas/ai-core'
import { MockAdapter, OpenAiAdapter, StabilityAdapter } from '@ac-canvas/ai-core/adapters/*'
import { ProviderStore } from '@ac-canvas/ai-core/config/providerStore'
import { DexieProviderStorage } from './indexedb/providerStorage'  // NEW

// In App component or a bootstrap effect:
useEffect(() => {
  const registry = AdapterRegistry.getInstance()
  registry.register(MockAdapter)
  registry.register(OpenAiAdapter)
  registry.register(StabilityAdapter)

  // Initialize ProviderStore with Dexie backend
  const storage = new DexieProviderStorage()  // implements ProviderConfigStorage
  const providerStore = new ProviderStore(storage)
  // Store reference for bridge to access
  globalThis.__providerStore = providerStore  // or pass via context/DI
}, [])
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Stub resolvers returning placeholder data | Real adapter calls via AIQueueStore | Phase 5 | Nodes now produce real AI-generated images instead of mock IDs |
| Empty aiQueueStore stub | Full Zustand store with per-provider queues | Phase 5 | AIQueueStore manages job lifecycle, rate limiting, serial execution |
| No progress feedback (stubs resolve instantly) | EventEmitter progress wired to node status | Phase 5 | Users see queued->executing->done transitions with real timing |
| Engine constructed with resolvers in useAutoExecute | Engine still uses same resolvers map, but entries are now async adapters | Phase 5 | No change to NodeEngine class itself; resolver map swap is sufficient |

**Deprecated/outdated:**
- Direct synchronous stub resolvers for text-to-image and style: These are replaced with async adapter calls. The `Executor` type already supports `Promise<ExecutorOutput>` so no type changes are needed.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | No existing blob storage utility exists in `apps/web/src/` | Don't Hand-Roll | Confirmed by grep -- no `storeImage`, `BlobStorage`, or `blobService` found. The bridge must implement the `onStoreImage` callback. If Phase 1's blob storage pattern was never concretely implemented, this is new work. |
| A2 | The `__nodeId` injection pattern works (injecting nodeId into nodeData for EventEmitter wiring) | Code Examples | The Executor signature `(nodeData, inputs) => ExecutorOutput` doesn't include nodeId. The bridge needs nodeId to update EngineStore. Options: (a) inject nodeId into nodeData before calling the executor, (b) wrap the executor in a closure that captures nodeId from the engine's execution loop. Pattern (b) is safer as it doesn't mutate the node's data. |
| A3 | ProviderStore instance is accessible from the bridge at execution time | Pattern 1 | If ProviderStore requires initialization (Dexie backend wiring) and is not a singleton, the bridge needs a reference. Could be passed via module-level singleton, React context, or imported from a bootstrap module. |
| A4 | AdapterRegistry is a singleton (confirmed by code) | Pattern 2 | Code at `packages/ai-core/src/registry.ts` confirms `getInstance()`. LOW risk. |

## Open Questions

1. **How does the bridge provide `storeImage` callback to adapters?**
   - What we know: Adapter `execute()` accepts an optional `onStoreImage` callback. Without it, adapters fall back to placeholder IDs and generated image data is lost.
   - What's unclear: Is there a concrete blob storage API from Phase 1 (IndexedDB blob table, blob service) that the bridge should call? Grep found no `blobService` or `storeImage` implementations in `apps/web/src/`.
   - Recommendation: Create a simple blob storage utility in the bridge or in `apps/web/src/indexedb/`. Options: (a) in-memory `Map<string, Blob>` for MVP speed -- blobs are shown immediately via PreviewNode and don't need persistence across page reloads in MVP, (b) Dexie table for blobs using existing IndexedDB infrastructure. Choose (a) for Phase 5 speed, add (b) in Phase 6 backend.

2. **How does the bridge get a reference to the configured ProviderStore instance?**
   - What we know: ProviderStore reads encrypted API keys from IndexedDB. The bridge needs to call `providerStore.getApiKey(providerId)` to instantiate adapters with correct credentials.
   - What's unclear: Whether ProviderStore should be a singleton, passed via module DI, or read from React context.
   - Recommendation: Create a module-level singleton `getProviderStore(): ProviderStore` that is initialized once at app bootstrap with a Dexie storage backend. The bridge imports this. Pattern: `apps/web/src/indexedb/providerStorage.ts` implements `ProviderConfigStorage` over Dexie, then `providerStoreSingleton.ts` exports the initialized instance.

3. **Where exactly should the AI bridge code live?**
   - What we know: CONTEXT.md Claude's Discretion says "new file `apps/web/src/engine/aiBridge.ts` or directly modify `resolvers.ts`."
   - What's unclear: Which is cleaner.
   - Recommendation: New file `apps/web/src/engine/aiBridge.ts` containing `createAiExecutor(providerId)` factory and any helper utilities. The `resolvers.ts` file imports from `aiBridge.ts` to replace the two resolvers. This keeps `resolvers.ts` as a thin configuration file and `aiBridge.ts` as the implementation.

4. **Should AIQueueStore be initialized with provider rate limits at startup?**
   - What we know: Rate limits are hardcoded in `packages/ai-core/src/config/rateLimits.ts`.
   - What's unclear: Whether AIQueueStore should read these at initialization or they're used statically.
   - Recommendation: Static import. `DEFAULT_RATE_LIMITS` is a const object. The queue processing loop imports `checkRateLimit()` which reads from the const. No initialization step needed.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | 24.x+ | -- |
| pnpm | Package manager | Yes | 11.x+ | -- |
| eventemitter3 | Adapter progress events | Yes (ai-core dep) | ^5.0.4 | -- |
| tempura | Template rendering | Yes (ai-core dep) | ^0.4.1 | -- |
| Vitest | Unit testing | Yes | ^4.1.x | -- |
| jsdom | Test environment | Yes (ai-core devDep) | ^29.1.1 | -- |
| IndexedDB | ProviderStore storage | Yes (browser) | -- | In-memory storage for tests |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.x |
| Config file | `apps/web/vitest.config.ts` -- check existence; `packages/ai-core/vitest.config.ts` exists with `environment: 'jsdom'` |
| Quick run command | `cd apps/web && npx vitest run --changed` (or from root: `pnpm --filter @ac-canvas/web exec vitest run`) |
| Full suite command | `pnpm --recursive exec vitest run` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-04 | Per-provider queue enqueue/dequeue | unit | `npx vitest run apps/web/src/stores/__tests__/aiQueueStore.test.ts` | Wave 0 |
| AI-04 | Rate limiter allows within window | unit | `npx vitest run packages/ai-core/src/config/__tests__/rateLimits.test.ts` | Wave 0 |
| AI-04 | Rate limiter blocks outside window | unit | Same as above | Wave 0 |
| AI-04 | Rate limiter sliding window pruning | unit | Same as above | Wave 0 |
| AI-07 | EventEmitter progress updates EngineStore | unit | `npx vitest run apps/web/src/engine/__tests__/aiBridge.test.ts` | Wave 0 |
| AI-08 | Bridge resolves text-to-image via adapter | integration | `npx vitest run apps/web/src/engine/__tests__/aiBridge.test.ts` | Wave 0 |
| AI-08 | Bridge resolves style via adapter | integration | Same as above | Wave 0 |
| AI-08 | Fail-stop on adapter error (mark skip) | integration | Same as above | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --changed` (runs tests for changed files)
- **Per wave merge:** Full suite for affected packages
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `apps/web/src/stores/__tests__/aiQueueStore.test.ts` -- covers AI-04 (queue operations, rate limiter integration)
- [ ] `packages/ai-core/src/config/__tests__/rateLimits.test.ts` -- covers AI-04 (pure function unit tests for sliding window)
- [ ] `apps/web/src/engine/__tests__/aiBridge.test.ts` -- covers AI-07, AI-08 (bridge executor, EventEmitter wiring, fail-stop)
- [ ] Possible `apps/web/vitest.config.ts` -- may need to create if it doesn't exist (checking: `Glob` returned "No files found" for `apps/web/vitest.config.*`)
- [ ] `apps/web/src/indexedb/providerStorage.ts` -- Dexie-backed ProviderConfigStorage implementation for ProviderStore integration (needed by bridge in production)

*(If no gaps: "None -- existing test infrastructure covers all phase requirements")*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | BYOK is user-managed API keys via ProviderStore |
| V3 Session Management | No | Frontend-only, no sessions |
| V4 Access Control | No | Single-user local app |
| V5 Input Validation | Yes | Prompt input via TemplateEngine renders safely (tempura handles escaping). Zod 4.4.3 available for additional validation if needed. |
| V6 Cryptography | Yes | Web Crypto AES-256-GCM for API key at-rest encryption (already implemented in `packages/ai-core/src/config/encryption.ts`) |

### Known Threat Patterns for Phase 5 Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key leakage via error messages | Information Disclosure | `sanitizeErrorMessage()` in `packages/ai-core/src/interfaces/types.ts` strips `sk-*` patterns. Applies to all adapter error paths. |
| Unauthorized adapter instantiation | Elevation of Privilege | AiAdapter constructor requires explicit options (apiKey, baseUrl). No adapter can execute without a configured key. Bridge reads config from ProviderStore, not from user input. |
| Prompt injection via node data | Tampering | TemplateEngine uses tempura which escapes content by default (`{{variable}}`). Unescaped `{{{variable}}}` available but bridge should prefer escaped for user-provided prompt text. |
| Stale node status updates after graph mutation | -- | AIQueueStore should verify node existence before updating status. Mitigation per Pitfall 3. |

## Sources

### Primary (HIGH confidence)
- Codebase files read in this session: NodeEngine.ts, resolvers.ts, types.ts, engineStore.ts, aiQueueStore stub, AiAdapter.ts, types.ts (ai-core), registry.ts, providerStore.ts, templateEngine.ts, templates.ts, nodeGraphStore.ts, nodeGraph.ts, historyStore.ts, App.tsx, useAutoExecute.ts, MockAdapter, OpenAiAdapter, encryption.ts, NodeEngine tests, canvas.ts
- CONTEXT.md for Phase 5 (all locked decisions verified by reading existing code)
- CONTEXT.md for Phase 3 (execution model, status indicators, fail-stop)
- CONTEXT.md for Phase 4 (adapter interface, EventEmitter, storeImage callback, ProviderStore)

### Secondary (MEDIUM confidence)
- npm registry data for package versions (Zustand 5.0.12, eventemitter3 ^5.0.4, tempura ^0.4.1)

### Tertiary (LOW confidence)
- None -- all claims verified against source code or context documents.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and verified in actual codebase (Zustand 5, eventemitter3, tempura)
- Architecture: HIGH - Patterns derived from existing codebase structure (Zustand+Immer, ExecutorResolver pattern, AiAdapter interface)
- Pitfalls: HIGH - Based on known EventEmitter patterns, async queue design patterns, and codebase-specific risks (no blob storage, no ProviderStore singleton)

**Research date:** 2026-07-01
**Valid until:** 2026-08-01 (30 days - stable core libraries)
