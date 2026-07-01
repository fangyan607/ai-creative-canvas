---
phase: 05-ai-execution-infrastructure
reviewed: 2026-07-01T20:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - packages/ai-core/src/config/rateLimits.ts
  - packages/ai-core/src/config/__tests__/rateLimits.test.ts
  - apps/web/src/indexedb/imageStore.ts
  - apps/web/src/stores/aiQueueStore.ts
  - apps/web/src/stores/__tests__/aiQueueStore.test.ts
  - apps/web/src/stores/engineStore.ts
  - apps/web/package.json
  - apps/web/src/engine/aiBridge.ts
  - apps/web/src/engine/__tests__/aiBridge.test.ts
  - apps/web/src/indexedb/providerStorage.ts
  - apps/web/src/stores/providerStoreSingleton.ts
  - apps/web/src/engine/NodeEngine.ts
  - apps/web/src/engine/resolvers.ts
  - apps/web/src/App.tsx
findings:
  critical: 2
  warning: 5
  info: 8
  total: 15
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-07-01T20:00:00Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Reviewed the Phase 5 AI execution infrastructure: rate limiter, AI queue store, engine store, blob storage, provider storage, NodeEngine DAG executor, AI bridge, resolvers, and the App bootstrap. The overall architecture is well-structured with clear separation of concerns and documented design decisions (D-01 through D-10). However, there is one critical integration gap that makes the async execution path non-functional in production: `processQueue` is never called outside tests. Additionally, a risky pattern in `aiBridge.ts` could crash at runtime, and several concurrent processing guards are missing.

---

## Critical Issues

### CR-01: processQueue never called in production code — AI queue never drains

**File:** `apps/web/src/engine/resolvers.ts:32-61`
**File:** `apps/web/src/engine/NodeEngine.ts:147-273`
**File:** `apps/web/src/hooks/useAutoExecute.ts:42-80`
**Issue:** The `text-to-image` and `style` resolvers call `queueStore.enqueue()` to enqueue AI jobs, but `processQueue(providerId)` is never invoked in any production code path. The `aiQueueStore.ts` comment at line 116-118 states that "the caller (e.g. AI Bridge or NodeEngine) calls processQueue(providerId) after enqueueing," but no caller actually does this. The call chain is:

1. `useAutoExecute` calls `engine.execute(nodes, edges)`
2. `NodeEngine.execute()` invokes resolvers layer-by-layer
3. `resolvers.ts` calls `queueStore.enqueue()` for `text-to-image` and `style` nodes
4. **`processQueue()` is never called** -- jobs sit in the queue forever
5. The enqueue promises never resolve, leaving callers awaiting indefinitely

This affects both the `text-to-image` resolver (lines 32-46) and the `style` resolver (lines 48-61). Only the sync resolvers (`prompt`, `merge`, `preview`) work correctly because they don't use the queue.

The `processQueue` method is only invoked in test files (`aiQueueStore.test.ts`, 9 call sites). Production call sites exist in zero files across the entire codebase.

**Fix:** Integrate `processQueue` into the execution flow. The most appropriate place is in `NodeEngine.execute()` after enqueueing, or in the resolvers after enqueueing. For example, in the `text-to-image` resolver:

```typescript
resolvers.set('text-to-image', (async (nodeData, inputs) => {
  const queueStore = useAIQueueStore.getState()
  const providerId = resolveProviderId(nodeData, 'text-to-image')
  const store = getProviderStore()
  const executor = createAiExecutor(providerId, { providerStore: store })

  const promise = queueStore.enqueue(providerId, {
    nodeId: (nodeData as any).__nodeId as string,
    providerId,
    executor,
    nodeData,
    inputs,
  })

  // Start processing for this provider
  queueStore.processQueue(providerId).catch((err) => {
    console.error(`[resolver] processQueue error for ${providerId}:`, err)
  })

  return promise
}) as Executor)
```

Alternatively, integrate into `aiQueueStore.enqueue()` with a flag to auto-start, or into `NodeEngine.execute()` after all nodes in a layer are enqueued.

---

