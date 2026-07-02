# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v0.2 — MVP

**Shipped:** 2026-07-02
**Phases:** 8 | **Plans:** 34 | **Sessions:** ~6-8 (estimated across 3 days)

### What Was Built

- Infinite canvas with Excalidraw fork, chunk rendering, LRU cache, and IndexedDB persistence
- Visual node editor with 5 node types (Prompt/T2I/Style/Merge/Preview), drag-connect, parameter panel
- DAG execution engine with topological sort, parallel layers, incremental dirty-path execution, and sub-groups
- AI adapter system with OpenAI DALL-E 3, Stability.ai, MockAdapter, BYOK mode, prompt templates
- AI execution infrastructure with queue, rate limiting, SSE streaming, and engine-adapter bridge
- Hono backend with AI proxy, file upload/download, and SSE broadcast
- Application UI with project management, canvas export (PNG/JPG), settings page, dark mode
- Comprehensive testing: 418 unit tests, 3 E2E tests (14.2s), 9 performance benchmarks

### What Worked

- **GSD workflow with CodeGraph**: The combination of precise planning (GSD) + code graph exploration (CodeGraph) eliminated most of the "searching for code" overhead. Plans mapped directly to executable tasks with known files.
- **Phase ordering**: 1 → 2 → 3 → (4 ∥ 6) → 5 → 7 → 8 was correct. Parallelizing Phases 4 and 6 would have been possible but sequential execution reduced coordination overhead for a single developer.
- **YOLO mode**: Auto-approval at verification gates significantly reduced friction. The checkpoint/verification loop caught issues without needing manual OK at every step.
- **vi.hoisted() pattern discovery**: The vitest v4 hoisting requirement for mock variables was discovered and resolved during Phase 8 — good that it was the last phase, not the first.
- **Tech stack confidence**: React 19 + Vite 8 + Zustand 5 + TailwindCSS 4 worked without major compatibility issues. The time spent researching stack versions before Phase 1 paid off.

### What Was Inefficient

- **Research phases were skipped for Phases 2 and 8**: Both phases had `has_research: false`, meaning they jumped straight to planning. Phase 2 (Node Editor) worked out fine, but Phase 8 (Testing) would have benefited from research into Vitest v4 hoisting quirks earlier.
- **Code review findings consumed non-trivial rework**: CR-01/CR-02 and WR findings in Phase 5 required revisiting code that was thought complete. A lighter review process for early phases (medium rather than standard) might have been more efficient.
- **Merge conflicts in Excalidraw fork**: The documented 64.4% cherry-pick failure rate was real — upstream merges were costly. This wasn't avoidable, but should be budgeted for in any Excalidraw-related work.
- **No CI pipeline**: All testing was local. For a project of 418 tests, even a basic `vitest run` in CI would have caught regressions faster than manual re-runs.

### Patterns Established

- **Plan → Execute → Summary → Verify**: Each plan followed this 4-step cycle with consistent SUMMARY.md structure. Should persist.
- **Key decision logging**: Every plan captured `key-decisions` in YAML frontmatter, making it easy to trace why things were done a certain way.
- **FORK_CHANGES.md**: Excalidraw fork changes tracked in a single diff file. Essential for upstream sync.
- **Store-first architecture**: All phases built Zustand stores before React components. This kept business logic testable independently of UI.
- **Phase-specific VERIFICATION.md**: Each phase's verification document provides goal-backward evidence that the phase delivered what it promised.

### Key Lessons

1. **Research before planning, always**: Even for "obvious" phases. The phases that skipped research had no-shows (hoisting quirk in Vitest) that would have been caught.
2. **Code review depth should scale with phase risk**: High-risk phases (AI proxy, security) need deep review. Low-risk phases (testing, pure UI) can use lighter review to save time.
3. **Merge conflict budget is real**: When working with a fork like Excalidraw, budget 20-30% overhead for upstream sync. The 64.4% cherry-pick failure rate means manual intervention on most merges.
4. **Single-developer velocity is high but unsustainable**: 8 phases in 3 days (~120+ commits) is intense. Future milestones should pace at 4-5 phases per week to avoid burnout.

### Cost Observations

- Model: Primarily Claude Opus/Sonnet via the Claude Code CLI
- Sessions: Multiple sessions across 3 days
- Notable: GSD workflow's `auto_advance` + verification loop provided good cost/quality ratio — plans were cheap (Sonnet), execution used Opus for complex code, verification caught issues before they accumulated.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v0.2 | ~6-8 | 8 | Initial GSD workflow established with 34 plans across 8 phases |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v0.2 | 418 | 64.57% | ~10 (Dexie, Tempura, testing libs) |

### Top Lessons (Verified Across Milestones)

1. **Store before UI**: Building Zustand stores before React components kept business logic testable and independent. This pattern worked across all phases.
2. **Plan in waves**: The "wave" planning pattern (Wave 1 = core, Wave 2 = features, Wave 3 = polish) prevented scope creep within each phase.
3. **Auto-advance is efficient**: YOLO mode with auto-advance at verification gates reduced context switches and wait time significantly.
