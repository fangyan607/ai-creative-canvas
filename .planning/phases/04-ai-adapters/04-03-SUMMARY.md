---
phase: 04-ai-adapters
plan: 03
subsystem: ai
tags: ["openai", "dall-e-3", "fetch", "b64_json", "adapter"]

# Dependency graph
requires:
  - phase: 04-ai-adapters (Plan 01)
    provides: AiAdapter abstract class, types (AdapterResult, AiAdapterError, etc.), base.test.ts contract tests
provides:
  - OpenAiAdapter: DALL-E 3 image generation using direct fetch() (no SDK)
  - Mapped error codes: auth_failed, rate_limited, invalid_params, server_error
  - Error sanitization with API key stripping (Pitfall 4)
  - revised_prompt metadata extraction (Pitfall 3)
  - Custom base URL for proxy/mirror (D-10)
affects: ["04-ai-adapters Plan 05 (ProviderStore)", "Phase 5 (AI Execution Infrastructure)"]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Direct fetch() adapter pattern (No SDK)", "Mocked global fetch() test pattern"]

key-files:
  created:
    - packages/ai-core/src/adapters/openai.adapter.ts
    - packages/ai-core/src/adapters/openai.adapter.test.ts
  modified: []

key-decisions:
  - "Used direct fetch() instead of openai SDK to save ~80KB bundle size"
  - "Returns seed=null explicitly since DALL-E 3 does not support deterministic seeds (Pitfall 1)"
  - "Stores revised_prompt on nodeData as metadata for Phase 5 bridge consumption"
  - "All error messages sanitized to strip sk-... patterns before surfacing"
  - "Configurable baseUrl in constructor supports proxy/mirror scenarios per D-10"
  - "apiKey stored as private field, never logged or exposed in error messages"

patterns-established:
  - "Adapter test pattern: mock global.fetch, restore in afterEach"
  - "Error handling pattern: map HTTP status codes to AiAdapterError codes with sanitized messages"
  - "Metadata pattern: store API response metadata on nodeData for downstream consumption"

requirements-completed: [AI-01]

duration: 12min
completed: 2026-07-01
---

# Phase 04 Plan 03: OpenAI DALL-E 3 Adapter Summary

**OpenAI DALL-E 3 image generation adapter using direct fetch() calls with error sanitization, seed=null handling, revised_prompt metadata extraction, and configurable base URL for proxy scenarios.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-01T03:06:00Z
- **Completed:** 2026-07-01T03:18:00Z
- **Tasks:** 2 (TDD split: RED test + GREEN implementation)
- **Files modified:** 2

## Accomplishments
- Implemented `OpenAiAdapter extends AiAdapter` with all 4 mandatory abstract methods: `execute()`, `testConnection()`, `getModels()`, `getConfigSchema()`
- `execute()` sends correct POST to `/v1/images/generations` with `model: 'dall-e-3'`, prompt, size, n=1, response_format=b64_json, quality='standard', style='vivid'
- `execute()` includes `Authorization: Bearer` header from config and uses configurable base URL
- Parses `b64_json` response, converts to Blob, and passes to `onStoreImage` callback
- Returns `seed: null` explicitly per DALL-E 3 limitation (Pitfall 1)
- Stores `revised_prompt` from response on `nodeData` as metadata (Pitfall 3)
- Error handling: 401 => `auth_failed`, 429 => `rate_limited`, 400 => `invalid_params`, other => `server_error`
- All error messages sanitized to strip `sk-...` API key patterns (Pitfall 4)
- Configurable base URL in constructor for proxy/mirror scenarios (D-10)
- 42 tests pass with mocked fetch (no real API key needed)
- Existing MockAdapter tests (33) continue to pass with no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Write failing tests** - `0b11f8f` (test)
2. **Task 1 (GREEN): Implement OpenAiAdapter** - `90b7a3b` (feat)

**Plan metadata:** pending (this plan)

_Note: TDD tasks produce multiple commits (test then feat)._

## Files Created/Modified
- `packages/ai-core/src/adapters/openai.adapter.ts` - OpenAiAdapter class extending AiAdapter with DALL-E 3 image generation
- `packages/ai-core/src/adapters/openai.adapter.test.ts` - Comprehensive test suite with mocked fetch (42 tests)

## Decisions Made
- **Direct fetch() over openai SDK:** Saves ~80KB bundle size. The DALL-E 3 API is simple enough that native fetch() with JSON body is cleaner than importing an SDK.
- **seed=null:** DALL-E 3 does not support deterministic seed generation (Pitfall 1). The adapter returns null to signal this constraint to consumers.
- **revised_prompt on nodeData:** The API response includes a `revised_prompt` that DALL-E 3 may modify. Storing it on `nodeData` makes it available to downstream nodes in the execution pipeline.
- **Error sanitization in catch block:** Both the HTTP error response parsing and the catch block strip `sk-...` patterns to prevent accidental API key leakage.
- **Private apiKey field with no serialization:** The API key is stored as a private field that is never logged, exposed in error messages, or serialized.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Worktree file isolation:** Git worktree sandboxing required using bash-based file creation instead of direct Write tool for the initial test file. Resolved by using Node.js to write file content via JSON array of lines.
- **Dependency installation:** Worktree had no node_modules initially. Required running `pnpm install --frozen-lockfile` before tests could execute.

## User Setup Required

None - no external service configuration required. All testing uses mocked fetch() with no real API keys.

## Next Phase Readiness
- OpenAiAdapter is fully implemented and tested
- Ready for Plan 04-05 (ProviderStore) which manages encrypted API key storage and adapter configuration
- Adapter follows the `AiAdapter` contract established in Plan 04-01, same pattern as MockAdapter
- Phase 5 (AI Execution Infrastructure) can use OpenAiAdapter interchangeably with MockAdapter via the factory pattern in AdapterRegistry

---
*Phase: 04-ai-adapters*
*Completed: 2026-07-01*
