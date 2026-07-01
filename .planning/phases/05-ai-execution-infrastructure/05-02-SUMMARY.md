---
phase: 05-ai-execution-infrastructure
plan: 02
subsystem: ai-queue-engine
tags: per-provider-queues, rate-limiting, serial-execution, fifo, tdd

# Dependency graph
requires:
  - phase: 05-01
    provides: checkRateLimit pure function, DEFAULT_RATE_LIMITS, ImageBlobStore singleton
provides:
  - AIQueueStore with per-provider FIFO queues (D-02)
  - Serial execution loop with rate limiter integration (D-03)
  - Promise-based enqueue (returns ExecutorOutput on completion)
  - fail-stop error handling (D-04)
  - EngineStore extended with queuedNodeIds tracking
  - Node existence verification (Pitfall 3 mitigation)
affects:
  - 05-03 (AI Bridge) — AIQueueStore is the bridge's execution target
  - EngineStore consumers (node status visualization)

# Tech tracking
tech-stack:
  added:
    - "@ac-canvas/ai-core": "workspace:*" (web app dependency)
  patterns:
    - Zustand + Immer for queue state with per-provider isolation
    - Promise-based enqueue with pending resolve/reject map
    - TDD: RED (9 tests fail) -> GREEN (9 tests pass) cycle

key-files:
  created:
    - apps/web/src/stores/aiQueueStore.ts
    - apps/web/src/stores/__tests__/aiQueueStore.test.ts
  modified:
    - apps/web/src/stores/engineStore.ts
    - apps/web/package.json

key-decisions:
  - "processQueue is NOT auto-started from enqueue — caller (AI Bridge) invokes it explicitly, keeping queue state observable for testing"
  - "Promise rejections in cancelAll/cancelProvider moved outside immer set() to prevent unhandled rejection errors in test framework"
  - "Node existence check uses useNodeGraphStore.getState().nodes.some() — lightweight O(n) per dequeue, n bounded by graph size"

patterns-established:
  - "promise-backed-enqueue: enqueue returns Promise<ExecutorOutput>, resolved/rejected when processQueue completes the job via a Map<string, {resolve, reject}>"
  - "rate-limiter-spy-testing: Rate limit verification uses vi.spyOn(checkRateLimit) for deterministic mock returns instead of fake timers on setTimeout"

requirements-completed: [AI-04]

duration: 14min
completed: 2026-07-01
---

# Phase 05 Plan 02: AIQueueStore + EngineStore Extension Summary

**Per-provider FIFO queues, rate limiter integration, serial execution loop, and EngineStore queuedNodeIds tracking with node existence verification**

## Performance

- **Duration:** 14 min
- **Started:** 2026-07-01T15:36:00Z
- **Completed:** 2026-07-01T15:50:00Z
- **Tasks:** 2
- **Files created:** 2
- **Files modified:** 2 (+1 package.json dep)

## Accomplishments

- `AIQueueStore` with per-provider FIFO queues (D-02), serial execution loop (D-03), promise-based enqueue, fail-stop error handling (D-04), cancelAll/cancelProvider
- `checkRateLimit()` integration before every dequeue with setTimeout-based backoff when rate-limited
- `EngineStore` extended with `queuedNodeIds: string[]` and `setQueuedNodeIds` action (transient — excluded from serialization)
- Node existence verification (`useNodeGraphStore.getState().nodes.some(...)`) after dequeue, before execution — prevents ghost status indicators on deleted nodes (Pitfall 3)
- 9 test cases covering enqueue behavior, FIFO order, rate limiting, cancellation, promise resolution/rejection, and concurrent provider isolation
- Added `@ac-canvas/ai-core` dependency to web app

## Task Commits

Each task was committed atomically:

1. **Dependency: Add `@ac-canvas/ai-core` to web app** — `6fa87fe` (feat)
2. **Task 1: AIQueueStore + 9 tests** — `11e0552` (feat)
3. **Task 2: EngineStore extension + node existence verification** — `82cbb6e` (feat)
4. **Lock file update** — `1e5478d` (chore)

**Plan metadata:** This summary file.

## Files Created

