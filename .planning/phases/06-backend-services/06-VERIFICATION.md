---
phase: 06-backend-services
verified: 2026-07-01T10:15:00Z
status: passed
score: 9/9 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Vite dev server proxies /api/* requests to backend at localhost:3001"
    status: resolved
    reason: "Fixed in 919f506. Proxy block re-added to apps/web/vite.config.ts: server.proxy { '/api': { target: 'http://localhost:3001', changeOrigin: true } }"
    artifacts:
      - path: "apps/web/vite.config.ts"
        issue: "resolved — proxy section present at line 56-60"
    missing: []
  - truth: ".gitignore entry for apps/backend/uploads/ directory"
    status: resolved
    reason: "Fixed in 919f506. apps/backend/uploads/ entry added to .gitignore"
    artifacts:
      - path: ".gitignore"
        issue: "Missing 'apps/backend/uploads/' exclusion; was present in committed HEAD"
    missing:
      - "Re-add 'apps/backend/uploads/' to .gitignore"
---

# Phase 6: Backend Services Verification Report

**Phase Goal:** Backend proxies AI requests to hide client-side API keys and handles file storage
**Verified:** 2026-07-01T10:15:00Z
**Status:** gaps_found
**Re-verification:** No (initial verification)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Client sends AI generation requests through the backend proxy; API keys remain server-side only | VERIFIED | `apps/backend/src/routes/ai.ts` reads API keys from `config.aiKeys[providerId]` (env vars), never from request body. Tests pass: empty providerId returns 400, unknown provider returns 400, MockAdapter returns valid result. Server smoke test confirms mock generation works. |
| 2 | User can upload image files to the backend and download them later | VERIFIED | `apps/backend/src/routes/files.ts` implements POST /upload (multipart, type/size validation, date-sharded storage) and GET /:fileId (UUID validation, path traversal check, Content-Disposition). All 7 file route tests pass. |
| 3 | Frontend works in both direct-API-key mode (dev) and backend-proxy mode (production) with a configuration toggle | PARTIAL | Proxy mode code in `aiBridge.ts` (isProxyMode check + fetch to /api/ai/generate) and `useSSEProgress.ts` (proxy mode guard via VITE_AI_PROXY_MODE) are present and verified. However, the Vite dev proxy config (server.proxy['/api']) was removed by uncommitted working-tree changes -- the committed HEAD has it, but the on-disk file does not. |
| 4 | Frontend opens a single SSE connection at /api/sse/progress for real-time AI progress | VERIFIED | Backend SSE endpoint at `apps/backend/src/routes/sse.ts` with streamSSE + polling loop. Frontend SSEService class connects to /api/sse/progress by default. initSSE() called in App.tsx bootstrap. SSE broadcast tests pass. |
| 5 | SSE events (progress/error/done) map to EngineStore.setNodeStatus() and setNodeError() | VERIFIED | `apps/web/src/services/useSSEProgress.ts` registers handlers: progress -> setNodeStatus(nodeId, 'executing'), error -> setNodeStatus(nodeId, 'error') + setNodeError, done -> setNodeStatus(nodeId, 'done'). All useSSEProgress tests pass. |
| 6 | Frontend AI bridge sends HTTP POST to backend instead of direct adapter call when proxy mode is active | VERIFIED | `apps/web/src/engine/aiBridge.ts` lines 43-82: checks `import.meta.env.VITE_AI_PROXY_MODE === 'proxy'` and returns an executor that calls `fetch('/api/ai/generate', ...)`. Existing direct-mode code (lines 92-175) preserved unchanged. |
| 7 | Vite dev server proxies /api/* requests to backend at localhost:3001 | FAILED (regression) | Committed in 0606cf6 but removed by uncommitted working-tree changes to `apps/web/vite.config.ts`. The proxy section is absent from the on-disk file. |
| 8 | File path traversal is prevented by UUID validation | VERIFIED | `apps/backend/src/routes/files.ts` line 17 uses regex `/^[0-9a-f-]{36}$/` for UUID validation (T-06-02), and lines 87-90 verify `path.resolve(record.path)` starts with `resolvedUploadDir` prefix. Test 7 (GET /api/files/../../etc/passwd returns 404) passes. |
| 9 | SSEService can be independently instantiated and tested without a real EventSource | VERIFIED | `apps/web/src/services/sseService.ts` is a standalone class wrapping EventSource. Tests use a mock EventSource class with `triggerEvent()` helper. All 11 SSE service tests pass. |

**Score:** 8/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `apps/backend/src/app.ts` | Hono app factory with router mounts + adapter registration | VERIFIED | createApp() exports Hono instance, registers 3 adapters (BackendMockAdapter, OpenAiAdapter, StabilityAdapter), mounts 3 routers, adds /api/health endpoint. |
| `apps/backend/src/index.ts` | Server entry point on port 3001 | VERIFIED | serve({ fetch: app.fetch, port: config.port }) with startup log. Server starts and responds correctly. |
| `apps/backend/src/config.ts` | Typed config reader for env vars | VERIFIED | Exports port, uploadDir, aiKeys (openai/stability), maxFileSize. Reads from process.env with defaults. |
| `apps/backend/src/services/sseBroadcast.ts` | SseBroadcastManager singleton | VERIFIED | Static getInstance(), addClient, removeClient, broadcast, clientCount. Callback-based pattern with try/catch safety. 6 tests pass. |
| `apps/backend/src/routes/sse.ts` | GET /api/sse/progress SSE endpoint | VERIFIED | Uses streamSSE with per-client queue + 100ms polling loop. Sends initial 'connected' event. Cleans up on abort. |
| `apps/backend/src/routes/ai.ts` | POST /api/ai/generate AI proxy | VERIFIED | AdapterRegistry lookup, env-var API keys, onStoreImage callback saves to disk, SSE + JSON modes, removeAllListeners in finally, sanitizeErrorMessage for JSON errors. 5 tests pass. |
| `apps/backend/src/routes/files.ts` | File upload/download with UUID validation | VERIFIED | POST /upload (multipart, type/size validation, date-sharded storage), GET /:fileId (UUID regex, path traversal check, Content-Type header). 7 tests pass. |
| `apps/backend/src/middleware/auth.ts` | JWT placeholder (deferred stub) | VERIFIED | Pass-through middleware per D-08. Calls await next() with no auth logic. |
| `apps/backend/src/services/fileStore.ts` | File metadata model + type utilities | VERIFIED | FileRecord interface, fileMetadata Map, ALLOWED_TYPES set, getExtension() utility. |
| `apps/web/src/services/sseService.ts` | SSEService EventSource wrapper | VERIFIED | SseEventPayload interface, SseEventHandler type, connect/disconnect/on/isConnected with typed dispatch and reconnect capping. |
| `apps/web/src/services/useSSEProgress.ts` | SSE-to-EngineStore React hook | VERIFIED | initSSE, destroySSE, useSSEProgress with proxy mode guard. Maps progress/error/done to EngineStore actions. Individual selectors for minimal re-renders. |
| `apps/web/vite.config.ts` | Vite dev proxy config | EXISTS BUT INCOMPLETE | Proxy config (server.proxy) was committed in HEAD but removed by uncommitted working-tree changes. Current on-disk file does not have the proxy section. |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| ai.ts | registry.ts | AdapterRegistry.getInstance().get(providerId) | WIRED | ai.ts line 38: `AdapterRegistry.getInstance().get(providerId)` |
| ai.ts | config.ts | config.aiKeys[providerId] | WIRED | ai.ts line 44: `config.aiKeys[providerId] ?? ''` reads from env vars |
| sse.ts | sseBroadcast.ts | SseBroadcastManager.getInstance() | WIRED | sse.ts line 16: `SseBroadcastManager.getInstance()`, line 26: `sseManager.addClient(clientId, ...)` |
| files.ts | config.ts | config.uploadDir | WIRED | files.ts lines 43, 88: `path.join(config.uploadDir, dateStr)` and `path.resolve(config.uploadDir)` |
| app.ts | routes/ai, files, sse | app.route('/api/...', router) | WIRED | app.ts lines 38-40: 3 app.route() calls. Imports from ./routes/ai, ./routes/files, ./routes/sse |
| vite.config.ts | localhost:3001 | server.proxy | NOT_WIRED (regression) | Present in committed HEAD (0606cf6) but removed by uncommitted working-tree changes |
| sseService.ts | /api/sse/progress | constructor(url = '/api/sse/progress') + new EventSource(url) | WIRED | sseService.ts line 45: default URL, line 56: `new EventSource(this.url)` |
| useSSEProgress.ts | engineStore.ts | useEngineStore(s => s.setNodeStatus/setNodeError) | WIRED | useSSEProgress.ts lines 93-94: fine-grained selectors, lines 103, 108, 115: handler calls |
| aiBridge.ts | /api/ai/generate | fetch('/api/ai/generate') | WIRED | aiBridge.ts line 50: `fetch('/api/ai/generate', ...)` in proxy mode path |
| App.tsx | useSSEProgress.ts | initSSE() on mount | WIRED | App.tsx line 13: import, line 62: useSSEProgress(), line 90: initSSE() in useEffect |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| ai.ts (AI proxy) | providerId, params | Request body | Yes (validated) | FLOWING |
| ai.ts (adapter) | AdapterClass | AdapterRegistry.get(providerId) | Yes (registered adapters) | FLOWING |
| ai.ts (API key) | apiKey | config.aiKeys[providerId] (env vars) | Yes (process.env) | FLOWING |
| ai.ts (image blob) | onStoreImage | fs.writeFile to date-sharded dir | Yes (disk writes) | FLOWING |
| ai.ts (result) | adapterResult | adapter.execute(params, {}, onStoreImage) | Yes (MockAdapter returns real data) | FLOWING |
| files.ts (upload) | file, fileId, metadata | c.req.parseBody(), crypto.randomUUID(), fs.writeFile | Yes (disk writes + metadata map) | FLOWING |
| files.ts (download) | fileId, record, buffer | metadata Map + fs.readFile | Yes (disk reads) | FLOWING |
| sseService.ts | SseEventPayload | EventSource event.data parsed as JSON | Yes (backed by SSE stream) | FLOWING |
| useSSEProgress.ts | payload.nodeId | sseServiceInstance.on() handler | Yes (mapped to EngineStore actions) | FLOWING |
| aiBridge.ts (proxy) | response data | fetch('/api/ai/generate') JSON result | Yes (validated with data.success check) | FLOWING |

All data flows are connected and produce real data. No hollow artifacts.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Backend starts on port 3001 | `cd apps/backend && npx tsx src/index.ts & ... curl localhost:3001/api/health` | `{"status":"ok","timestamp":...}` | PASSED |
| Health endpoint returns only status + timestamp | curl result | Exactly `{ status, timestamp }`, no extra fields | PASSED |
| AI proxy accepts MockAdapter | curl -X POST /api/ai/generate -d '{"providerId":"mock","params":{...}}' | `{"success":true,"taskId":"...","result":{"imageBlobId":"...","width":512,"height":512,...}}` | PASSED |
| AI proxy rejects unknown provider | curl -X POST /api/ai/generate -d '{"providerId":"nonexistent"}' | `{"error":"Unknown provider: nonexistent"}` (HTTP 400) | PASSED |
| All backend tests pass | `cd apps/backend && npx vitest run` | 4 files, 20 tests, all pass | PASSED |
| All frontend SSE tests pass | `cd apps/web && npx vitest run` | 13 files, 106 tests, all pass | PASSED |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| BKND-01 | 06-01, 06-02 | AI backend proxy API that hides client API keys | SATISFIED | /api/ai/generate route reads keys from env vars (config.aiKeys), uses AdapterRegistry, supports JSON + SSE modes. Proxy mode dispatch in aiBridge.ts. Tests + smoke test pass. |
| BKND-02 | 06-01 | File upload and download service | SATISFIED | /api/files/upload (multipart, type/size validation, date-sharded storage) and /api/files/:fileId (UUID validation, path traversal check, Content-Disposition). 7 tests pass. |

No orphaned requirements: BKND-01 and BKND-02 are both claimed by PLAN frontmatter and satisfied by evidence.

### Anti-Patterns Found

No blockers found. The auth middleware in `apps/backend/src/middleware/auth.ts` is a documented pass-through stub (deferred to v0.2 per D-08) -- this is intentional, not a gap.

### Gaps Summary

**Gap 1: Vite proxy config removed from working tree**
- **Truth:** "Vite dev server proxies /api/* requests to backend at localhost:3001"
- **What happened:** The proxy configuration `server.proxy['/api'] -> http://localhost:3001` was properly committed in `0606cf6` as part of Plan 06-02 Task 1. However, uncommitted working-tree changes to `apps/web/vite.config.ts` removed the proxy block (along with several alias changes). The on-disk `vite.config.ts` does not have the proxy config.
- **Impact:** In dev mode (VITE_AI_PROXY_MODE=proxy), the frontend on port 5173 will attempt to fetch /api/ai/generate, but without the Vite proxy, the request goes to Vite's dev server (port 5173), not the backend (port 3001). This would cause CORS errors or 404s.
- **Fix:** Re-add the proxy block to `server:` in `vite.config.ts`:
  ```typescript
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
    },
  },
  ```

**Gap 2: .gitignore entry for apps/backend/uploads/ removed from working tree**
- **What happened:** The `.gitignore` entry `apps/backend/uploads/` was committed in `03ea842` but removed by the same uncommitted working-tree changes.
- **Impact:** The test upload artifacts in `apps/backend/uploads/` are now visible to git and could be accidentally committed.
- **Fix:** Re-add `apps/backend/uploads/` to `.gitignore`.

Both gaps are **regressions from uncommitted working-tree changes**, not failures in the Phase 6 implementation. The committed Phase 6 work is complete and correct.

---

_Verified: 2026-07-01_
_Verifier: Claude (gsd-verifier)_
