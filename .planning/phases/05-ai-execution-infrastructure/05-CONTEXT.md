# Phase 5: AI Execution Infrastructure — Context

**Gathered:** 2026-07-01
**Status:** Ready for planning

<domain>
## Phase Boundary

构建 AI 执行基础设施层——在节点引擎 (Phase 3) 和 AI 适配器 (Phase 4) 之间建立桥接，实现请求队列、速率限制、进度反馈，使 TextToImageNode 和 StyleNode 能够通过引擎桥接器调用真实 AI 适配器并接收结果。

**本阶段不包含：** SSE 服务端推送（延迟到 Phase 6 后端）、后端 AI 代理 API（Phase 6）、UI 进度面板（节点状态指示已够）、自动图片放置（用户通过 PreviewNode Apply 按钮控制）

**Requirements covered:** AI-04 (请求队列 + 速率限制), AI-07 (SSE 进度流), AI-08 (引擎-适配器桥接)

**Success criteria:**
1. Multiple AI requests queue and execute sequentially within configured rate limits (no concurrent overrun)
2. User sees real-time generation progress in the UI via SSE events (queued -> processing -> chunk -> done)
3. AI-generated images automatically appear as AIElement instances on the canvas when generation completes
4. The TextToImageNode and StyleNode correctly pass their parameters through the engine bridge to AI adapters and receive results back
</domain>

<decisions>
## Implementation Decisions

### SSE 架构 (D-01)
- **D-01: 纯前端进度模式** — Phase 5 不实现 SSE 服务端推送。适配器通过 EventEmitter 发射的 `'progress'`/`'error'`/`'done'` 事件直接在浏览器端驱动引擎状态更新。Phase 6 后端完成后，再添加真正的 Hono streamSSE 端点和前端 EventSource 客户端。
  - 引擎状态已经支持 `queued` → `executing` → `done`/`error` 流转 (Phase 3 D-03 节点状态指示器)
  - 适配器 EventEmitter 的 progress 事件 (`percent`, `stage`) 映射到引擎执行阶段的视觉反馈
  - 这是临时状态，Phase 6 后端加入后，前端连接方式从直接 EventEmitter → SSE EventSource，不需改动引擎和适配器层

### 队列模型 (D-02)
- **D-02: 按 provider 分队列** — 每个 AI provider 拥有独立的请求队列：
  - `AIQueueStore` 管理多个子队列 (`Map<providerId, AIJob[]>`)
  - 一个 provider 的慢请求或限流不影响其他 provider
  - 队列按 FIFO 顺序执行，不支持优先级排序（MVP 简化）
  - 同一 provider 的请求串行执行（硬编码限流窗口内只发一个请求）
  - 队列状态存储在 `useAIQueueStore` 中（替换现有 stub）

### 速率限制 (D-03)
- **D-03: 硬编码默认限流值** — 代码内置各 provider 已知速率限制，用户不可见也不可配置：
  - OpenAI DALL-E 3: 5 请求/分钟 (rate: 5, window: 60000ms)
  - Stability.ai: 10 请求/分钟 (rate: 10, window: 60000ms)
  - MockAdapter: 不限流 (rate: Infinity)
  - 定义在 `packages/ai-core/src/config/rateLimits.ts`，按 `providerId` 索引
  - Rate limiter 使用滑动窗口算法，记录每个 provider 的时间戳队列
  - 当超出限流时，请求保持在队列中等待窗口重置

### 失败处理 (D-04)
- **D-04: 失败即停，不自动重试** — AI 执行失败时引擎遵循 Phase 3 D-04 fail-stop 模式：
  - 节点标记为 `error`，错误信息存入 EngineStore
  - 下游节点标记为 `skipped`
  - 执行停止
  - 不自动重试，即使 rate_limit 或 server_error 类错误
  - 用户修复后（调整参数、更换 provider）触发重新执行
  - 适配器抛出的 `AiAdapterError` 中的 `code` (`'auth_failed'`, `'rate_limited'`, `'server_error'`, `'invalid_params'`) 存储在 EngineStore 的错误信息中供用户查看

