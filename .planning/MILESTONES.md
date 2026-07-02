# Milestones

## v0.2 MVP (Shipped: 2026-07-02)

**Phases completed:** 8 phases, 34 plans, 68 tasks

**Key accomplishments:**

- Sliding-window rate limiter (pure function, 9 tests) and in-memory ImageBlobStore with singleton export, both independently testable without Zustand or React
- Per-provider FIFO queues, rate limiter integration, serial execution loop, and EngineStore queuedNodeIds tracking with node existence verification
- Bridge factory wiring AdapterRegistry, ProviderStore, EventEmitter progress events, and ImageBlobStore into real adapter executors, with __nodeId injection and App.tsx bootstrap adapter registration
- 1. [Rule 1 - Bug] Fixed vite.config.ts react-refresh plugin fails in jsdom test environment
- 1. [Rule 1 - Bug] Missing UI components crash AppShell test
- 1. [Rule 3 - Blocking] Missing @testing-library/user-event dependency
- `vitest.config.ts`
- Subsystem:
- Unit tests for useAutoExecute (7 tests), useAutoSave (6 tests), and createDefaultResolvers (11 tests) — the three untested source modules in the engine execution and persistence pipeline

---
