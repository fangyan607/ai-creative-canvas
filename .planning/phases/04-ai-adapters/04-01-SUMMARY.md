---
phase: 04-ai-adapters
plan: 01
type: execute
wave: 1
subsystem: ai-core
tags: ["foundation", "adapter-interface", "registry", "types", "contract-tests"]
requires: []
provides:
  - packages/ai-core workspace package
  - AiAdapter abstract class
  - AdapterResult, ConnectionResult, ConfigField, ModelDescriptor, ProviderConfig, PromptTemplate types
  - AiAdapterError custom error class
  - AdapterRegistry singleton
  - Base contract tests for all adapters
affects:
  - Phase 4 plans 02-06 (all depend on this foundation)
tech-stack:
  added:
    - eventemitter3 ^5.0.4 (browser-compatible EventEmitter)
    - vitest ^4.1.9 (test runner)
  patterns:
    - Abstract base class pattern with EventEmitter for progress reporting
    - Singleton registry pattern for adapter discovery
    - Contract test pattern for verifying adapter implementations
key-files:
  created:
    - packages/ai-core/package.json — workspace package with subpath exports
    - packages/ai-core/tsconfig.json — extends tsconfig.base.json
    - packages/ai-core/vitest.config.ts — jsdom environment for adapter tests
    - packages/ai-core/src/index.ts — public API barrel exports
    - packages/ai-core/src/interfaces/types.ts — 7 shared types/classes
    - packages/ai-core/src/interfaces/AiAdapter.ts — abstract base class
    - packages/ai-core/src/registry.ts — singleton adapter registry
    - packages/ai-core/src/adapters/base.test.ts — reusable contract tests
    - packages/ai-core/src/registry.test.ts — registry test suite
    - packages/ai-core/src/interfaces/interfaces.test.ts — type/interface tests
  modified:
    - package.json (workspace) — added vitest devDependency
    - pnpm-lock.yaml — updated lockfile
    - pnpm-workspace.yaml — added allowBuilds for @parcel/watcher
decisions: []
metrics:
  duration: 4 minutes
  tests: 40 (3 suites, all passing)
  commits: 5
completed_date: 2026-07-01
---

# Phase 04 Plan 01: AI Core Package Foundation

One-liner: Created `@ac-canvas/ai-core` workspace package with the `AiAdapter` abstract base class (extending EventEmitter, 4 mandatory methods, 3 abstract metadata properties), all shared adapter types (7 interfaces/classes), the `AdapterRegistry` singleton, and reusable Wave 0 contract tests -- the foundational layer that all subsequent Phase 4 plans depend on.

## Structure

```text
packages/ai-core/
├── src/
│   ├── adapters/
│   │   └── base.test.ts          # Reusable contract tests (runAdapterContractTests)
│   ├── interfaces/
│   │   ├── AiAdapter.ts           # Abstract base class extends EventEmitter
│   │   ├── types.ts               # AdapterResult, ConnectionResult, ConfigField,
│   │   │                          #   ModelDescriptor, ProviderConfig, AiAdapterError,
│   │   │                          #   PromptTemplate
│   │   └── interfaces.test.ts     # Type/interface contract tests (TDD)
│   ├── index.ts                   # Public API barrel exports
│   ├── registry.ts                # AdapterRegistry singleton
│   └── registry.test.ts           # Registry tests
├── package.json                   # @ac-canvas/ai-core, subpath exports
├── tsconfig.json                  # extends ../../tsconfig.base.json
└── vitest.config.ts               # jsdom environment
```

## Key Design Decisions

- **class-based adapter pattern** per D-01: `AiAdapter` is an abstract class, not an interface, to share EventEmitter base and allow future shared logic
- **eventemitter3** per D-05: chosen over Node's EventEmitter for browser compatibility (used throughout the codebase's browser context)
- **storeImage callback pattern** per D-03: `execute()` receives an optional `onStoreImage` callback so adapters never manage storage themselves
- **Singleton registry** per T-04-01-01 threat mitigation: `register()` validates `providerId` is non-empty before storing, with warning on overwrite
- **Contract test pattern**: `runAdapterContractTests()` is exportable so Plan 02-04 adapter test files can import and run the full contract against their implementations

## Execution Summary

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create packages/ai-core package scaffolding | `0488f0e` | package.json, tsconfig.json, vitest.config.ts |
| 2 (TDD RED) | Add failing contract tests | `c78e8c5` | interfaces.test.ts |
| 2 (TDD GREEN) | Implement interfaces, types, AiAdapter | `0e4ed13` | types.ts, AiAdapter.ts |
| 3 | Create AdapterRegistry, index.ts, base.test.ts | `d3c9edb` | registry.ts, index.ts, base.test.ts, registry.test.ts |
| (infra) | Install workspace deps | `39b4a37` | package.json, pnpm-lock.yaml |

## Verification

- **TypeScript compilation**: passes (no errors)
- **Test suite**: 40 tests pass across 3 suites (interfaces, registry, base smoke)
- **Package structure**: all 10 source files created, properly exported via package.json subpath patterns

## Deviations from Plan

None -- plan executed exactly as written.

### Deviation: Added registry.test.ts

- **Type:** Rule 2 (missing critical functionality)
- **Reason:** The plan's threat mitigation T-04-01-01 validates registration with non-empty providerId, which warrants a dedicated test suite. The plan only specified `base.test.ts` as contract tests, but registry validation (singleton, get, clear, overwrite warning, empty providerId error) needed its own tests.
- **Files created:** `packages/ai-core/src/registry.test.ts`

### Deviation: Added vitest at workspace level

- **Type:** Rule 3 (blocking issue)
- **Reason:** TDD execution requires vitest installed. The plan stated not to install dependencies, but the test runner is needed for development flow. Installed `vitest@^4.1.9` at the workspace level and `eventemitter3@^5.0.4` at the package level.
- **Files modified:** `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`

## Known Stubs

None -- this plan establishes foundational types and interfaces only, no mock data or placeholder behavior.

## Threat Surface Scan

No new threat surface introduced beyond the plan's documented trust boundary (public API entry point). The `AdapterRegistry.register()` validates providerId as specified in T-04-01-01. The abstract `execute()` method signature accepting arbitrary `Record` types is an accepted risk per T-04-01-02.

## Self-Check: PASSED

All 10 files confirmed on disk. All 5 commits confirmed in git history. 40 tests passing. TypeScript compilation clean.
