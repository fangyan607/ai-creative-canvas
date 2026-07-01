---
phase: 05
slug: ai-execution-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-01
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.x |
| **Config file** | `packages/ai-core/vitest.config.ts` (exists, jsdom); `apps/web/vitest.config.ts` (check — may need creation) |
| **Quick run command** | `pnpm --filter @ac-canvas/ai-core exec vitest run --changed` |
| **Full suite command** | `pnpm --recursive exec vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @ac-canvas/ai-core exec vitest run --changed` and `pnpm --filter @ac-canvas/web exec vitest run --changed`
- **After every plan wave:** Run `pnpm --recursive exec vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | AI-04 | T-05-01 / — | Rate limiter prevents concurrent overrun | unit | `npx vitest run packages/ai-core/src/config/__tests__/rateLimits.test.ts` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | AI-04 | — | AIQueueStore enqueue/dequeue per provider | unit | `npx vitest run apps/web/src/stores/__tests__/aiQueueStore.test.ts` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | AI-08 | T-05-02 | Bridge calls adapter with correct providerId | integration | `npx vitest run apps/web/src/engine/__tests__/aiBridge.test.ts` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 1 | AI-07 | T-05-03 | EventEmitter progress updates EngineStore | integration | `npx vitest run apps/web/src/engine/__tests__/aiBridge.test.ts` | ❌ W0 | ⬜ pending |
| 05-02-03 | 02 | 1 | AI-08 | T-05-04 | Fail-stop: adapter error marks downstream skipped | integration | `npx vitest run apps/web/src/engine/__tests__/aiBridge.test.ts` | ❌ W0 | ⬜ pending |
| 05-03-01 | 03 | 2 | AI-08 | — | Adapter bootstrap wires all 3 adapters at mount | integration | Manual: verify App.tsx registers Mock/OpenAI/Stability adapters | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/ai-core/src/config/__tests__/rateLimits.test.ts` — Rate limiter sliding window unit tests
- [ ] `apps/web/src/stores/__tests__/aiQueueStore.test.ts` — AIQueueStore queue operations + rate limiter integration
- [ ] `apps/web/src/engine/__tests__/aiBridge.test.ts` — Bridge executor, EventEmitter wiring, fail-stop behavior

Note: Some test files may be auto-created by the plan executor during Wave 1. Wave 0 marks the intentional test files that should exist at phase gate.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Adapter bootstrap wiring | AI-08 | Requires browser environment with all 3 adapter modules loaded | 1. Open app in browser 2. Check console for "Adapters registered" log 3. Verify MockAdapter is default |
| Full E2E flow: queue → execute → result on canvas | AI-04, AI-07, AI-08 | Requires browser + node graph interaction | Phase 8 E2E tests will cover this. Phase 5: manual smoke test only. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
