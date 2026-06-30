---
phase: 3
slug: node-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-30
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest v4 |
| **Config file** | `apps/web/vite.config.ts` (inline `test` section) |
| **Quick run command** | `vitest run apps/web/src/engine/__tests__/NodeEngine.test.ts` |
| **Full suite command** | `pnpm --filter @ac-canvas/web exec vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `vitest run apps/web/src/engine/__tests__/NodeEngine.test.ts`
- **After every plan wave:** Run `pnpm --filter @ac-canvas/web exec vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | NODE-03 | — | N/A | unit | `vitest run apps/web/src/engine/__tests__/NodeEngine.test.ts -t "topological"` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | NODE-03 | — | N/A | unit | `vitest run apps/web/src/engine/__tests__/NodeEngine.test.ts -t "dirty"` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | NODE-03 | — | N/A | unit | `vitest run apps/web/src/engine/__tests__/NodeEngine.test.ts -t "error"` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | NODE-07 | — | N/A | unit | `vitest run apps/web/src/engine/__tests__/NodeEngine.test.ts -t "group"` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | NODE-07 | — | N/A | visual | Manual — group collapse/expand, wire visibility | N/A | ⬜ pending |
| 03-03-01 | 03 | 3 | NODE-06 | — | N/A | unit | `vitest run apps/web/src/engine/__tests__/NodeEngine.test.ts -t "undo"` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 3 | NODE-06 | — | N/A | visual | Manual — undo/redo restores node graph state | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/web/src/engine/__tests__/NodeEngine.test.ts` — engine core tests (topological sort, dirty-path, error propagation, group serialization)
- [ ] `apps/web/src/stores/__tests__/engineStore.test.ts` — EngineStore actions and serialization
- [ ] Vitest setup for engine directory — eligible to inherit `apps/web/vite.config.ts` since it's under `apps/web/src/`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Group collapse/expand wire visibility | NODE-07 | Visual rendering — cannot assert DOM state in vitest | After collapsing a group, verify child wires are hidden. After expanding, verify wires reconnect. |
| Undo/redo restores node editor state | NODE-06 | Integration — depends on React Flow component tree | Add a node, undo, verify node removed. Redo, verify node restored. |
| Node status indicator visual rendering | NODE-03 | Visual — color/badge rendering in React Flow custom nodes | After auto-execution, verify status colors match D-03 spec for each state. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
