---
phase: 06-backend-services
plan: 01
type: execute
wave: 1
subsystem: backend
tags: [hono, sse, ai-proxy, file-storage, backend-infrastructure]
requires: [ai-core]
provides: [backend-skeleton, sse-broadcast, ai-proxy, file-service]
affects: [apps/web (future proxy mode wiring)]
tech-stack:
  added:
    - hono ^4.12.27
    - "@hono/node-server ^2.0.6"
    - tsx ^4.19.2
  patterns:
    - Hono app factory + router mounting
    - SSE broadcast manager with callback-based client tracking
    - AI proxy using AdapterRegistry from @ac-canvas/ai-core
    - Date-sharded local disk file storage
key-files:
  created:
    - apps/backend/package.json
    - apps/backend/tsconfig.json
    - apps/backend/vitest.config.ts
    - apps/backend/src/config.ts
    - apps/backend/src/app.ts
    - apps/backend/src/index.ts
    - apps/backend/src/routes/ai.ts
    - apps/backend/src/routes/files.ts
    - apps/backend/src/routes/sse.ts
    - apps/backend/src/middleware/auth.ts
    - apps/backend/src/services/sseBroadcast.ts
    - apps/backend/src/services/fileStore.ts
    - apps/backend/src/services/__tests__/sseBroadcast.test.ts
    - apps/backend/src/routes/__tests__/health.test.ts
    - apps/backend/src/routes/__tests__/ai.test.ts
    - apps/backend/src/routes/__tests__/files.test.ts
  modified:
    - .gitignore (added apps/backend/uploads/)
decisions:
  - BackendMockAdapter wrapper forces fallback mode (no OffscreenCanvas dependency in Node.js)
  - SSE uses per-client event queue + polling loop (100ms) instead of external writeSSE ref pattern
  - Auth middleware is pass-through stub (deferred to v0.2 per D-08)
metrics:
  duration: ~15 minutes
  completed_date: "2026-07-01"
---

# Phase 6 Plan 1: Backend Services Foundation

**One-liner:** Hono 4.x backend at `apps/backend/` providing SSE streaming (`/api/sse/progress`), AI proxy (`/api/ai/generate`), and file upload/download (`/api/files/upload`, `/api/files/:fileId`) -- all three services built from the ground up with full test coverage and threat-model mitigations applied.

## Requirement Status

| Requirement | Status | Verification |
|-------------|--------|-------------|
| BKND-01 (AI proxy API) | Complete | AI proxy route accepts providerId, instantiates adapters via AdapterRegistry, supports JSON and SSE modes |
| BKND-02 (File upload/download) | Complete | File upload with type/size validation, date-sharded storage; download with UUID validation and path traversal prevention |

## Tasks

### Task 1: Backend Project Scaffolding

**Files created:** `package.json`, `tsconfig.json`, `vitest.config.ts`, `config.ts`, `app.ts`, `index.ts`, placeholder routers (ai.ts, files.ts, sse.ts), auth.ts, health.test.ts

**Commit:** `334cadb`

- Hono app factory (`createApp()`) with adapter registration and 3 router mounts
- Typed config reader for env vars: PORT (3001), UPLOAD_DIR (./uploads), AI_OPENAI_KEY, AI_STABILITY_KEY, maxFileSize (10MB)
- Health endpoint at GET /api/health returning only `{ status: 'ok', timestamp }` (T-06-04 mitigation)
- Placeholder routers for ai, files, sse (made real in Tasks 2/3)
- Auth middleware pass-through stub (deferred to v0.2 per D-08)
- BackendMockAdapter wrapper forces `fallback` mode (OffscreenCanvas not available in Node.js)

### Task 2: SSE Broadcast Manager + SSE Endpoint + Auth Middleware

**Files created/updated:** `sseBroadcast.ts`, `sse.ts`, `sseBroadcast.test.ts`

**Commit:** `67ad7ff`

- `SseBroadcastManager` singleton with `addClient(id, callback)`, `removeClient(id)`, `broadcast(event)`, `clientCount`, `clear()`
- `SseEvent` interface with fields matching D-03: type, taskId, nodeId, providerId, percent, stage, code, message, result, timestamp
- SSE endpoint at GET /api/sse/progress uses `streamSSE()` with per-client event queue and polling loop (100ms) -- avoids the external-writeSSE-ref assumption
- Client cleanup via try/catch in broadcast and stream.onAbort
- 6 sseBroadcast unit tests all pass

### Task 3: AI Proxy Route + File Routes + Full Test Suites

**Files created/updated:** `ai.ts`, `files.ts`, `fileStore.ts`, `ai.test.ts`, `files.test.ts`, `app.ts`

**Commit:** `f44adfe`

- **AI proxy (POST /api/ai/generate):**
  - Provider lookup via `AdapterRegistry.getInstance().get(providerId)`
  - API keys read from `config.aiKeys[providerId]` (env vars) -- never from client request
  - Fresh adapter instance per request with `adapter.removeAllListeners()` in finally block
  - `onStoreImage` callback saves blobs to date-sharded local disk via `fs.writeFile`
  - SSE mode (when `Accept: text/event-stream`): wire adapter progress/done events, handle errors
  - JSON mode: return `{ success, taskId, result }` or `{ success, taskId, error }` with sanitizeErrorMessage (T-06-01)
  - 5 tests: missing providerId, unknown provider, MockAdapter JSON, SSE mode, empty providerId

- **File routes:**
  - POST /api/files/upload: multipart parse via `c.req.parseBody()`, file type (PNG/JPG/WebP) and size (10MB max) validation, UUID-based storage in date-sharded directories
  - GET /api/files/:fileId: UUID format validation via regex `/^[0-9a-f-]{36}$/` (T-06-02), path traversal check via `path.resolve` prefix verification, Content-Disposition inline
  - 7 tests: no file, valid PNG, unsupported type, oversize, download, missing UUID, path traversal attempt

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| JWT auth middleware | `apps/backend/src/middleware/auth.ts` | Deferred to v0.2 per D-08. Currently a pass-through `await next()` stub. |

## Threat Surface

| Flag | File | Description |
|------|------|-------------|
| threat_flag: api_endpoint | apps/backend/src/routes/ai.ts | New POST /api/ai/generate endpoint (covered by T-06-01) |
| threat_flag: api_endpoint | apps/backend/src/routes/files.ts | New POST /api/files/upload and GET /api/files/:fileId endpoints (covered by T-06-02, T-06-03) |
| threat_flag: api_endpoint | apps/backend/src/routes/sse.ts | New GET /api/sse/progress endpoint (covered by T-06-05) |

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

| Check | Status |
|-------|--------|
| `npx vitest run` -- full test suite | PASSED (20 tests across 4 files) |
| All 4 test files pass | PASSED |
| Health endpoint returns `{ status, timestamp }` only | PASSED (verified in health.test.ts) |
| AI proxy accepts known providerId via MockAdapter | PASSED |
| File upload returns fileId and download returns file | PASSED |
| File path traversal returns 404 | PASSED (T-06-02) |

## Self-Check: PASSED

All 16 created files verified. All 4 commits verified.