### CR-02: Adapter instantiated without config to read defaultBaseUrl — may throw

**File:** `apps/web/src/engine/aiBridge.ts:54`
**Issue:** Line 54 creates a throw-away adapter instance with no arguments just to read `defaultBaseUrl`:

```typescript
const defaultBaseUrl = new AdapterClass().defaultBaseUrl
```

If any adapter constructor (e.g., `OpenAiAdapter`, `StabilityAdapter`) requires arguments, has side effects, or throws when called without config, this line will crash. Even if current adapters happen to have no-arg constructors, this is extremely fragile -- any future change to adapter constructors silently breaks the bridge.

Additionally, even if the constructor works, instantiating an adapter purely for property access is wasteful and breaks the single-responsibility principle: construction should only happen when the adapter is actually about to execute.

**Fix:** Make `defaultBaseUrl` a static property on the adapter class, and read it via `AdapterClass.defaultBaseUrl` without instantiation:

```typescript
// Step 2: Read API config from ProviderStore (Phase 4 BYOK)
const apiKey = await providerStore.getApiKey(providerId)
const defaultBaseUrl = AdapterClass.defaultBaseUrl  // static property
const baseUrl = await providerStore.getBaseUrl(providerId, defaultBaseUrl)
```

If `defaultBaseUrl` cannot be static (e.g., it's computed per-instance), add a static metadata method to the registry interface instead, or accept the base URL as a constructor parameter from the start.

---

## Warnings

### WR-01: No guard against concurrent processQueue for the same provider

**File:** `apps/web/src/stores/aiQueueStore.ts:123-211`
**Issue:** The `processQueue` method sets `processing[providerId] = true` on entry (line 124-126) and resets it in the `finally` block (line 207-209), but there is no check at the top of the method that returns early if `processing[providerId]` is already `true`. This means two concurrent calls to `processQueue('openai')` can both enter the `while(true)` loop, both read from the same queue, and potentially both dequeue and execute the same job.

In the test suite, this is not hit because tests call `processQueue` sequentially. But in production, if `useAutoExecute` triggers re-execution while a previous execution's queue processing is still running, two `processQueue` loops for the same provider could race.

**Fix:** Add an early return guard at the top of `processQueue`:

```typescript
processQueue: async (providerId) => {
  // Guard: if already processing, skip (re-entrant call)
  const currentState = get()
  if (currentState.processing[providerId]) return

  set((state) => {
    state.processing[providerId] = true
  })
  // ... rest of method
}
```

---

### WR-02: while(true) with no max-iteration safeguard

**File:** `apps/web/src/stores/aiQueueStore.ts:129`
**Issue:** The `while(true)` loop on line 129 has no maximum iteration bound. If `checkRateLimit` returns `{ allowed: false, waitMs: 0 }` -- which is possible in theory if `oldestInWindow + windowMs - now` evaluates to exactly 0 -- the loop will busy-wait with `setTimeout(resolve, 0)` microtasks indefinitely. The `Math.max(waitMs, 0)` in `rateLimits.ts:51` means waitMs will be clamped to 0 rather than going negative, so this case is unreachable under normal conditions, but a clock regression (system time moving backward) could trigger it.

**Fix:** Add a safety counter or always ensure a minimum non-zero wait when rate-limited:

```typescript
if (!allowed) {
  // Ensure at least 1ms wait to prevent tight loops
  await new Promise((resolve) => setTimeout(resolve, Math.max(waitMs, 1)))
  continue
}
```

---

### WR-03: Potential inputs[undefined] when edge lacks sourceHandle

**File:** `apps/web/src/engine/NodeEngine.ts:209-213`
**Issue:** The inputs construction loop reads `edge.sourceHandle` as the key for `inputs`. If an edge has no `sourceHandle` (e.g., edges from a default output port, or programmatically created edges), this sets `inputs[undefined] = nodeOutputs.get(edge.source)`, which is a no-op in JavaScript (assigns to a property key `'undefined'` as a string). Downstream resolvers that look up `inputs['default']` or `inputs['prompt']` would find nothing, effectively losing the upstream output.

```typescript
const incomingEdges = edges.filter((e) => e.target === nodeId)
for (const edge of incomingEdges) {
  inputs[edge.sourceHandle] = nodeOutputs.get(edge.source)
  // if sourceHandle is undefined -> inputs['undefined'] = ...
}
```

This depends on whether the node graph store guarantees every edge has a non-empty `sourceHandle`. If not (e.g., prompt nodes with a single output port that defaults to no handle), this silently drops data.

**Fix:** Add a fallback to a default handle name when `sourceHandle` is missing:

```typescript
for (const edge of incomingEdges) {
  const handle = edge.sourceHandle ?? 'default'
  inputs[handle] = nodeOutputs.get(edge.source)
}
```

---

### WR-04: Duplicated resolver code for text-to-image and style

**File:** `apps/web/src/engine/resolvers.ts:32-61`
**Issue:** The `text-to-image` resolver (lines 32-46) and `style` resolver (lines 48-61) are functionally identical -- both call `resolveProviderId`, `getProviderStore`, `createAiExecutor`, and `queueStore.enqueue` with the same pattern. The only difference is the node type argument passed to `resolveProviderId` (`'text-to-image'` vs `'style'`). This is ~15 lines of duplicated code that must be kept in sync.

**Fix:** Extract a shared factory function:

```typescript
function createQueueingExecutor(nodeType: string): Executor {
  return (async (nodeData, inputs) => {
    const queueStore = useAIQueueStore.getState()
    const providerId = resolveProviderId(nodeData, nodeType)
    const store = getProviderStore()
    const executor = createAiExecutor(providerId, { providerStore: store })

    return queueStore.enqueue(providerId, {
      nodeId: (nodeData as any).__nodeId as string,
      providerId,
      executor,
      nodeData,
      inputs,
    })
  }) as Executor
}

// Then:
resolvers.set('text-to-image', createQueueingExecutor('text-to-image'))
resolvers.set('style', createQueueingExecutor('style'))
```

---

### WR-05: Overuse of `as Executor` type assertions bypasses type safety

**File:** `apps/web/src/engine/resolvers.ts:27,32,48,63,73`
**Issue:** Every resolver registered in `createDefaultResolvers` uses `as Executor` to coerce the function to the expected type. This means TypeScript cannot catch mismatches between the actual return type of the function and the `ExecutorOutput` type. For example, the `prompt` resolver returns `{ prompt: string }`, the `merge` resolver returns `{ mergedImageId, blendMode, sourceCount, isStub }`, and the `preview` resolver returns `{ displayImageId, isStub }`. None of these may match the `ExecutorOutput` type signature exactly, but the `as Executor` cast silences any errors.

**Fix:** Declare resolvers with explicit return type annotations matching `ExecutorOutput` instead of casting. If `ExecutorOutput` needs to be a union type (different shapes for different node types), define it as a discriminated union:

```typescript
resolvers.set('prompt', ((nodeData, _inputs): ExecutorOutput => {
  return { prompt: (nodeData as any).prompt ?? '' }
}) as Executor)
```

Better yet, make the individual return types match `ExecutorOutput` by adding missing fields or making `ExecutorOutput` an interface that allows optional extra fields.

---

## Info

### IN-01: `queuedNodeIds` defined but never updated by processQueue

**File:** `apps/web/src/stores/engineStore.ts:54-55,94-96`
**Issue:** The `EngineStoreState` interface defines `queuedNodeIds: string[]` and a setter `setQueuedNodeIds`, but the `processQueue` method in `aiQueueStore.ts` never calls `setQueuedNodeIds`. The `queuedNodeIds` field is always an empty array unless manually set from outside. This is either dead code surface or an incomplete integration where queue state was intended to be mirrored to EngineStore.

**Fix:** Either remove `queuedNodeIds` and `setQueuedNodeIds` from EngineStore if the queue state lives entirely in AIQueueStore, or wire `processQueue` in `aiQueueStore.ts` to update `queuedNodeIds` when jobs enter/leave the queue.

---

### IN-02: `shadcn` CLI in `dependencies` instead of `devDependencies`

**File:** `apps/web/package.json:26`
**Issue:** The `shadcn` package (CLI tool, version `^4.12.0`) is listed under `dependencies` rather than `devDependencies`. The shadcn CLI is a build-time/code-generation tool that installs component source code into the project. It is not imported at runtime and should not ship to production. This adds unnecessary weight to the production bundle.

**Fix:** Move to `devDependencies`:

```json
"devDependencies": {
  "shadcn": "^4.12.0",
  ...
}
```

---

### IN-03: Debug console.log statements in App.tsx

**File:** `apps/web/src/App.tsx:81,85`
**Issue:** Two `console.log` calls log adapter registration and ProviderStore initialization:

```typescript
console.log('[Phase 5] Adapters registered:', ...)
console.log('[Phase 5] ProviderStore initialized')
```

These are development debug artifacts that should be removed or gated behind a debug flag before production. In a browser, these logs are visible to anyone with DevTools open and add noise.

**Fix:** Remove or replace with a structured debug logger that can be toggled off:

```typescript
// Use a debug flag or remove entirely
if (import.meta.env.DEV) {
  console.log('[Phase 5] Adapters registered:', ...)
}
```

---

### IN-04: Ctrl+Enter keyboard handler is dead code

**File:** `apps/web/src/App.tsx:89-99`
**Issue:** The `useEffect` at lines 89-99 registers a `keydown` event listener for `Ctrl+Enter` that only calls `e.preventDefault()` and does nothing else. The comment says "Phase 5 will wire this to explicit execution trigger" but Phase 5 code does not implement it. The event listener is active overhead on every keystroke.

**Fix:** Either implement the execution trigger, or remove the dead handler. If deferred to a future phase, add a TODO reference to the specific phase/deliverable:

```typescript
// TODO: Wire Ctrl+Enter to execution trigger (Phase 6)
```

---

### IN-05: `cancelProvider` doesn't reset `processing[providerId]` flag

**File:** `apps/web/src/stores/aiQueueStore.ts:227-241`
**Issue:** The `cancelProvider` method (line 227) clears `queues[providerId]` and `timestamps[providerId]` but does not set `processing[providerId] = false`. If a cancellation occurs while `processQueue` is running, the `finally` block on line 207 would set `processing[providerId] = false`, but if cancellation happens between executions when `processing` is `false`, the flag is left as-is. More critically, if `cancelProvider` is called while `processQueue` is in the `while(true)` loop, the loop continues (it reads from the now-cleared queue and exits via `queue.length === 0` check), and `finally` sets `processing = false` correctly -- so the stale flag does not occur during normal cancellation. However, if `cancelProvider` is called without a running `processQueue`, the `processing` flag for that provider remains `true` from a previous execution if cleanup failed.

**Fix:** Clear the processing flag in `cancelProvider`:

```typescript
cancelProvider: (providerId) => {
  const jobs = get().queues[providerId] ?? []
  for (const job of jobs) {
    const p = pending.get(job.id)
    if (p) {
      pending.delete(job.id)
      p.reject(new Error('Queue cancelled'))
    }
  }
  set((state) => {
    delete state.queues[providerId]
    delete state.timestamps[providerId]
    state.processing[providerId] = false
  })
}
```

---

### IN-06: Multiple `as any` type assertions in aiBridge.ts

**File:** `apps/web/src/engine/aiBridge.ts:43,79,113,114`
**Issue:** The file uses `as any` casts in four places to access properties on `nodeData` that TypeScript cannot verify at compile time:

- Line 43: `(nodeData as any).__nodeId as string | undefined`
- Line 79: `as AiAdapter`
- Line 113: `(nodeData as any).nodeType === 'style'`
- Line 114: `(nodeData as any).stylePreset ?? 'none'`

In `resolvers.ts`, there are 4 additional `as any` casts, and across the `src` directory there are 20+ `as any` usages. These suppress type errors and make the codebase harder to refactor safely.

**Fix:** Define proper typed interfaces for node data shapes rather than using `any`. For example:

```typescript
interface TextToImageNodeData extends Record<string, unknown> {
  __nodeId?: string
  prompt?: string
  templateId?: string
  model?: string
}
```

Then pass properly typed node data to executors instead of `Record<string, unknown>`.

---

### IN-07: Timestamps array grows unbounded over session lifetime

**File:** `packages/ai-core/src/config/rateLimits.ts:43`
**File:** `apps/web/src/stores/aiQueueStore.ts:175-179`
**Issue:** Every successful execution pushes a timestamp to the `timestamps[providerId]` array (line 175-179). The `checkRateLimit` function filters these with a sliding window but never prunes entries older than the window. Over a long session with many executions (e.g., thousands), this array grows unbounded. For OpenAI's 5 req/60s rate limit, this is negligible, but for Mock (Infinity rate), every `enqueue` call on a mock provider adds a timestamp forever.

While performance analysis is out of scv1ope for v, this is a correctness concern for long-running sessions: the timestamps array grows without bound, consuming memory proportionally to the number of executions ever made.

**Fix:** Prune timestamps outside the window after each check. In `rateLimits.ts`, after filtering, update the caller's array. Or in `aiQueueStore.ts` after recording a timestamp, filter out entries older than the window:

```typescript
set((s) => {
  if (!s.timestamps[providerId]) {
    s.timestamps[providerId] = []
  }
  s.timestamps[providerId] = [
    ...s.timestamps[providerId].filter(t => t > Date.now() - 60000),
    execTime,
  ]
})
```

---

### IN-08: cancelAll test doesn't verify pending promise rejection

**File:** `apps/web/src/stores/__tests__/aiQueueStore.test.ts:186-200`
**Issue:** The test at line 186 verifies that `cancelAll` clears `queues` and `timestamps` maps, but never verifies that the pending promises returned by `enqueue` are actually rejected with `'Queue cancelled'`. The `silence()` helper (line 25-27) catches the unhandled rejection so it doesn't crash the test runner, but the test never asserts on the rejection value or even that rejection occurred.

**Fix:** Store the promises and assert they reject:

```typescript
it('cancelAll clears all queues and rejects pending promises', async () => {
  const promise1 = useAIQueueStore.getState().enqueue('openai', { ... })
  const promise2 = useAIQueueStore.getState().enqueue('stability', { ... })

  expect(Object.keys(useAIQueueStore.getState().queues).length).toBe(2)

  useAIQueueStore.getState().cancelAll()

  await expect(promise1).rejects.toThrow('Queue cancelled')
  await expect(promise2).rejects.toThrow('Queue cancelled')

  expect(useAIQueueStore.getState().queues).toEqual({})
  expect(useAIQueueStore.getState().timestamps).toEqual({})
})
```

---

## Files Without Findings

The following files were reviewed and had no issues:

- `packages/ai-core/src/config/rateLimits.ts` -- Clean implementation. Sliding-window rate limiter is correct, well-documented, and handles edge cases (unknown provider, Infinity rate, boundary exclusion).
- `packages/ai-core/src/config/__tests__/rateLimits.test.ts` -- Comprehensive test coverage including boundary conditions and time transition.
- `apps/web/src/indexedb/imageStore.ts` -- Clean implementation. Straightforward Map-based blob store.
- `apps/web/src/stores/engineStore.ts` -- Clean implementation. Separate from AIGraph queue state per D-09. Serialization interface correctly excludes transient queue state.
- `apps/web/src/indexedb/providerStorage.ts` -- Clean implementation. Dexie-backed storage with proper CRUD operations.
- `apps/web/src/stores/providerStoreSingleton.ts` -- Clean implementation. Standard singleton pattern with initialization guard.
- `apps/web/src/stores/__tests__/aiQueueStore.test.ts` -- Good test coverage (9 tests), though `cancelAll` test could be stronger (see IN-08).
- `apps/web/src/engine/__tests__/aiBridge.test.ts` -- Limited test coverage but honest about it (comment at line 35).

---

_Reviewed: 2026-07-01T20:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
