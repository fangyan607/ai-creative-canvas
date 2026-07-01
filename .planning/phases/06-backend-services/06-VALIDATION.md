---
phase: 06
slug: backend-services
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-01
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.x (workspace) |
| **Config file** | `apps/backend/vitest.config.ts` (Wave 0) |
| **Quick run command** | `cd apps/backend && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd apps/backend && npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --changed`
- **After every plan wave:** Run `cd apps/backend && npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | BKND-01 | T-06-01 | AI proxy reads API keys from env vars | unit | `npx vitest run apps/backend/src/routes/__tests__/ai.test.ts` | ❌ W0 | ⬜ pending |
| 06-02-01 | 01 | 1 | BKND-01 | — | SSE streaming sends progress events | integration | `npx vitest run apps/backend/src/routes/__tests__/ai.test.ts` | ❌ W0 | ⬜ pending |
| 06-03-01 | 01 | 1 | BKND-01 | — | AI proxy rejects unknown providerId | unit | `npx vitest run apps/backend/src/routes/__tests__/ai.test.ts` | ❌ W0 | ⬜ pending |
| 06-04-01 | 01 | 1 | BKND-01 | T-06-01 | AI proxy returns 400 for missing providerId | unit | `npx vitest run apps/backend/src/routes/__tests__/ai.test.ts` | ❌ W0 | ⬜ pending |
| 06-05-01 | 02 | 1 | BKND-02 | — | File upload saves to correct date-sharded directory | integration | `npx vitest run apps/backend/src/routes/__tests__/files.test.ts` | ❌ W0 | ⬜ pending |
| 06-06-01 | 02 | 1 | BKND-02 | — | File download returns correct file by fileId | integration | `npx vitest run apps/backend/src/routes/__tests__/files.test.ts` | ❌ W0 | ⬜ pending |
| 06-07-01 | 02 | 1 | BKND-02 | T-06-02 | File type validation rejects unsupported types | unit | `npx vitest run apps/backend/src/routes/__tests__/files.test.ts` | ❌ W0 | ⬜ pending |
| 06-08-01 | 02 | 1 | BKND-02 | T-06-03 | File size validation rejects >10MB | unit | `npx vitest run apps/backend/src/routes/__tests__/files.test.ts` | ❌ W0 | ⬜ pending |
| 06-09-01 | 01 | 1 | BKND-01 | — | SSE broadcast manager tracks and broadcasts | unit | `npx vitest run apps/backend/src/services/__tests__/sseBroadcast.test.ts` | ❌ W0 | ⬜ pending |
| 06-10-01 | 03 | 2 | BKND-01 | — | Frontend SSEService connects and dispatches | unit | `npx vitest run apps/web/src/services/__tests__/sseService.test.ts` | ❌ W0 | ⬜ pending |
| 06-11-01 | 03 | 2 | BKND-01 | — | useSSEProgress maps SSE events to EngineStore | unit | `npx vitest run apps/web/src/services/__tests__/useSSEProgress.test.ts` | ❌ W0 | ⬜ pending |
| 06-12-01 | 01 | 1 | BKND-01 | T-06-04 | Health endpoint returns status+timestamp only | unit | `npx vitest run apps/backend/src/routes/__tests__/health.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Threat References

| Threat ID | Description | STRIDE | Mitigation |
|-----------|-------------|--------|------------|
| T-06-01 | API key leakage via error messages | Information Disclosure | Backend reuses `sanitizeErrorMessage()` from `@ac-canvas/ai-core` |
| T-06-02 | File path traversal via malicious fileId | Tampering | Validate fileId as UUID format; verify resolved path is within uploads dir |
| T-06-03 | Large file upload DoS | Denial of Service | Enforce 10MB max file size; reject before disk write |
| T-06-04 | Env var exposure via health endpoint | Information Disclosure | Health endpoint returns only `status` + `timestamp` |
| T-06-05 | SSE control field injection (CVE-2026-29085) | Tampering | Already mitigated — Hono 4.12.27 > 4.12.4 fix threshold |

---

## Wave 0 Requirements

- [ ] `apps/backend/package.json` — add vitest as devDep, test script
- [ ] `apps/backend/vitest.config.ts` — minimal Vitest config
- [ ] `apps/backend/src/routes/__tests__/ai.test.ts` — AI proxy route tests (with mocks)
- [ ] `apps/backend/src/routes/__tests__/files.test.ts` — file upload/download tests
- [ ] `apps/backend/src/services/__tests__/sseBroadcast.test.ts` — SSE broadcast manager tests
- [ ] `apps/web/src/services/__tests__/sseService.test.ts` — frontend SSEService tests
- [ ] `apps/web/src/services/__tests__/useSSEProgress.test.ts` — frontend SSE hook tests

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SSE real-time push in browser | BKND-01 | Requires browser with EventSource API | Open two browser tabs; trigger AI generation in one; verify progress events appear in both |
| VITE_AI_PROXY_MODE toggle | BKND-01 | Build-time env var, requires rebuild | Set `VITE_AI_PROXY_MODE=proxy`, rebuild, verify API calls go through backend not direct |
| File download in browser | BKND-02 | Browser navigation to URL | Open `/api/files/{fileId}` in browser, verify image displays |
| Auto-reconnect on SSE disconnect | BKND-01 | Network simulation hard to automate | Stop backend; restart; verify SSE auto-reconnects and new events arrive |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
