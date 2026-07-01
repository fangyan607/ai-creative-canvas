---
phase: 06-backend-services
plan: 02
subsystem: frontend-integration
tags: ["sse", "eventsource", "vite-proxy", "ai-bridge", "react-hook"]

requires:
  - phase: 06-01
    provides: Backend services at apps/backend/ (SSE, AI proxy, file routes)
  - phase: 05-03
    provides: Execution engine, EngineStore, aiBridge bridge factory
  - phase: 04-02
    provides: AdapterRegistry, ProviderStore patterns

provides:
  - Vite dev proxy configuration for /api/* -> localhost:3001
  - SSEService EventSource wrapper class with typed event dispatch
  - useSSEProgress React hook mapping SSE events to EngineStore actions
  - Proxy mode dispatch in aiBridge for VITE_AI_PROXY_MODE=proxy
  - Frontend SSE lifecycle management (initSSE/destroySSE)

affects:
  - 06-03 (if exists)
  - Deployment configuration
  - Testing setup (mock EventSource pattern established)

tech-stack:
  added:
    - "@testing-library/react@^16.3.2" (for hook testing via renderHook)
  patterns:
    - "Singleton SSEService with module-level state + getter/setter pattern"
    - "EventSource mock class with triggerEvent helper for Vitest tests"
    - "Proxy mode toggle via __setProxyMode() test helper (not vi.stubEnv)"
    - "Inline SSE handler registration with unsubscribe cleanup"

key-files:
  created:
    - apps/web/src/services/sseService.ts
    - apps/web/src/services/useSSEProgress.ts
    - apps/web/src/services/__tests__/sseService.test.ts
    - apps/web/src/services/__tests__/useSSEProgress.test.ts
  modified:
    - apps/web/vite.config.ts
    - apps/web/src/App.tsx
    - apps/web/src/engine/aiBridge.ts
    - apps/web/package.json

key-decisions:
  - "SSEService uses polling-based dispatch from Map<string, Set<SseEventHandler>> for simple event routing"
  - "isProxyMode() checks __setProxyMode test override first, then import.meta.env (for Vitest compatibility)"
  - "Proxy mode dispatch in aiBridge checks import.meta.env.VITE_AI_PROXY_MODE at factory time, not execution time"
  - "initSSE() is a singleton guard pattern matching ProviderStore pattern from Phase 4"
  - "useSSEProgress hook uses individual selectors (not useShallow) for minimal re-renders"
  - "@testing-library/react renderHook chosen for hook testing over custom test wrapper"

patterns-established:
  - "Singleton module pattern: module-level let variable + init/destroy exports + __reset helper for tests"
  - "Environment mode check: test override before import.meta.env for testability"
  - "EventSource mock: class with triggerEvent, matches real EventSource constructor/event listener API"
  - "Vite proxy config: /api -> localhost:3001 with changeOrigin alongside existing server config"

requirements-completed: [BKND-01]

duration: 16min
completed: 2026-07-01
---

# Phase 6 Plan 2: Frontend-Backend Integration Summary

**Vite dev proxy, SSEService, useSSEProgress hook, and proxy mode dispatch in aiBridge for the VITE_AI_PROXY_MODE=proxy toggle**

## Performance

- **Duration:** 16 min
- **Started:** 2026-07-01T10:02:34Z
- **Completed:** 2026-07-01T10:17:34Z
- **Tasks:** 2
- **Files created/modified:** 10 (4 created, 4 modified, 2 dependency changes)

## Accomplishments

- Added Vite dev proxy configuration forwarding /api/* to localhost:3001 (eliminates CORS in dev)
- Created SSEService class wrapping native EventSource with typed event dispatch for progress/error/done events
- Created SseEventPayload interface matching D-03 standardized SSE event format
- Created useSSEProgress React hook mapping SSE progress/error/done events to EngineStore actions
- Created initSSE/destroySSE singleton lifecycle functions with proxy mode guard
- Wired initSSE() call in App.tsx bootstrap useEffect and useSSEProgress() at component top level
- Added proxy mode dispatch in aiBridge.ts createAiExecutor() — sends HTTP POST to /api/ai/generate when VITE_AI_PROXY_MODE=proxy
- Installed @testing-library/react for hook testing via renderHook

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Vite dev proxy config and create SSEService class with tests** - `0606cf6` (feat)
2. **Task 2: Create useSSEProgress hook, wire App.tsx init, and add proxy mode to aiBridge** - `4139079` (feat)
3. **Infrastructure: Add @testing-library/react dependency** - `459a7e7` (chore)

## Files Created/Modified

### Created
- `apps/web/src/services/sseService.ts` - SSEService class wrapping EventSource with typed event dispatch, SseEventPayload interface, SseEventHandler type
- `apps/web/src/services/useSSEProgress.ts` - useSSEProgress hook, initSSE/destroySSE singleton functions, proxy mode guard
- `apps/web/src/services/__tests__/sseService.test.ts` - 11 tests: connect, dispatch (progress/error/done), unsubscribe, disconnect, malformed JSON, duplicate connect, unknown events, empty handlers
- `apps/web/src/services/__tests__/useSSEProgress.test.ts` - 6 tests: progress/error/done mapping, cleanup on unmount, direct mode no-op, singleton pattern

### Modified
- `apps/web/vite.config.ts` - Added server.proxy configuration: /api -> http://localhost:3001 with changeOrigin
- `apps/web/src/App.tsx` - Added initSSE() call in bootstrap useEffect, useSSEProgress() hook at component top level
- `apps/web/src/engine/aiBridge.ts` - Added proxy mode dispatch at START of createAiExecutor(); existing direct-mode code (lines 92-175) preserved unchanged
- `apps/web/package.json` - Added @testing-library/react devDependency

## Decisions Made

- **isProxyMode() dual check**: Tests use `__setProxyMode()` test override (avoiding vi.stubEnv limitations with jsdom), while production uses `import.meta.env.VITE_AI_PROXY_MODE`. This solves the Vitest module caching issue where `vi.stubEnv` doesn't propagate to dynamically imported modules.
- **Singleton pattern**: SSEService uses module-level `let sseServiceInstance` (not Zustand) to match the singleton pattern already established in `providerStoreSingleton.ts`.
- **Hook handler registration**: useSSEProgress registers handlers via `sseServiceInstance.on()` inside a useEffect with cleanup, rather than calling `initSSE()` inside the hook. initSSE() is called separately at App mount.
- **EventSource mock pattern**: A custom MockEventSource class with `triggerEvent()` helper is used in both test files, providing fine-grained control over event simulation (vs. a full auto-mock with vi.fn).
- **Proxy mode checked at factory time**: In aiBridge.ts, `isProxyMode` is checked once when `createAiExecutor()` is called, not inside the returned executor. This means the mode is fixed per factory call and doesn't change mid-execution.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Vitest + vi.stubEnv limitation**: `vi.stubEnv` sets `process.env` but does not propagate to `import.meta.env` when modules are dynamically imported via `import()` (Vitest caches modules by file path, but `import.meta` is module-scoped). Resolved by adding a `__setProxyMode()` test override function that stores the proxy flag in a module-level variable, checked before `import.meta.env`.
- **vi.fn() constructor requirement**: `vi.fn()` with arrow function implementation cannot be used with `new`. Resolved by assigning the `MockEventSource` class directly to `globalThis.EventSource` instead of wrapping in `vi.fn()`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Frontend is ready for proxy mode operation when backend is running on localhost:3001
- Setting `VITE_AI_PROXY_MODE=proxy` in `.env` activates the proxy path
- All 106 frontend tests pass with no regressions
- The existing direct mode (Phase 5 path) is completely untouched and continues to work

---
*Phase: 06-backend-services*
*Completed: 2026-07-01*

## Self-Check: PASSED

All 8 files verified on disk, all 3 commits found in git history. No regressions (106 tests, 13 test files, all pass).
