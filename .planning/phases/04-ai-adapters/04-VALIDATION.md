---
phase: 4
slug: ai-adapters
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-01
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.x |
| **Config file** | `packages/ai-core/vitest.config.ts` (Wave 0) |
| **Quick run command** | `pnpm --filter @ac-canvas/ai-core vitest run` |
| **Full suite command** | `pnpm vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick test for affected module: `pnpm --filter @ac-canvas/ai-core vitest run packages/ai-core/src/adapters/{name}.test.ts`
- **After every plan wave:** Run full ai-core suite: `pnpm --filter @ac-canvas/ai-core vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | AI-01 | — | N/A | unit | `pnpm --filter ai-core vitest run openai.adapter.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | AI-02 | — | N/A | unit | `pnpm --filter ai-core vitest run stability.adapter.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | AI-03 | — | N/A | unit | `pnpm --filter ai-core vitest run mock.adapter.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | AI-05 | T-04-01 | Keys encrypted with AES-256-GCM at rest | unit | `pnpm --filter ai-core vitest run providerStore.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 1 | AI-06 | — | N/A | unit | `pnpm --filter ai-core vitest run templateEngine.test.ts` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 2 | AI-01, AI-02 | — | N/A | integration | `pnpm --filter ai-core vitest run adapters/base.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/ai-core/vitest.config.ts` — package-level Vitest config
- [ ] `packages/ai-core/tsconfig.json` — TypeScript config
- [ ] `packages/ai-core/src/adapters/base.test.ts` — shared adapter contract tests (AiAdapter interface compliance)
- [ ] `packages/ai-core/src/adapters/openai.adapter.test.ts` — unit test with mocked fetch
- [ ] `packages/ai-core/src/adapters/stability.adapter.test.ts` — unit test with mocked fetch
- [ ] `packages/ai-core/src/adapters/mock.adapter.test.ts` — canvas rendering output verification
- [ ] `packages/ai-core/src/config/providerStore.test.ts` — encrypt/decrypt round-trip, schema validation
- [ ] `packages/ai-core/src/prompt/templateEngine.test.ts` — variable substitution, conditionals, path resolution

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| OpenAI adapter real HTTP call | AI-01 | Requires live API key | Set `OPENAI_API_KEY` env var, run `pnpm vitest run openai.adapter.integration.test.ts` (excluded from default suite) |
| Stability adapter real HTTP call | AI-02 | Requires live API key | Set `STABILITY_API_KEY` env var, run `pnpm vitest run stability.adapter.integration.test.ts` (excluded from default suite) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
