# Phase 6: Backend Services — Context

**Gathered:** 2026-07-01
**Status:** Ready for planning

<domain>
## Phase Boundary

构建 Hono 轻后端，提供 AI 代理 API（隐藏客户端 API Key）、文件上传/下载服务，以及 SSE 流式推送端点。前端在直连模式（dev）和后端代理模式（production）之间可切换。

**本阶段不包含：** 用户系统/注册登录（不晚于 v0.2）、模板广场（v0.3）、云端同步协作（v0.3）、Electron 桌面应用（v0.3）

**Requirements covered:** BKND-01（AI 代理 API）, BKND-02（文件上传/下载）

**Success criteria:**
1. Client sends AI generation requests through the backend proxy; API keys remain server-side only
2. User can upload image files to the backend and download them later
3. Frontend works in both direct-API-key mode (dev) and backend-proxy mode (production) with a configuration toggle
</domain>

<decisions>
## Implementation Decisions

### SSE 流式推送 (D-01 ~ D-04)
- **D-01: 前端执行 + SSE 广播层** — Phase 5 的 AI 执行链路（AIQueueStore + 适配器直接 EventEmitter）保持不变。后端额外提供 SSE 广播端点，适配器在 emit progress 事件的同时，将进度发送到后端 SSE 服务，再由后端通过 SSE 推送给前端。这是最小改动方案，前端直连模式完全不受影响。
  - 直连模式：适配器 EventEmitter → EngineStore（与 Phase 5 完全一致）
  - 代理模式：适配器 EventEmitter → 前端 HTTP 请求后端 → 后端 SSE → 前端 EventSource → EngineStore
  - 两种模式下前端 EngineStore 的更新路径保持统一

- **D-02: 全局 SSE 端点 `/api/sse/progress`** — 单个 SSE 连接承载所有 AI 进度的推送事件。前端打开一个长期 SSE 连接，所有任务的进度、错误、完成事件通过同一连接推送。前端根据事件 payload 中的 `taskId`/`nodeId` 字段区分不同任务。
  - 不需要按任务 ID 隔离端点（避免连接频繁创建/销毁）
  - SSE 连接在页面生命周期内保持（与 App 共存）
  - 连接断开时自动重连（EventSource 原生支持）

- **D-03: SSE 事件标准化格式** — 定义统一的消息格式，前端 EventSource 据此更新 EngineStore：
  ```
  event: progress
  data: {"type":"progress","taskId":"uuid","nodeId":"n1","providerId":"openai","percent":45,"stage":"generating","timestamp":1719800000000}
  
  event: error
  data: {"type":"error","taskId":"uuid","nodeId":"n1","code":"rate_limited","message":"Rate limit exceeded","timestamp":1719800000000}
  
  event: done
  data: {"type":"done","taskId":"uuid","nodeId":"n1","result":{"imageBlobId":"...","width":1024,"height":1024},"timestamp":1719800000000}
  ```
  - `event` 字段使用标准 SSE 事件类型（`progress`/`error`/`done`）
  - `data` 字段为 JSON 序列化的事件 payload，包含 `type`、`taskId`、`nodeId`、`providerId`、`percent`、`stage`、`timestamp`
  - 此格式独立于底层 AI 适配器，适配器更换不影响 SSE 协议

- **D-04: 独立 SSE 服务层 + React Hook** — 前端创建一个 `SSEService` 类封装 EventSource 连接管理和事件分发，再通过 `useSSEProgress` hook 供组件使用。
  - `SSEService` 负责：连接建立/重连、事件解析、按 `event` type 分发回调
  - `useSSEProgress` hook 负责：将 SSE 事件映射到 EngineStore 的 `setNodeStatus()`/`setNodeError()`
  - 服务层可独立测试（mock EventSource），hook 职责单一

### AI 代理 API (Claude's Discretion)
- **D-05: 通用代理 + 按 provider 分发** — 后端提供单一 `/api/ai/generate` 端点，请求体中包含 `providerId` 字段。后端根据 `providerId` 从服务端配置读取对应 API Key（不再依赖前端 ProviderStore），转发请求到 AI 提供商。
  - 请求体格式：`{ providerId: string, params: AdapterParams }`，与 Phase 4 适配器接口对齐
  - 响应方式：当请求包含 `Accept: text/event-stream` 头时，以 SSE 流式返回进度；否则直接返回 JSON 结果
  - Provider API Key 通过环境变量 `AI_OPENAI_KEY`、`AI_STABILITY_KEY` 配置，不存储在数据库中
  - 适配器复用 `packages/ai-core` 中的现有适配器类（后端也需要安装 `@ac-canvas/ai-core` 依赖）

