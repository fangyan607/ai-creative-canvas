---
phase: 1
slug: core-canvas
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-29
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | `apps/web/vite.config.ts` (Wave 0 creates) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --coverage` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose --changed`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

*To be filled during plan execution — tasks not yet created.*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| — | — | — | — | — | — | — | — | — | ⬜ pending |

---

## Wave 0 Requirements

- [ ] `apps/web/src/__tests__/` — test directory with Vitest config
- [ ] `vitest.config.ts` or inline config in `vite.config.ts` — Vitest setup
- [ ] Test stubs for: CanvasStore operations, HistoryStore snapshots, project serialization

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Canvas pan/zoom/scrolling | CANVAS-01 | Pointer event handling requires real browser | Test in browser: scroll wheel zooms, middle-click pans, edge scroll works |
| Chunk rendering at scale | CANVAS-04 | Requires 500+ elements in real canvas context | Load a project with 500 elements, verify 60fps via Chrome DevTools Rendering tab |
| Drawing tool behavior | CANVAS-01 | Visual, pointer-based interactions | Draw rectangle, ellipse, arrow, line, freehand — verify positions and snapping |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
