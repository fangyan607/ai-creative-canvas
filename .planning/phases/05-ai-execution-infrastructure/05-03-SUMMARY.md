---
phase: 05-ai-execution-infrastructure
plan: 03
subsystem: engine-ai-bridge
tags: bridge-factory, adapter-bootstrap, provider-store, resolved-resolvers

# Dependency graph
requires:
  - phase: 05-01
    provides: ImageBlobStore singleton, checkRateLimit pure function
  - phase: 04-ai-adapters
    provides: AiAdapter abstract class, MockAdapter, OpenAiAdapter, StabilityAdapter, AdapterRegistry
  - phase: 05-02
    provides: AIQueueStore with per-provider FIFO queues, enqueue/promise API, EngineStore queuedNodeIds
provides:
  - createAiExecutor bridge factory wiring adapter lifecycle (registry, provider config, prompt building, progress events, blob storage, listener cleanup)
  - ProviderStore singleton initialized at bootstrap with Dexie-backed storage
  - text-to-image and style resolvers swapped from stubs to queue-aware adapter calls
  - NodeEngine.execute() __nodeId injection for downstream resolver identification
  - App.tsx bootstrap registering MockAdapter, OpenAiAdapter, StabilityAdapter + ProviderStore init
affects:
  - Phase 6 (storage/persistence) — ProviderStore Dexie backend may need migration support
  - Phase 8 (E2E testing) — integration tests for bridge + adapter flow

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Bridge factory pattern: createAiExecutor returns Executor from adapter lifecycle
    - Singleton export for ProviderStore (getProviderStore, initProviderStore)
    - Map-based provider resolution (resolveProviderId maps model/type -> providerId)
    - Non-mutating spread in NodeEngine to inject __nodeId without mutating node.data
    - Bootstrap useEffect for adapter registration + ProviderStore init

key-files:
  created:
    - apps/web/src/engine/aiBridge.ts
    - apps/web/src/engine/__tests__/aiBridge.test.ts
    - apps/web/src/indexedb/providerStorage.ts
    - apps/web/src/stores/providerStoreSingleton.ts
  modified:
    - apps/web/src/engine/NodeEngine.ts
    - apps/web/src/engine/resolvers.ts
    - apps/web/src/App.tsx

key-decisions:
  - "resolveProviderId maps model name prefixes (dall-e, stable-diffusion) and node types to provider IDs — node data model field has priority, then node type defaults"
  - "ProviderStore singleton initialized at App.tsx mount via useEffect — must happen before any node execution"
  - "DexieProviderStorage uses direct import of db singleton (not dynamic require) since db.ts has no circular dependency with ai-core"
  - "Non-mutating spread { ...node.data, __nodeId: node.id } protects node.data from accidental mutation — every resolver receives enriched nodeData"
  - "resolvers.ts reads __nodeId from nodeData directly, no wrapper function needed — NodeEngine injection guarantees availability"

patterns-established:
  - "bridge-factory: createAiExecutor wraps AdapterRegistry lookup, ProviderStore config, adapter instantiation, EventEmitter wiring, and listener cleanup in a single Executor function"
  - "dexie-storage-implementation: DexieProviderStorage implements ProviderConfigStorage interface using existing Dexie db singleton"

requirements-completed: [AI-07, AI-08]

# Metrics
duration: 8min
completed: 2026-07-01
---

# Phase 05 Plan 03: Engine-AI Bridge + Resolver Swap Summary

**Bridge factory wiring AdapterRegistry, ProviderStore, EventEmitter progress events, and ImageBlobStore into real adapter executors, with __nodeId injection and App.tsx bootstrap adapter registration**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-01T15:53:00Z
- **Completed:** 2026-07-01T16:01:00Z
- **Tasks:** 3
- **Files created:** 4
- **Files modified:** 3

## Accomplishments

- `createAiExecutor()` bridge factory — wraps adapter lifecycle: registry lookup, ProviderStore config (decrypted API keys), TemplateEngine prompt rendering, adapter instantiation with apiKey/baseUrl, EventEmitter progress/error/done wiring to EngineStore, ImageBlobStore callback for blob storage, AdapterResult-to-ExecutorOutput mapping, and `removeAllListeners()` cleanup in finally block (Pitfall 1 mitigation)
- `resolveProviderId()` model-to-provider mapping — dall-e -> openai, stable-diffusion -> stability, style node -> stability default, text-to-image -> openai default
- `DexieProviderStorage` implementing `ProviderConfigStorage` interface with existing Dexie database (`providerConfigs` table at schema version 2)
- `ProviderStore` singleton (`getProviderStore`, `initProviderStore`, `isProviderStoreReady`) — initialized once at app bootstrap
- `NodeEngine.execute()` injects `__nodeId: node.id` via non-mutating spread — every downstream resolver receives the node ID for queue tracking and progress events
- `resolvers.ts` text-to-image and style resolvers swapped from stubs to `AIQueueStore.enqueue()` + `createAiExecutor()` bridge calls — real adapter execution through the queue infrastructure
- `prompt`, `merge`, `preview` resolvers remain unchanged as stubs (D-07)
- `App.tsx` bootstrap: `useEffect` registers MockAdapter, OpenAiAdapter, StabilityAdapter in AdapterRegistry and calls `initProviderStore()`
- All 5 existing NodeEngine tests pass confirming no regression from __nodeId injection