### 文件上传/下载 (Claude's Discretion)
- **D-06: 本地磁盘文件存储** — 上传的图片存储在 `apps/backend/uploads/` 目录，按日期分目录组织（`uploads/2026-07-01/uuid.png`）。
  - 提供 `/api/files/upload`（POST, multipart/form-data）和 `/api/files/:fileId`（GET）两个端点
  - 文件 ID 使用 UUID，文件元数据存储在内存 Map 中（MVP 不引入数据库）
  - 支持的文件类型：PNG、JPG、WebP（与 AI 适配器输出格式对齐）
  - 暂不实现自动清理策略（MVP 文件量小，用户手动管理或后续版本添加）

### 前后端模式切换 (Claude's Discretion)
- **D-07: 环境变量编译时切换** — 通过 `VITE_AI_PROXY_MODE` 环境变量控制：
  - `VITE_AI_PROXY_MODE=direct`（默认）：前端直连 AI 提供商 API（使用 Phase 4 的 ProviderStore）
  - `VITE_AI_PROXY_MODE=proxy`：AI 请求全部通过后端 `/api/ai/generate` 转发
  - 编译时决定而非运行时动态切换：简化实现，避免运行时条件判断的复杂度
  - 开发阶段使用 `direct` 模式（零后端依赖），部署时使用 `proxy` 模式
  - 当 `proxy` 模式时，前端 ProviderStore 不再存储 API Key（密钥仅存在于服务端环境变量）

### 后端安全 (Claude's Discretion)
- **D-08: 开发阶段无认证，生产阶段预留 JWT** — MVP 开发阶段后端端点不做认证（localhost 信任环境）。后端代码预留 Hono JWT 中间件接入点，Project.md 中的 BKND-03 需求延迟到 v0.2。
  - 不实现用户注册/登录流程
  - 文件上传/下载端点不做鉴权（个人工具场景可接受）
  - 后续添加 JWT 时使用 `@hono/jwt` 中间件，前端通过 `Authorization: Bearer <token>` 头发送

### Claude's Discretion
- 后端项目结构（`packages/backend` 还是 `apps/backend`？推荐 `apps/backend/hono` 与前端 `apps/web` 平级）
- 后端 package.json 中 Hono 的具体路由设计
- SSE 服务层 SSEService 的 TypeScript 接口定义
- 文件存储目录路径配置化（默认 `uploads/`）
- 后端启动端口（开发阶段默认 3001）
- Vite 开发代理配置（`vite.config.ts` 中 proxy 到 localhost:3001）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Boundary & Requirements
- `.planning/ROADMAP.md` §Phase 6 — Goal, success criteria, dependency structure (independent)
- `.planning/REQUIREMENTS.md` — BKND-01 (AI proxy API), BKND-02 (file upload/download)

### Prior Phase Decisions (Mandatory Reading)
- `.planning/phases/05-ai-execution-infrastructure/05-CONTEXT.md` — D-01 (SSE deferred to Phase 6)
- `.planning/phases/05-ai-execution-infrastructure/05-CONTEXT.md` — D-05 (node status indicators)
- `.planning/phases/04-ai-adapters/04-CONTEXT.md` — D-01 (adapter interface), D-04 (AdapterResult shape), D-05 (EventEmitter progress)
- `.planning/phases/04-ai-adapters/04-CONTEXT.md` — D-08~10 (ProviderStore, encryption)

### Technical Research & Architecture
- `.planning/research/ARCHITECTURE.md` — Pattern 7 (SSE Streaming)
- `.planning/PROJECT.md` — Decision: "后端最小化 — 仅做 AI 代理和文件存储", SQLite + D1 dual mode

### Existing Code (Read for Patterns)
- `packages/ai-core/src/interfaces/AiAdapter.ts` — EventEmitter base class with `'progress'`/`'error'`/`'done'` events (Phase 5 bridge subscribes to these; Phase 6 SSE service will too)
- `packages/ai-core/src/interfaces/types.ts` — `AdapterResult` shape
- `apps/web/src/engine/aiBridge.ts` — `createAiExecutor()` bridge factory (reads ProviderStore, calls adapter.execute())
- `apps/web/src/stores/aiQueueStore.ts` — AIQueueStore (Phase 5 queue — may need to notify backend of new tasks for SSE)
- `apps/web/src/stores/engineStore.ts` — `setNodeStatus()`, `setNodeError()` — SSE events map to these
- `apps/web/src/indexedb/providerStorage.ts` — DexieProviderStorage (for reference if backend needs storage pattern)
- `apps/web/src/stores/providerStoreSingleton.ts` — ProviderStore singleton (frontend-only, backend uses env vars)

