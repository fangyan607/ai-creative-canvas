# Phase 6: Backend Services — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-01
**Phase:** 06-backend-services
**Areas discussed:** SSE 流式端点设计

---

## SSE 流式端点设计

| Option | Description | Selected |
|--------|-------------|----------|
| 前端执行 + SSE 广播层 | 前端执行链路不变，后端额外提供 SSE 广播端点，适配器进度事件同时发到后端 SSE 和本地 EngineStore。改动最小 | ✓ |
| 后端全权执行 + SSE | AI 执行完全移到后端，前端通过 HTTP + SSE 全程代理 | |
| 最小化：仅 SSE 通知端点 | 先做最简单的 SSE 进度端点，AI 执行路径保持不变 | |

**User's choice:** 前端执行 + SSE 广播层
**Notes:** Phase 5 的前端 AI 执行链路保持不变。后端额外提供 SSE 广播层。直连模式不受影响。

---

## SSE 端点设计

| Option | Description | Selected |
|--------|-------------|----------|
| 按任务隔离（/api/sse/progress/:taskId） | 每个 AI 任务独立 SSE 连接，精确追踪但连接数较多 | |
| 全局端点（/api/sse/progress） | 所有进度事件通过同一连接推送，前端根据 taskId 区分 | ✓ |

**User's choice:** 全局端点
**Notes:** 单个长期 SSE 连接承载所有 AI 进度事件，EventSource 原生支持自动重连。

---

## SSE 消息格式

| Option | Description | Selected |
|--------|-------------|----------|
| 适配器事件透传 | 适配器 emit 什么 SSE 就推什么，最简洁 | |
| SSE 事件标准化格式 | 定义标准化的 SSE 消息格式，包含 event type、nodeId、percent、stage、timestamp | ✓ |

**User's choice:** SSE 事件标准化格式
**Notes:** `event: progress/error/done` + `data: { type, taskId, nodeId, providerId, percent, stage, timestamp }`

---

## 前端 SSE 消费方式

| Option | Description | Selected |
|--------|-------------|----------|
| React hook 封装 | `useSSEProgress` hook 直接封装 EventSource 和 EngineStore 更新 | |
| 独立 SSE 服务层 + hook | SSEService 类管理连接和事件分发，hook 调用服务层 | ✓ |

**User's choice:** 独立 SSE 服务层 + hook
**Notes:** SSEService 可独立测试（mock EventSource），hook 职责单一。

---

## Claude's Discretion

以下领域用户授权 Claude 做技术决策（用户未选择讨论，由 Claude 在 CONTEXT.md 中给出推荐方案）：
- AI 代理 API 路由设计（通用 `/api/ai/generate` + 按 providerId 分发）
- 文件存储位置和策略（本地磁盘，按日期分目录）
- 前后端模式切换机制（VITE_AI_PROXY_MODE 环境变量）
- 后端安全措施（开发无认证，预留 JWT 接入点）
- 后端项目结构（`apps/backend/` 与 `apps/web/` 平级）

## Deferred Ideas

- SSE 连接鉴权 — 后续通过 JWT token 参数保护
- 文件自动清理/配额管理 — MVP 不做
- 后端子定义 API Key — 当前仅环境变量，后续可加服务端 ProviderStore
- Cloudflare R2 集成 — 预留接口
- BKND-03 JWT 认证 — 延迟到 v0.2