## Task Commits

Each task was committed atomically:

1. **Task 1: Create aiBridge bridge factory + tests** — `7896dc2` (feat)
2. **Task 2: Create ProviderStore singleton + Dexie storage backend** — `9b43f21` (feat)
3. **Task 3: Inject __nodeId, swap resolvers, wire App.tsx bootstrap** — `e4c95c0` (feat)

**Plan metadata:** This summary file.

## Files Created

- `apps/web/src/engine/aiBridge.ts` — Bridge factory `createAiExecutor()` and provider resolution `resolveProviderId()`
- `apps/web/src/engine/__tests__/aiBridge.test.ts` — 5 tests for factory contract and provider resolution
- `apps/web/src/indexedb/providerStorage.ts` — DexieProviderStorage implementing ProviderConfigStorage
- `apps/web/src/stores/providerStoreSingleton.ts` — Module-level ProviderStore singleton

## Files Modified

- `apps/web/src/engine/NodeEngine.ts` — `__nodeId: node.id` injected via non-mutating spread in `execute()`
- `apps/web/src/engine/resolvers.ts` — text-to-image and style resolvers use AIQueueStore + bridge
- `apps/web/src/App.tsx` — Adapter registration + ProviderStore init in bootstrap useEffect

## Decisions Made

- **resolveProviderId uses model name prefix matching**: The node's `model` field (e.g., `dall-e-3`, `stable-diffusion-xl`) is checked first; if no match, node type defaults apply (style -> stability, text-to-image -> openai). This allows users to override provider via model selection.
- **DexieProviderStorage uses direct import**: The plan specified dynamic `require()` to avoid circular dependencies, but `db.ts` has no circular dependency with `ai-core` (Dexie schema is standalone). Direct import is cleaner and allows TypeScript type checking.
- **Non-mutating spread for __nodeId injection**: `{ ...node.data, __nodeId: node.id }` creates a new object each call, ensuring `node.data` is never accidentally mutated by resolvers downstream. The plan's design choice is preserved exactly.
- **No nodeIdAwareExecutor wrapper in resolvers.ts**: The plan noted this wrapper was no longer needed because NodeEngine already injects `__nodeId`. resolvers.ts reads `(nodeData as any).__nodeId` directly.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Threat Surface Scan

Per the plan's threat model:
- **T-05-06 (Information Disclosure)**: Bridge stores errors via `setNodeError()` which uses the adapter's sanitized error output. Verified adapters use `sanitizeErrorMessage()` before surfacing errors. Bridge does not bypass sanitization.
- **T-05-07 (Elevation of Privilege)**: Bridge validates `AdapterRegistry.get(providerId)` before instantiating any adapter. Unknown providerId throws "No adapter registered" — no adapter executes without valid config.
- **T-05-08 (Prompt injection)**: Bridge passes user prompt text through tempura's `renderPrompt()` which escapes `{{variable}}` content by default. No unescaped `{{{ }}}` syntax used for user-provided text.
- **T-05-09 (EventEmitter listener memory leak)**: `adapter.removeAllListeners()` called in `finally` block after every `adapter.execute()` call. Verified by grep.
- **T-05-10 (Spoofing)**: providerId derived from node's model selection via `resolveProviderId()` — unknown models fall back to default provider; if no adapter, throws error.
- **T-05-11 (Tampering)**: `__nodeId` is set by NodeEngine using `node.id` in a spread that always overwrites any existing `__nodeId` in node.data. User-controlled `__nodeId` is harmless as it's always overwritten.

## Self-Check: PASSED

- Files created: 4/4 verified present
- Commits: 3/3 verified in git log
- Tests: 5/5 bridge tests passing; 53/53 targeted tests passing (aiBridge + NodeEngine + AIQueueStore + rateLimits)
- NodeEngine __nodeId injection: confirmed via grep (`__nodeId: node.id` at line 215)
- removeAllListeners in finally: confirmed via grep (aiBridge.ts line 120)
- prompt/merge/preview resolvers unchanged: confirmed via grep (sync stubs preserved)
- All 3 adapters registered in App.tsx: confirmed via grep
- No nodeIdAwareExecutor wrapper: confirmed (resolve uses __nodeId from nodeData directly)
- All acceptance criteria met per plan specification

---
*Phase: 05-ai-execution-infrastructure*
*Completed: 2026-07-01*