### 进度显示 (D-05)
- **D-05: 节点状态指示器即进度反馈** — 用户通过 Phase 3 已建的节点状态指示器（边框颜色 + 角标）感知生成进度：
  - `queued` (蓝色) → 等待队列
  - `executing` (琥珀色动画) → AI 适配器正在处理
  - `done` (绿色) → 生成完成，结果可在 PreviewNode 查看
  - `error` (红色) → 生成失败
  - 节点状态由 EngineStore 驱动，适配器 progress 事件更新 EngineStore 状态
  - 不需要额外的进度面板、Toast 通知或全局进度条
  - 如果 Phase 5 团队认为适配器 percent/stage 细节值得暴露，可通过节点工具提示显示

### AI 图片放置 (D-06)
- **D-06: PreviewNode Apply 按钮放置** — 生成完成后图片不自动放置到画布上：
  - 生成结果传递到 PreviewNode（通过引擎输出）
  - PreviewNode 属性面板显示生成图片预览
  - 用户点击 "Apply to Canvas"（已在 Phase 2 D-38 中设计）将图片作为 AIElement 放置到画布
  - 放置位置由用户拖拽 PreviewNode 的输出到画布指定区域决定，或在 Apply 时使用默认偏移位置
  - 保持 "用户完全控制" 的产品哲学

### 桥接范围 (D-07)
- **D-07: 只替换 text-to-image 和 style resolver** — 引擎桥接器只替换这两个直接调用 AI 适配器的节点 resolver：
  - **text-to-image**: 当前 stub 替换为真正的 AI 适配器调用
    - 从 AdapterRegistry 获取节点配置的 provider
    - 从 ProviderStore 读取 API 配置（含加密 API key）
    - 通过 TemplateEngine 构建最终 prompt
    - 调用适配器的 `execute()` 方法
    - 结果：`{ imageBlobId, width, height, seed, model, timing }`
  - **style**: 当前 stub 替换为真正的 AI 适配器调用（图生图路径）
    - 与 text-to-image 类似的桥接逻辑，但传递上游图片和 style preset
    - 结果：`{ imageBlobId, stylePreset, ...AdapterResult }`
  - **prompt/merge/preview**: 保持现有 stub 行为不变
    - prompt 节点：透传 prompt 文本（不需要 AI 调用）
    - merge 节点：结果整合逻辑（Phase 5 中保持 stub）
    - preview 节点：展示上游结果（不需要修改）

### Claude's Discretion
- AIQueueStore 的具体数据结构（Job 类型包含 providerId, nodeId, params 等字段）
- Rate limiter 滑动窗口的实现细节（时间戳队列去重、窗口边界处理）
- Engine-AI bridge 的具体代码位置（新文件 `apps/web/src/engine/aiBridge.ts` 或直接修改 resolvers.ts）
- 适配器 progress 事件如何映射到 EngineStore 的节点状态更新时间粒度
- "Apply to Canvas" 按钮触发的 AIElement 默认位置偏移值
- 并发限制：同一 provider 队列的串行化策略（await 上一个完成再开始下一个）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Boundary & Requirements
- `.planning/ROADMAP.md` §Phase 5 — Goal, success criteria, dependency structure (Phase 4 + Phase 3)
- `.planning/REQUIREMENTS.md` — AI-04 (queue + rate limiting), AI-07 (SSE streaming), AI-08 (engine-AI bridge)

### Prior Phase Decisions (Mandatory Reading)
- `.planning/phases/03-node-engine/03-CONTEXT.md` — D-01 (sync-first, async stubs for Phase 5), D-02 (hybrid trigger, Run button deferred), D-03 (node status indicators), D-04 (fail-stop), D-05 (dirty-path marking), D-09 (EngineStore)
- `.planning/phases/04-ai-adapters/04-CONTEXT.md` — D-01 (class-based adapter), D-02 (mandatory interface methods), D-04 (AdapterResult shape), D-05 (EventEmitter progress), D-07 (ai-core package), D-08~10 (ProviderStore), D-11~14 (TemplateEngine)
- `.planning/phases/02-node-editor-interface/02-CONTEXT.md` — D-38 (PreviewNode footer Apply button), D-39 (parameter field types)