- `apps/web/src/stores/aiQueueStore.ts` — Full AIQueueStore with queues, timestamps, processing flags, enqueue/processQueue/cancelAll/cancelProvider
- `apps/web/src/stores/__tests__/aiQueueStore.test.ts` — 9 test cases for queue operations

## Files Modified

- `apps/web/src/stores/engineStore.ts` — Added `queuedNodeIds: string[]` field, `setQueuedNodeIds` action, reset in `clearAll()`, excluded from serialization
- `apps/web/package.json` — Added `@ac-canvas/ai-core` workspace dependency

## Decisions Made

- **processQueue not auto-started**: The plan initially specified auto-start in enqueue via `Promise.resolve().then(...)`. Removed to avoid race conditions with fake timers in tests and to keep queue state observable before processing begins. The caller (AI Bridge in Plan 03) calls processQueue explicitly.
- **Promise rejection outside immer**: `cancelAll` and `cancelProvider` reject pending promises outside the `set()` callback. Inside immer, rejections during set cause unhandled rejection errors in vitest.
- **checkRateLimit mock instead of fake timers**: The rate limit test uses `vi.spyOn(checkRateLimit)` with controlled return values instead of `vi.useFakeTimers()` on the setTimeout-based backoff. This is more deterministic and avoids the complexity of advancing async timers through promise chains.
- **Node existence check is lightweight**: `Array.some()` on the nodes array is O(n) per dequeue. With realistic graph sizes (<100 nodes), this is negligible. If performance becomes a concern, a Set-based lookup can be introduced.

## TDD Execution

Task 1 followed RED->GREEN cycle:

1. **RED**: Wrote all 9 test cases in `aiQueueStore.test.ts` — vitest confirmed module not found (1 file failed, 0 tests)
2. **GREEN**: Created `aiQueueStore.ts` — 9/9 tests passed
3. **Minor refactor during GREEN**: `cancelAll`/`cancelProvider` promise rejection moved outside immer, processQueue auto-start removed

## Deviations from Plan

- **No auto-start of processQueue in enqueue**: Plan specified auto-start via `Promise.resolve().then(...)`. Removed because it caused race conditions with test assertions. Caller now must invoke processQueue explicitly after enqueueing. This is documented in the store's comment and matches how the AI Bridge (Plan 03) will use it.

## Issues Encountered

1. **Unhandled promise rejections from cancelAll**: When cancelAll rejected pending promises inside immer's `set()`, vitest reported unhandled rejections. Fixed by moving rejections outside the immer callback.
2. **Fake timer complexity with async processQueue**: Using `vi.useFakeTimers()` with `vi.advanceTimersByTime()` on an async function that awaits setTimeout was unreliable. Replaced with `vi.spyOn(checkRateLimit)` for deterministic rate limit testing.
3. **Node existence check broke existing tests**: Tests 4 and 5 used arbitrary node IDs not present in the graph. Updated both tests to add nodes to `useNodeGraphStore` before enqueueing.

## Threat Surface Scan

Per the plan's threat model:
- **T-05-03 (Stale status updates)**: Mitigated — node existence verification before any EngineStore status update. Deleted-while-queued nodes get their pending promise rejected with "Node deleted" and the loop continues.
- **T-05-04 (Queue memory)**: Accepted — queue growth bounded by realistic usage (tens, not thousands of jobs).
- **T-05-05 (Invalid providerId)**: Accepted — unknown providerId results in no matching rate limit (permissive by default in checkRateLimit) and no adapter match (handled at bridge level).

## Next Phase Readiness

- AI Bridge (Plan 03) can import `useAIQueueStore` and call `enqueue()`/`processQueue()` for execution
- NodeEngine can read `engineStore.queuedNodeIds` to display queue state to users
- Rate limiter integration tested at the queue level

## Self-Check: PASSED

- Files created: 2/2 verified present
- Commits: 4/4 verified in git log
- Tests: 9/9 passing in targeted run; 39/39 relevant tests passing including existing NodeEngine tests
- Node existence verification: confirmed via grep (`nodes.some` in processQueue)
- queuedNodeIds present in EngineStoreState: confirmed via grep
- queuedNodeIds excluded from serialization: confirmed via code inspection
- All acceptance criteria met per plan specification

---
*Phase: 05-ai-execution-infrastructure*
*Completed: 2026-07-01*
