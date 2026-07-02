# Phase 8: Testing & Performance — Context

**Gathered:** 2026-07-02
**Status:** Ready for planning

<domain>
## Phase Boundary

为所有已实施阶段建立自动化测试覆盖，确保关键路径和边界情况受到保护。核心聚焦三层测试：节点引擎单元测试、AI 适配器 Mock 测试、核心 E2E 流程测试。同时建立测试基础设施（vitest config + 脚本）、覆盖报告、以及关键路径的性能基准测试。

**Requirements covered:** TEST-01（节点引擎单元测试）, TEST-02（AI 适配器 Mock 测试）, TEST-03（核心 E2E 流程测试）

**Success criteria:**
1. Node engine unit tests pass: topological sort handles linear, branched, and cyclic graphs; dirty-path marking correctly identifies affected nodes
2. AI adapter mock tests pass: each provider adapter returns expected output shapes; MockAdapter returns valid test images
3. Core E2E flow passes: create project -> add nodes -> connect nodes -> trigger AI generation -> see result on canvas -> export as PNG
4. All tests run in CI without external API calls or network dependencies (CI deferred to v0.2 — see D-04)
</domain>

<decisions>
## Implementation Decisions

### Test Infrastructure
- **D-01: Root vitest workspace** — 单一 `vitest.config.ts` 放在项目根目录，使用 vitest workspace 模式覆盖 `apps/web/`、`apps/backend/`、`packages/*/`。一行 `pnpm test` 运行全部测试。现有测试分布在 `__tests__/`、`test/`、`tests/` 目录，workspace 配置中统一 include。
- **D-02: Comprehensive test scripts** — 根 `package.json` 添加完整测试脚本集：
  - `pnpm test` — watch 模式（开发时使用）
  - `pnpm test:run` — 单次运行（CI/手动用）
  - `pnpm coverage` — 运行测试并生成覆盖报告
  - `pnpm test:ui` — vitest UI 面板（可视化调试）
  - `pnpm test:perf` — 性能基准测试单独入口
- **D-03: Core logic > 80% coverage** — 测试覆盖目标：核心逻辑层（节点引擎、AI 适配器、核心 Zustand 存储）要求 >80% 语句覆盖。UI 组件 >50%。Excalidraw fork 自带 80+ 测试，不额外考核覆盖。覆盖报告阈值首次作为参考，不强制定死。

### E2E Testing
- **D-04: Playwright + headless Chromium** — 使用 Playwright v1.61 + headless Chromium 模式运行 E2E 测试。Playwright 已存在于依赖树中。CI pipeline 延期到 v0.2，E2E 测试先本地手动运行。
- **D-05: E2E scope — core flow only** — 只测试 TEST-03 要求的单一核心路径：创建空白项目 → 拖入节点 → 连线 → Mock AI 生成 → 预览 → 导出 PNG。不测试变体流程（从模板创建、设置页面、项目管理）。E2E 文件放在 `apps/web/e2e/` 目录。

### Performance Testing
- **D-06: Benchmark + 500 elements** — 性能测试范围：
  - 节点引擎基准：1000 次拓扑排序执行时间测试（线性图/分支图/菱形图）
  - 500+ 元素画布渲染测试（确认分片渲染保持 60fps）
  - LRU 缓存命中率测试（验证 200MB 内存限制行为）
  - 性能测试使用 `vitest` 的 `bench` 模式（`test:perf` 脚本），与单元测试分开执行

### Test Gap Filling
- **D-07: Hooks + resolver tests only** — 补写以下模块的单元测试：
  - `useAutoExecute.ts` — 自动执行调度逻辑
  - `useAutoSave.ts` — 自动保存调度逻辑
  - `resolvers.ts` — 引擎 resolver 工厂函数
  - 其他模块（encryption、registry、node editor 组件）已有足够覆盖或可延期到 v0.2

### CI Pipeline (Deferred)
- **D-08: CI deferred to v0.2** — MVP 阶段不设置 CI 服务器。测试（包括 E2E）本地手动运行。GitHub Actions workflow 在 v0.2 里程碑时添加，届时运行 `pnpm test:run + pnpm typecheck`。

### Folded Todos
None — no pending todos matched Phase 8 scope.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Boundary & Requirements
- `.planning/ROADMAP.md` §Phase 8 — Goal, success criteria (node engine unit tests, AI adapter mock tests, E2E flow, CI without network)
- `.planning/REQUIREMENTS.md` — TEST-01 (node engine unit tests), TEST-02 (AI adapter mock tests), TEST-03 (core E2E flow)

### Prior Phase Decisions (Mandatory Reading)
- `.planning/phases/01-core-canvas/01-CONTEXT.md` — D-18~21 (chunk rendering, LRU cache — performance baseline)
- `.planning/phases/03-node-engine/03-CONTEXT.md` — D-01~05 (engine execution model, hybrid trigger, node status, fail-stop, dirty-path)
- `.planning/phases/04-ai-adapters/04-CONTEXT.md` — D-01~04 (AiAdapter interface, AdapterResult, MockAdapter behavior)
- `.planning/phases/05-ai-execution-infrastructure/05-CONTEXT.md` — D-02~03 (AIQueueStore, rate limiting)
- `.planning/phases/06-backend-services/06-CONTEXT.md` — D-05~06 (backend AI proxy, file storage)

### Technical Research
- `.planning/research/ARCHITECTURE.md` — Pattern 6 (Connection Validation Pipeline), Pattern 8 (Performance architecture)
- `.planning/research/PITFALLS.md` — Pitfall 2 (Rendering Performance), Pitfall 6 (Zustand re-render cascade), Pitfall 10 (Scope Creep)