### Technical Research
- `.planning/research/ARCHITECTURE.md` — Pattern 5 (Adapter Pattern), Pattern 7 (SSE Streaming — note: Phase 5 uses frontend-only, SSE pattern deferred to Phase 6)
- `.planning/research/PITFALLS.md` — Pitfall 4 (API Cost Blow-up), Pitfall 5 (Prompt Fragility), Pitfall 6 (Zustand re-render cascade)

### Existing Code (Read for Patterns)
- `apps/web/src/engine/NodeEngine.ts` — Engine execution lifecycle, `execute()` async method, layer-by-layer execution with Promise.allSettled. Phase 5 keeps this structure, replaces stubs with real async executors.
- `apps/web/src/engine/resolvers.ts` — `createDefaultResolvers()` — Phase 5 replaces `text-to-image` and `style` resolvers. Comments explicitly say "Phase 5 replaces with real async AI provider executors."
- `apps/web/src/engine/types.ts` — `Executor` type signature: `(nodeData, inputs) => ExecutorOutput | Promise<ExecutorOutput>` — already supports async return.
- `apps/web/src/stores/engineStore.ts` — EngineStore with `nodeStatus`, `nodeErrors`, `isExecuting`, serialization.
- `apps/web/src/stores/stubs/aiQueueStore.ts` — Empty stub, Phase 5 implements full AIQueueStore.
- `apps/web/src/stores/nodeGraphStore.ts` — Node graph store that bridge reads node data from and writes results to.
- `packages/ai-core/src/interfaces/AiAdapter.ts` — Abstract base class with `execute()`, `testConnection()`, `getModels()`, `getConfigSchema()`, extends EventEmitter.
- `packages/ai-core/src/interfaces/types.ts` — `AdapterResult`, `AiAdapterError`, `ConfigField`, `ModelDescriptor`, `ProviderConfig`.
- `packages/ai-core/src/registry.ts` — `AdapterRegistry` singleton. Phase 5 queries `registry.get(providerId)` to find the right adapter constructor.
- `packages/ai-core/src/config/providerStore.ts` — ProviderStore for reading encrypted API configs.
- `packages/ai-core/src/prompt/templateEngine.ts` — Template engine for constructing prompts with variable substitution.
- `packages/ai-core/src/prompt/templates.ts` — All prompt template definitions.
- `packages/shared/src/types/nodeGraph.ts` — `TextToImageNodeData`, `StyleNodeData` types with `model` field.

### Configuration
- `.planning/config.json` — Workflow configuration
- `CLAUDE.md` — Project instructions, tech stack constraints
- `.planning/PROJECT.md` — Vision, constraints, key decisions
- `.planning/STATE.md` — Current project state

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **EngineStore** (`apps/web/src/stores/engineStore.ts`) — Already has `nodeStatus`, `nodeErrors`, `isExecuting`, `serialize()`/`loadSerialized()`. Phase 5 extends `isExecuting` semantics for queue state.
- **AdapterRegistry** (`packages/ai-core/src/registry.ts`) — Singleton with `get(providerId)` and `getAllProviders()`. Bridge queries this to find adapter for a node's selected provider.
- **AiAdapter base class** (`packages/ai-core/src/interfaces/AiAdapter.ts`) — Extends EventEmitter. `execute()` already returns `Promise<AdapterResult>`. Progress events: `'progress'` with `{ percent, stage }`, `'error'` with `{ code, message }`, `'done'` with `AdapterResult`.
- **ProviderStore** (`packages/ai-core/src/config/providerStore.ts`) — CRUD for encrypted API configs. Bridge reads config to instantiate adapter with correct credentials.
- **TemplateEngine** (`packages/ai-core/src/prompt/templateEngine.ts`) — Bridge uses this to build final prompt before calling adapter.execute().
- **NodeGraphStore** (`apps/web/src/stores/nodeGraphStore.ts`) — Bridge reads `node.data` for parameters, writes output back.
- **Executor type** (`apps/web/src/engine/types.ts`) — `Executor = (nodeData, inputs) => ExecutorOutput | Promise<ExecutorOutput>` — already async-compatible.
- **Engine `execute()` method** (`apps/web/src/engine/NodeEngine.ts`) — Uses `Promise.allSettled` per layer. Already supports async executors. Phase 5 just needs to swap the resolvers map.

