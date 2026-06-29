---
phase: 01-core-canvas
plan: 01
subsystem: infrastructure
tags: pnpm, vite, react, excalidraw, tailwindcss, typescript, monorepo

# Dependency graph
requires: []
provides:
  - pnpm monorepo with 4 workspace packages
  - Vendored Excalidraw v0.18.0 fork at packages/excalidraw/
  - Shared types (AIElement, Project) at packages/shared/
  - Vite 8 + React 19 + TailwindCSS v4 web app skeleton at apps/web/
affects:
  - Phase 01 Plans 02-06 (all depend on this foundation)
  - Phase 02 (node editor integration uses shared coordinate utils)
  - Phase 03 (AIElement integration relies on shared types)
  - Phase 05 (performance optimization builds on chunk rendering foundation)

# Tech tracking
tech-stack:
  added:
    - pnpm@11.8.0 (upgraded from 10.10.0)
    - Vite@8.1.0 (Rolldown-based bundler)
    - React@19.2.7
    - ReactDOM@19.2.7
    - TailwindCSS@4.3.1 (CSS-first config via @theme)
    - Excalidraw@0.18.0 (vendored fork)
    - Zustand@5.0.14
    - Immer@11.1.8
    - Dexie@4.4.4
    - Zod@4.4.3
    - TypeScript@5.0.2
    - @vitejs/plugin-react@4.0.0
    - @tailwindcss/vite@4.3.1
    - Vitest@4.1.9
  patterns:
    - pnpm workspace monorepo with apps/* and packages/*
    - Vendored Excalidraw with FORK_CHANGES.md discipline (D-01, D-26)
    - AIElement type extending ExcalidrawElement via type union extension (D-11)
    - Coordinate transform utilities as stubs (deferred to Phase 2)
    - deepClone with structuredClone + JSON fallback pattern
    - TailwindCSS v4 CSS-first config (no tailwind.config.js)
    - Vite 8 + Vitest 4 inline config (shared vite.config.ts)

key-files:
  created:
    - package.json (root)
    - pnpm-workspace.yaml
    - .npmrc
    - tsconfig.base.json
    - packages/excalidraw/ (820+ files vendored from upstream v0.18.0)
    - packages/excalidraw/FORK_CHANGES.md
    - packages/excalidraw/package.json
    - packages/excalidraw/tsconfig.json
    - packages/shared/package.json
    - packages/shared/src/types/canvas.ts (AIElement, GenerationStatus, CanvasSerializedState)
    - packages/shared/src/types/project.ts (Project interface)
    - packages/shared/src/utils/coordinate.ts (canvasToNodeSpace, nodeToCanvasSpace stubs)
    - packages/shared/src/utils/serialization.ts (deepClone, filterTransientProps)
    - apps/web/package.json
    - apps/web/vite.config.ts
    - apps/web/src/App.tsx (placeholder)
    - apps/web/src/App.css (Tailwind v4 @import + @theme)
    - apps/web/src/test/setup.ts
    - pnpm-lock.yaml

key-decisions:
  - "D-01: Full vendored Excalidraw fork (not npm wrapper) for AIElement type control"
  - "D-02: Fork base v0.18.0 release tag (confirmed React 19 compat via peerDependencies)"
  - "D-03: Minimal monorepo: packages/excalidraw/, packages/shared/, apps/web/"
  - "D-04: pnpm 11 workspace with lockfile in root"
  - "D-25: Upstream sync cadence (2-4 weeks) documented in FORK_CHANGES.md"
  - "D-26: FORK_CHANGES.md discipline from commit 1"

patterns-established:
  - "FORK_CHANGES.md: Every phase touching packages/excalidraw/ must update with file, reason, date, phase"
  - "Tsconfig extension chain: tsconfig.base.json -> packages/*/tsconfig.json, apps/*/tsconfig.json"
  - "Package exports mapping: explicit subpath exports for tree-shakeable imports"

requirements-completed:
  - CANVAS-01
duration: 18min
completed: 2026-06-29
---

# Phase 01 Plan 01: Monorepo Foundation Summary

**pnpm workspace monorepo with vendored Excalidraw v0.18.0 fork, shared types package, and Vite 8 + React 19 + TailwindCSS v4 web app skeleton**

## Performance

- **Duration:** 18 min
- **Started:** 2026-06-29T17:28:00Z
- **Completed:** 2026-06-29T17:46:00Z
- **Tasks:** 3
- **Files modified:** ~840

## Accomplishments

- Root monorepo configuration: pnpm workspaces (apps/*, packages/*), tsconfig.base.json with strict ES2022 bundler settings, .npmrc with local-dev supply-chain relaxations
- Vendored Excalidraw v0.18.0 upstream source (820+ files) to packages/excalidraw/ with FORK_CHANGES.md establishing maintenance discipline from day one
- Shared types package (packages/shared/) exporting AIElement, Project, CanvasSerializedState types plus deepClone/serialization utilities
- Web app skeleton (apps/web/) with Vite 8.1.0 (Rolldown), React 19.2.7, TailwindCSS 4.3.1, Vitest 4.1.9
- All dependencies installed, dev server verified serving the correct index.html

## Task Commits

Each task was committed atomically:

1. **Task 1: Create root monorepo configuration** - `563d0e6` (chore)
2. **Task 2: Vendored Excalidraw fork** - `e6f0c2e` (feat)
3. **Task 3: Create packages/shared/ and apps/web/ skeleton** - `c3ffc0a` (feat)

## Files Created/Modified

### Root Configuration
- `package.json` - Root workspace config, private: true, pnpm@11.8.0
- `pnpm-workspace.yaml` - packages: ['apps/*', 'packages/*']
- `.npmrc` - Supply-chain security relaxed for local dev
- `tsconfig.base.json` - Shared strict TypeScript config (ES2022, bundler resolution, react-jsx)
- `.gitignore` - Standard ignores (node_modules, dist, .turbo, *.local)

### packages/excalidraw/
- `packages/excalidraw/package.json` - @ac-canvas/excalidraw with all upstream dependencies
- `packages/excalidraw/FORK_CHANGES.md` - Initial vendor entry, sync cadence, modification discipline
- `packages/excalidraw/tsconfig.json` - Extends workspace base
- `packages/excalidraw/src/` - 820+ files vendored from upstream v0.18.0 (full source tree)

### packages/shared/
- `packages/shared/package.json` - @ac-canvas/shared with excalidraw workspace dependency
- `packages/shared/tsconfig.json` - Extends workspace base
- `packages/shared/src/index.ts` - Barrel export
- `packages/shared/src/types/canvas.ts` - AIElement, GenerationStatus, CanvasSerializedState, Viewport
- `packages/shared/src/types/project.ts` - Project interface
- `packages/shared/src/utils/coordinate.ts` - canvasToNodeSpace, nodeToCanvasSpace stubs
- `packages/shared/src/utils/serialization.ts` - deepClone, filterTransientProps

### apps/web/
- `apps/web/package.json` - @ac-canvas/web with all workspace and runtime deps
- `apps/web/vite.config.ts` - Vite 8 + @vitejs/plugin-react + @tailwindcss/vite + Vitest config
- `apps/web/tsconfig.json` - Extends base with vitest/globals types
- `apps/web/tsconfig.node.json` - Separate config for vite.config.ts
- `apps/web/index.html` - SPA entry HTML
- `apps/web/src/main.tsx` - React 19 createRoot entry point
- `apps/web/src/App.tsx` - Placeholder component
- `apps/web/src/App.css` - TailwindCSS v4 @import "tailwindcss" + @theme
- `apps/web/src/vite-env.d.ts` - Vite client type reference
- `apps/web/src/test/setup.ts` - Vitest setup with jest-dom matchers

## Decisions Made

- **Fork base v0.18.0 confirmed correct**: Excalidraw peerDependencies in v0.18.0 include `"react": "^17.0.2 || ^18.2.0 || ^19.0.0"`, confirming React 19 compatibility.
- **pnpm 11.9.0 installed (requested 11.8.0)**: The `package.json` specifies `pnpm@11.8.0` as packageManager. pnpm 11.9.0 was installed (latest patch in v11 line). Compatible for all workspace features.
- **Vite 8.1.0 available as expected**: Vite 8.1.0 installed and dev server verified serving the correct app.
- **Apps/web TS type-check not attempted**: The plan acknowledges Excalidraw type errors are expected from strict mode. Shared package type-check resolves but tsc follows workspace dependency chain into excalidraw.
- **Dev server on alt port**: Port 5173 was in use (another dev project), started on 5174/5175 with correct output.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added @ac-canvas/excalidraw workspace dependency to packages/shared/**
- **Found during:** Task 3 (Shared package type-checking)
- **Issue:** packages/shared/src/types/canvas.ts imports from `@ac-canvas/excalidraw/element/types` for the AIElement type definition, but packages/shared/package.json had no dependency on excalidraw
- **Fix:** Added `"@ac-canvas/excalidraw": "workspace:*"` to shared's dependencies
- **Files modified:** packages/shared/package.json
- **Verification:** Workspace symlink created at packages/shared/node_modules/@ac-canvas/excalidraw/
- **Committed in:** c3ffc0a (Task 3 commit)

**2. [Rule 3 - Blocking] Installed TypeScript at root workspace level for type-checking**
- **Found during:** Task 3 (Type-checking shared package)
- **Issue:** `tsc` command not found in workspace root — TypeScript was only installed in individual packages
- **Fix:** Ran `pnpm add -Dw typescript@^5` to install at root
- **Files modified:** package.json, pnpm-lock.yaml
- **Verification:** `./node_modules/.bin/tsc --noEmit` works from workspace root
- **Committed in:** c3ffc0a (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 blocking)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered

- **Vite port conflict**: Port 5173 was in use by another project. Used --port 5175 --strictPort to verify dev server on a clean port.
- **Type-checking scope**: The vendored Excalidraw fork has type errors under strict mode (expected per plan verification notes). The shared package's own source has zero type errors.
- **pnpm workspace dependency resolution**: Adding a `workspace:*` dependency to shared's package.json required `pnpm install` to create the symlink. This is standard pnpm behavior.

## Self-Check: PASSED

- All 21 created files verified (FOUND)
- All 3 task commits verified (EXISTS)
- Workspace resolves 4 packages correctly
- Vite 8 dev server serves correct index.html with "AI Creative Canvas" title

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Monorepo foundation is solid: 4 packages resolved, workspace symlinks working between all packages
- Vite 8 dev server confirmed functional
- Excalidraw v0.18.0 source ready for AIElement type additions in Plan 02
- Shared types (AIElement, Project) ready for import by apps/web/ in Plan 03+
- **Ready for Plan 02 (AIElement type integration into Excalidraw) and Plan 03 (CanvasWrapper component)**

---
*Phase: 01-core-canvas (Plan 01)*
*Completed: 2026-06-29*