### Configuration
- `CLAUDE.md` — Tech stack constraints (Hono 4.x, Node 24 LTS)
- `.planning/config.json` — Workflow configuration
- `.planning/STATE.md` — Current project state
- `apps/web/vite.config.ts` — May need proxy configuration for dev mode

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Hono 4.x** (`hono@4.12.27` in node_modules) — Already in dependency tree, no install needed
- **AdapterRegistry** (`packages/ai-core/src/registry.ts`) — Can be reused on backend for adapter instantiation
- **AiAdapter base class** (`packages/ai-core/src/interfaces/AiAdapter.ts`) — Reused on backend for AI execution
- **EngineStore** (`apps/web/src/stores/engineStore.ts`) — `setNodeStatus()` is the target for SSE events
- **Vite proxy config** — `vite.config.ts` currently has no proxy; Phase 6 adds `/api` proxy to backend

### Established Patterns
- Zustand + Immer stores with fine-grained `useShallow` selectors (for new frontend state)
- In-memory singleton pattern (`imageBlobStore`, providerStoreSingleton)
- Environment variable pattern (`VITE_*` prefix for frontend build-time config)

### Integration Points
- **`apps/web/vite.config.ts`** — Add proxy configuration for `/api` → `http://localhost:3001` in dev mode
- **`apps/web/src/App.tsx`** — Initialize SSE service on mount (conditionally based on proxy mode)
- **`apps/web/src/engine/aiBridge.ts`** — In proxy mode, bridge sends HTTP request to backend instead of calling adapter directly
- **`apps/web/src/indexedb/imageStore.ts`** — In proxy mode, images stored on backend; frontend references by backend file ID
- **No new package needed:** Hono already in tree. `@hono/jwt` may be needed if auth added.

### What Phase 6 Builds
- **Backend app** (`apps/backend/`) — Hono server with routes for AI proxy, file service, SSE
- **SSE service** — Backend SSE endpoint + frontend SSEService class + useSSEProgress hook
- **Vite proxy config** — Dev mode reverse proxy to backend
- **Adapter integration** — Backend adapter execution path (separate from frontend direct mode)

</code_context>

<specifics>
## Specific Ideas

- **Vite proxy 作为 dev 桥梁** — 开发阶段前端通过 `vite.config.ts` 的 server.proxy 将 `/api` 请求转发到后端 `localhost:3001`，无需 CORS 配置。生产阶段通过同域部署或反向代理解决。
- **后端复用 ai-core 包** — 后端 `apps/backend/package.json` 依赖 `@ac-canvas/ai-core: "workspace:*"`，可直接复用 AdapterRegistry、AiAdapter 基类、适配器实现
- **SSE 与 Phase 5 EventEmitter 共存** — 直连模式下 SSE 服务层不激活；代理模式下 SSE 激活且适配器不直接 emit 到 EngineStore，而是通过 HTTP → SSE → EventSource → EngineStore 路径
- **后端 API Key 仅环境变量** — 不实现 ProviderStore 的服务端版本，API Key 通过 `process.env.AI_OPENAI_KEY` / `AI_STABILITY_KEY` 读取，部署时配置

</specifics>

<deferred>
## Deferred Ideas

- **SSE 连接鉴权** — 当前不做。如果后续需要保护 SSE 端点，通过 JWT token 参数或 cookie 验证
- **文件自动清理/配额管理** — MVP 不做。后续可添加文件大小限制、自动过期清理
- **后端 ProviderStore 服务端版本** — 当前通过环境变量管理 API Key。后续如需用户自定义 Key 可通过服务端 ProviderStore 实现
- **Cloudflare R2 集成** — 预留接口，当前使用本地磁盘。后续上云时替换存储层实现
- **BKND-03 JWT 认证** — 延迟到 v0.2
- **文件 CDN 加速** — 延迟到上云阶段
- **WebSocket 替代 SSE** — 不需要，SSE 已满足单向进度推送需求

</deferred>

---

*Phase: 06-backend-services*
*Context gathered: 2026-07-01*