### Established Patterns
- Zustand + Immer stores with fine-grained `useShallow` selectors
- `serialize()` / `loadSerialized()` interface for state stores
- 180ms debounce merge window for auto-save (Phase 1 D-09)
- `structuredClone()` for snapshot deep copies
- Blob storage for images (Phase 1 D-13)
- Engine state separate from graph topology (Phase 3 D-09)
- Resolver pattern: `Map<NodeType, Executor>` — Phase 5 replaces entries in this map

### Integration Points for Phase 5
- **`apps/web/src/engine/resolvers.ts`** — Replace `text-to-image` and `style` entries in `createDefaultResolvers()`
- **`apps/web/src/stores/stubs/aiQueueStore.ts`** — Empty stub to be replaced with full AIQueueStore implementation
- **`apps/web/src/stores/engineStore.ts`** — May need to add queue state tracking alongside existing `isExecuting`
- **`apps/web/src/App.tsx`** — Wire up adapter registry initialization (register adapters at bootstrap)
- **No change needed:** `NodeGraphStore`, `HistoryStore`, `CanvasStore` — they interact via existing serialized interfaces

### What Phase 5 Builds
- **AIQueueStore** — New Zustand store managing per-provider queues, job lifecycle, rate limiter integration
- **Rate limiter** — Sliding window implementation per provider, consumed by queue before dispatching
- **AI Bridge** — New module(s) that swap resolver stubs with real adapters, construct prompts via TemplateEngine, inject ProviderStore configs, and wire EventEmitter progress to EngineStore
- **Adapter bootstrap** — Registry initialization and adapter registration that App.tsx calls on mount
- **TemplateEngine integration** — Bridge uses template engine to construct final prompt from node data + upstream inputs before calling adapter.execute()

</code_context>

<specifics>
## Specific Ideas

- **AI bridge as resolver factory** — The bridge should be a function that takes (`providerId`, `nodeData`) and returns an `Executor` function. The returned executor reads ProviderStore, instantiates the adapter via AdapterRegistry, calls it, and returns the result in ExecutorOutput format.
- **Adapter disposal** — After bridge execution, clean up EventEmitter listeners to prevent memory leaks from repeated node executions.
- **Rate limiter as a standalone utility** — `packages/ai-core/src/config/rateLimits.ts` with a pure function `checkRateLimit(providerId, timestamps[]): { allowed, waitMs }` — testable without Zustand.
- **Per-provider queue visualization** — Even without a dedicated progress panel, the EngineStore's nodeStatus provides sufficient queue visibility. If users later want to see queue depth, this maps directly to AIQueueStore state.
- **Prompt build order**: node data prompt text → apply template (if configured) → substitute upstream/node variables → final prompt string → adapter.execute({ prompt })

</specifics>

<deferred>
## Deferred Ideas

- **SSE 服务端推送** — Phase 6 后端添加真正的 Hono streamSSE 端点
- **用户可配置的限流值** — MVP 后考虑在设置页面暴露
- **请求失败自动重试** — Phase 5 不做，未来可以加为可配置行为
- **全局进度面板** — Phase 7 UI 阶段再考虑
- **请求队列手动控制**（暂停、取消、调整优先级）— 未来增强
- **全自动图片放置** — 与 Phase 5 的产品哲学（用户控制）冲突，不计划
- **merge 节点真实合并逻辑** — 当前保持 stub，未来可以替换为 canvas-level 合并

</deferred>

---

*Phase: 05-ai-execution-infrastructure*
*Context gathered: 2026-07-01*