### Existing Code (Read for Patterns)
- Root `package.json` — Currently has no test scripts. Phase 8 adds them.
- `apps/web/tsconfig.json` — Has `"types": ["vitest/globals"]` — vitest compatible.
- Existing test pattern references:
  - `apps/web/src/engine/__tests__/NodeEngine.test.ts` — describe/it/expect pattern for engine
  - `apps/web/src/stores/__tests__/aiQueueStore.test.ts` — Store test pattern (Zustand + beforeEach reset)
  - `packages/ai-core/src/adapters/mock.adapter.test.ts` — Adapter test pattern
  - `apps/web/src/__tests__/components/AppShell.test.tsx` — UI component test pattern (React Testing Library + vi.mock)
  - `apps/web/src/test/performance/LRUCache.test.ts` — Performance test pattern
  - `apps/web/src/engine/__tests__/NodeEngine.test.ts` — Engine unit tests (topological sort, dirty-path)

### Configuration
- `.planning/config.json` — Workflow configuration
- `CLAUDE.md` — Project instructions, tech stack (Vitest 4.1.x, Playwright 1.61)
- `.planning/PROJECT.md` — Vision, constraints (500+ elements performance target)
- `.planning/STATE.md` — Current project state

</canonical_refs>

<code_context>
## Existing Code Insights

### Existing Test Inventory

| Package | Test Count | Coverage | Notes |
|---------|-----------|----------|-------|
| `apps/web/engine` | 2 files (NodeEngine, aiBridge) | Topological sort, dirty-path, bridge | Core engine logic well tested |
| `apps/web/stores` | 5 files (canvas, history, nodeGraph, aiQueue, uiPrefs) | Store CRUD, serialization, undo/redo | Good coverage |
| `apps/web/components` | 5 files (AppShell, Export, PromptEditor, ShortcutPanel, Projects, Settings) | UI rendering, interaction | React Testing Library |
| `apps/web/hooks` | 1 file (useKeyboardShortcuts) | Shortcut system | useAutoExecute / useAutoSave **untested** |
| `apps/web/indexedb` | 2 files (database, projectService) | Dexie CRUD | Solid coverage |
| `apps/web/services` | 2 files (sseService, useSSEProgress) | SSE events | Good |
| `apps/web/performance` | 1 file (LRUCache) | Cache eviction | Performance baseline exists |
| `apps/backend` | 4 files (ai, files, health, sseBroadcast) | API routes, SSE | Good coverage |
| `packages/ai-core/adapters` | 4 files (base, mock, openai, stability) | Adapter interface + implementations | **openai + stability tests exist** |
| `packages/ai-core/config` | 2 files (providerStore, rateLimits) | BYOK, rate limits | Good |
| `packages/ai-core/prompt` | 1 file (templateEngine) | Template rendering | Good |
| `packages/ai-core/interfaces` | 1 file | Interface compliance | Good |
| `packages/ai-core/registry` | 1 file (registry) | Registry methods | Exists |
| `packages/node-editor` | 1 file (ConnectionValidator) | Validation | Node component rendering **untested** |
| `packages/excalidraw` | 80+ files (vendored fork) | Full Excalidraw suite | No additional work needed |

### Key Untested Source Files
- `apps/web/src/hooks/useAutoExecute.ts` — **Target for D-07 gap filling**
- `apps/web/src/hooks/useAutoSave.ts` — **Target for D-07 gap filling**
- `apps/web/src/engine/resolvers.ts` — **Target for D-07 gap filling**

### Established Patterns
- Vitest with `describe`/`it`/`expect` (globals mode from tsconfig)
- Zustand store tests: `useXxxStore.setState({...})` in `beforeEach` for reset
- React component tests: `@testing-library/react` + `vi.mock()` for canvas-dependent modules
- Backend tests: Hono's built-in test helper (`app.request()`)
- Performance tests: `vitest bench` with `describe`/`bench`/`expect`
- `fake-indexeddb` for IndexedDB mocking in store/storage tests

### Integration Points
- Root `package.json` — Add vitest workspace config and test scripts
- `vitest.config.ts` — New file at project root (vitest workspace mode)
- Test directories remain in their current locations (no reorganization needed)

</code_context>

<specifics>
## Specific Ideas

- **vitest workspace config** — Use vitest's built-in workspace support with `vitest.workspace.ts` referencing each package's local vitest config. Root config only has shared settings (globals, coverage provider, test environment).
- **E2E with `@playwright/test`** — Simple `e2e/` directory at `apps/web/e2e/` with a single spec file covering the core flow. Playwright config minimal (just Chromium, headless).
- **Performance benchmark as separate profile** — Performance test files use `.perf.ts` suffix (not `.test.ts`) to keep them separate from unit tests. `vitest --run` excludes perf tests by default.
- **Coverage dashboard** — Use vitest's built-in `@vitest/coverage-v8` provider. Generate HTML + lcov reports. No third-party coverage service.
- **1000 iterations for benchmarks** — Not a formal statistical benchmark but enough iterations to detect >10% regression. Run via `vitest bench`.

</specifics>

<deferred>
## Deferred Ideas

- **CI Pipeline (GitHub Actions)** — v0.2 milestone. Including test gating on PRs.
- **Pre-commit hooks** — v0.2. husky + lint-staged for basic check before commit.
- **E2E flow variants** — Template creation, settings page, dark mode. Future expansion.
- **AI core missing tests** — encryption.ts, registry.ts elaborate tests deferred. Basic coverage exists.
- **Node editor component rendering tests** — Deferred to future UI polish phase.
- **Full performance suite** — Load testing (500+ elements), rendering frame rate benchmark, AI queue throughput.
</deferred>

---

*Phase: 08-testing-performance*
*Context gathered: 2026-07-02*
