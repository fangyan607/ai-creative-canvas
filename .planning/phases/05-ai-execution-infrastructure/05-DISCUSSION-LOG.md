# Phase 5: AI Execution Infrastructure — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-01
**Phase:** 05-ai-execution-infrastructure
**Areas discussed:** SSE Architecture, Queue & Rate Limiting, Progress Display UX, AI Image Placement, Bridge Scope

---

## SSE Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| 纯前端进度 | 适配器 EventEmitter 直接在浏览器端驱动 UI 更新，无需 SSE | ✓ |
| 预留 SSE 接口 | 封装 SSE client 层，后端就绪后只改连接方式 | |
| 并行做最小后端 | Phase 5 + 6 并行，先搭最小 Hono SSE 端点 | |

**User's choice:** 纯前端进度
**Notes:** Phase 5 不涉及 SSE。适配器的 EventEmitter 直接在浏览器端驱动引擎状态。Phase 6 后端完成后再添加真正的 Hono streamSSE 端点。

---

## Queue Model

| Option | Description | Selected |
|--------|-------------|----------|
| 全局 FIFO 队列 | 所有 provider 排成一个队列 | |
| 按 provider 分队列 | 每个 AI provider 独立队列 | ✓ |
| 优先级队列 | 支持优先级标记 | |

**User's choice:** 按 provider 分队列
**Notes:** 每个 provider 拥有独立的请求队列，一个 provider 的慢请求不影响其他 provider。FIFO 顺序，不支持优先级排序。

---

## Rate Limiting Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| 硬编码默认值 | 代码内置各 provider 已知速率限制 | ✓ |
| 可配置但默认合理 | 内置默认值但允许用户调整 | |
| 完全透明 | 显示当前限流状态给用户 | |

**User's choice:** 硬编码默认值
**Notes:** DALL-E 3: 5 req/min, Stability: 10 req/min, MockAdapter: 不限流。滑动窗口算法。

---

## Failure Handling

| Option | Description | Selected |
|--------|-------------|----------|
| 失败即停 | 引擎 fail-stop，下游跳过 | ✓ |
| 自动重试一次 | 遇到 rate_limit/server_error 自动重试 | |

**User's choice:** 失败即停
**Notes:** 符合 Phase 3 D-04 模式。不自动重试，用户修复后重新执行。

---

## Progress Display

| Option | Description | Selected |
|--------|-------------|----------|
| 节点状态指示就够了 | 依赖 Phase 3 已建的节点状态指示器 | ✓ |
| 节点指示 + 轻量 Toast | 生成完成时加短暂 Toast 提示 | |

**User's choice:** 节点状态指示就够了
**Notes:** 边框颜色 + 角标（queued→executing→done/error）已足够。不需要额外进度 UI。

---

## AI Image Placement

| Option | Description | Selected |
|--------|-------------|----------|
| PreviewNode Apply 按钮 | 用户手动点击 Apply 放置到画布 | ✓ |
| 全自动放置 | 生成完成后自动添加 AIElement | |

**User's choice:** PreviewNode Apply 按钮
**Notes:** 保持 Phase 2 已有的 Apply to Canvas 按钮模式，用户完全控制图片放置。

---

## Bridge Scope

| Option | Description | Selected |
|--------|-------------|----------|
| 只替换生成节点 | text-to-image 和 style 两个 AI 调用节点 | ✓ |
| 全部替换 | 所有 5 个节点类型都过桥接器 | |

**User's choice:** 只替换生成节点
**Notes:** prompt/merge/preview 保持 stub 不变。

---

## Claude's Discretion

以下领域用户授权 Claude 做技术决策：
- AIQueueStore 的数据结构设计
- Rate limiter 滑动窗口实现细节
- Engine-AI bridge 的代码位置和具体实现方式
- 适配器 progress → EngineStore 的映射策略
- "Apply to Canvas" 默认偏移值
- 同一 provider 队列的串行化策略

## Deferred Ideas

- SSE 服务端推送 — Phase 6
- 用户可配置的限流值 — MVP 之后
- 请求失败自动重试 — 未来
- 全局进度面板 — Phase 7 UI
- 请求队列手动控制 — 未来增强
