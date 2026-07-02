---
phase: 08-testing-performance
plan: 01
subsystem: test-infrastructure
tags: [vitest, workspace, coverage, ci]
provides: [root-workspace-config, test-scripts, coverage-config]
requires: []
affects: [apps/web, apps/backend, packages/ai-core, packages/node-editor]
key-files:
  created:
    - vitest.config.ts
    - packages/node-editor/vitest.config.ts
  modified:
    - package.json
    - apps/web/vite.config.ts
    - apps/backend/vitest.config.ts
    - packages/ai-core/vitest.config.ts
decisions:
  - "Use vitest.config.ts with test.projects (vitest v4 API) instead of vitest.workspace.ts with defineWorkspace"
  - "Explicit workspace member list prevents auto-discovery of packages/excalidraw vendored fork"
  - "Coverage thresholds set as soft targets: core 80%, UI/backend 50%"
metrics:
  test-files: 35
  tests-passed: 394
  coverage-statements: 64.57%
  coverage-branches: 50.54%
  coverage-functions: 57.41%
  coverage-lines: 65.77%
duration: ~20 minutes
completed: 2026-07-02
---

# Phase 8 Plan 1: Vitest Workspace Configuration & Coverage Setup

Create root vitest workspace config, add missing package-level config for node-editor, install coverage and UI devDependencies, add 5 test scripts, and add coverage thresholds to all workspace members. All 35 test files (394 tests) pass.

## Changes Summary

### Created Files

**`vitest.config.ts`** — Root vitest configuration using `test.projects` (vitest v4 API). Lists 4 workspace members explicitly: apps/web, apps/backend, packages/ai-core, packages/node-editor. Prevents auto-discovery of packages/excalidraw (vendored fork, 80+ own tests) and `.claude/worktrees` directories. Root project has `include: []` so no tests run at root level.

**`packages/node-editor/vitest.config.ts`** — jsdom environment, globals enabled, includes both `src/**/*.test.{ts,tsx}` and `test/**/*.test.{ts,tsx}`.

### Modified Files

**`package.json`** — Added 5 test scripts:
- `pnpm test` — watch mode (development)
- `pnpm test:run` — single run (manual/CI)
- `pnpm coverage` — with coverage report
- `pnpm test:ui` — vitest UI dashboard
- `pnpm test:perf` — vitest bench mode

Added devDependencies: `@vitest/coverage-v8`, `@vitest/ui`, `jsdom`.

**`apps/web/vite.config.ts`** — Added coverage config: provider v8, thresholds 50/40/50/50, excalidraw excluded.

**`apps/backend/vitest.config.ts`** — Added coverage config: provider v8, thresholds 50/40/50/50.

**`packages/ai-core/vitest.config.ts`** — Added coverage config: provider v8, thresholds 80/70/80/80 (core logic target).

### Workspace Member Coverage

| Package | Test Files | Tests | Environment |
|---------|-----------|-------|-------------|
| @ac-canvas/web | ~20 | ~300 | jsdom |
| @ac-canvas/backend | 4 | ~34 | node |
| @ac-canvas/ai-core | 8 | ~50 | jsdom |
| @ac-canvas/node-editor | 1 | 11 | jsdom |

## Deviations from Plan

### [Rule 1 - Bug] vitest v4 workspace API migration

- **Found during:** Task 1
- **Issue:** `vitest.workspace.ts` with `defineWorkspace` was specified in the plan, but vitest v4 does not respect the workspace file when a `vitest.config.ts` exists at root. Additionally, vitest v4's `defineWorkspace` auto-discovers all pnpm workspace members (including `packages/excalidraw` and `.claude/worktrees`), which cannot be prevented through the workspace config alone.
- **Fix:** Replaced `vitest.workspace.ts` with `vitest.config.ts` using `test.projects` (the vitest v4 API). This explicitly defines which projects are part of the test suite and prevents auto-discovery. Root project has `include: []` so it runs no tests directly.
- **Files modified:** `vitest.config.ts` (created), `vitest.workspace.ts` (deleted — replaced by vitest.config.ts)
- **Commit:** `30c75e3`

### [Rule 3 - Dependency] jsdom not installed

- **Found during:** Task 3 (Step F — test verification)
- **Issue:** `jsdom` was not listed as a dependency, causing tests in jsdom environment to fail with `ReferenceError: document is not defined`.
- **Fix:** Installed `jsdom` as root devDependency.
- **Files modified:** `package.json`
- **Commit:** `30c75e3`

## Verification

- `pnpm test:run` (vitest run): 35 test files, 394 tests — all passed
- `pnpm coverage` (vitest run --coverage): Coverage reports generated successfully
- All 5 test scripts verified in package.json
- All 4 workspace members included (web, backend, ai-core, node-editor)
- No excalidraw tests discovered
- No .claude/worktrees tests discovered

## Self-Check: PASSED

### Created files verified
- `vitest.config.ts` — FOUND
- `packages/node-editor/vitest.config.ts` — FOUND
- `.planning/phases/08-testing-performance/08-01-SUMMARY.md` — FOUND

### Commits verified
- `5bfbe97` — feat(08-01): create root vitest workspace config
- `b8ee828` — feat(08-01): create vitest config for packages/node-editor
- `30c75e3` — feat(08-01): install coverage/ui deps, add test scripts, add coverage configs
