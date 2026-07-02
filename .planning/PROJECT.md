# AI无限创意画布

## What This Is

基于 Excalidraw 轻量化无限画布、融合 Blender 几何节点程序化编辑逻辑、集成全品类 AI 生成能力的一站式创意设计平台。用户无需专业设计技能，即可通过节点拖拽、参数微调、图层联动，精准控制 AI 生成内容的细节、风格和动态逻辑。产品适配图文设计、短视频创作、视觉创意、动态海报、概念设计等场景，服务个人创作者、自媒体从业者、中小设计团队、电商运营、学生群体等用户。

**已交付 v0.2 MVP:** 用户可以在无限画布上自由创作，通过可视化节点编辑器搭建 AI 文生图/图生图工作流，支持 OpenAI DALL-E 3 和 Stability.ai 双模型，项目持久化存储，画布导出为 PNG/JPG。

## Core Value

用户可以在一个无限自由的画布上，通过拖拽节点的方式，精准可控地完成 AI 图文创作全流程——从创意构思、素材生成、逻辑编辑、效果调试到成品输出。

## Requirements

### Validated

- [x] **CANVAS-01**: 用户可以在无限延展的画布上自由绘制、拖拽、缩放、平移 — *v0.2 (Phase 1)*
- [x] **CANVAS-02**: 画布支持 AI 生成图片元素的渲染和展示（AIElement） — *v0.2 (Phase 1)*
- [x] **CANVAS-03**: 画布支持元素分层/分组/锁定/隐藏管理 — *v0.2 (Phase 1)*
- [x] **CANVAS-04**: 画布采用分片渲染优化，500+ 元素保持流畅操作 — *v0.2 (Phase 1)*
- [x] **CANVAS-05**: 画布操作支持撤销/重做 — *v0.2 (Phase 1)*
- [x] **CANVAS-06**: 项目可通过 IndexedDB 本地保存和加载 — *v0.2 (Phase 1)*
- [x] **NODE-01**: 用户可通过 React Flow 集成实现节点拖拽和连线 — *v0.2 (Phase 2)*
- [x] **NODE-02**: 系统提供核心节点类型：PromptNode、TextToImageNode、StyleNode、MergeNode、PreviewNode — *v0.2 (Phase 2)*
- [x] **NODE-03**: 节点执行引擎支持拓扑排序、同层并行执行、增量执行（Dirty标记） — *v0.2 (Phase 3)*
- [x] **NODE-04**: 用户可在右侧参数面板调节节点参数 — *v0.2 (Phase 2)*
- [x] **NODE-05**: 节点图支持序列化/反序列化（保存/加载） — *v0.2 (Phase 2)*
- [x] **NODE-06**: 节点操作支持撤销/重做 — *v0.2 (Phase 3)*
- [x] **NODE-07**: 节点支持子分组（Group），防止"节点汤" — *v0.2 (Phase 3)*
- [x] **AI-01**: 系统通过 OpenAI DALL-E 3 适配器实现文生图 — *v0.2 (Phase 4)*
- [x] **AI-02**: 系统通过 Stability.ai 适配器实现文生图和图生图 — *v0.2 (Phase 4)*
- [x] **AI-03**: 系统提供 MockAdapter 用于离线调试 — *v0.2 (Phase 4)*
- [x] **AI-04**: AI 请求队列 + 速率限制保证调用稳定性 — *v0.2 (Phase 5)*
- [x] **AI-05**: 用户可自带 API Key 和自定义 API URL（BYOK 模式） — *v0.2 (Phase 4)*
- [x] **AI-06**: 系统提供 Prompt 构建器和模板系统 — *v0.2 (Phase 4)*
- [x] **AI-07**: 生成进度通过 SSE 实时推送到前端 — *v0.2 (Phase 5)*
- [x] **AI-08**: 节点引擎与 AI 适配器完成桥接对接 — *v0.2 (Phase 5)*
- [x] **UI-01**: 提供工具栏、侧边栏、素材面板等基础 UI 组件 — *v0.2 (Phase 7)*
- [x] **UI-02**: 用户可将画布导出为 PNG/JPG 格式 — *v0.2 (Phase 7)*
- [x] **UI-03**: 用户可创建、打开、保存、删除项目（项目管理页面） — *v0.2 (Phase 7)*
- [x] **UI-04**: 用户可在设置页面配置 AI API Key — *v0.2 (Phase 7)*
- [x] **BKND-01**: 后端提供 AI 代理 API，隐藏客户端 API Key — *v0.2 (Phase 6)*
- [x] **BKND-02**: 后端支持文件上传和下载服务 — *v0.2 (Phase 6)*
- [x] **TEST-01**: 节点引擎核心逻辑单元测试覆盖 — *v0.2 (Phase 8)*
- [x] **TEST-02**: AI 适配器 Mock 测试 — *v0.2 (Phase 8)*
- [x] **TEST-03**: 核心 E2E 流程测试（创建项目→拖拽节点→AI生成→导出） — *v0.2 (Phase 8)*

### Active

- [ ] **BKND-03**: 后端提供基础 JWT 认证 — added post-v0.2, deferred
- [ ] Next milestone requirements TBD

### Out of Scope

- AI 文生视频/图生视频 — 高 API 成本且复杂度大，推迟至 v0.2+（已确认）
- 云端实时同步协作 — 本地单机优先，协作功能在 v0.3
- 模板广场 — 生态功能，v0.3 考虑
- Electron 桌面应用 — v0.3 阶段考虑
- 移动端适配 — v1.0 阶段
- 3D 节点创作 — 长期演进
- 自训练 AI 模型 — 使用现有商业模型 API

## Context

- **v0.2 MVP 已交付** (2026-07-02) — 8个阶段，34个计划全部完成
- **代码规模**: 1286 文件变更，327K LOC，1705 个 TypeScript/TSX 源文件
- **测试覆盖率**: 418 个单元测试（38 文件），3 个 Playwright E2E 测试（14.2s），9 个性能基准测试
- **技术栈**: TypeScript 5.x + React 19.2.7 + Vite 8 + Zustand 5 + TailwindCSS 4 + Hono 4.x + Dexie.js 4
- **开发模式**: 单人全栈开发，采用 GSD + CodeGraph 精确开发工作流
- **已知技术债务**:
  - `useAutoSave.ts` 死代码（被内联 useProjectAutoSave 替代）
  - E2E 测试中 3 处非阻塞问题（异常吞噬、空断言、硬编码等待）
  - Excalidraw SCSS 弃用警告（上游代码）
  - 4 个阶段缺少 Nyquist 验证合规
- **里程碑存档**: [milestones/v0.2-ROADMAP.md](milestones/v0.2-ROADMAP.md)

## Constraints

- **Tech Stack**: 全栈 TypeScript — 统一语言降低上下文切换成本
- **Storage**: MVP 阶段使用 IndexedDB 本地存储，不上云
- **AI**: MVP 仅接入 2-3 家商业 API，使用适配器模式，不包括视频生成
- **Deployment**: Web-first，浏览器端 SPA + Hono 轻后端
- **Performance**: 画布需支持 500+ 元素流畅运行
- **Budget**: 个人项目，优先免费/低成本方案，AI API 使用 Mock 模式开发调试

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 全栈 TypeScript | 类型安全，单人开发无需切换上下文 | ✓ Good |
| Excalidraw Fork（最小侵入） | 需要新增 AI 元素类型，NPM 包方案能力受限 | ✓ Good |
| React Flow 作为节点底座 | 业界最成熟 React 节点编辑框架 | ✓ Good |
| Zustand + Immer 状态管理 | 轻量（1KB）、无 Provider、天然支持撤销/重做 | ✓ Good |
| 适配器模式接入多 AI 模型 | 开闭原则，新增模型只需新增适配器类 | ✓ Good |
| SSE 替代 WebSocket | 单向推送足够，实现更简单 | ✓ Good — Phase 6 验证 |
| Tempura 替代 Handlebars | 1.3KB vs 82KB，相同语法 | ✓ Good — Phase 4 验证 |
| AES-256-GCM API Key 加密 | 安全存储用户凭证 | ✓ Good — Phase 4 验证 |
| Dual-mode AI 代理 | 开发直连 / 生产代理模式切换 | ✓ Good — Phase 6 验证 |
| 5 领域分离 Zustand Store | 避免单一 Store 爆炸 | ✓ Good — 全阶段验证 |
| SQLite + D1 双模式 | MVP 零运维起步，未来可平滑上云 | — Pending |
| 分片渲染 + LRU 缓存 | 解决大画布性能瓶颈 | ✓ Good — Phase 1 验证 |
| MVP 不做视频生成 | 降低成本和复杂度，聚焦核心图文能力验证 | ✓ Good |
| 后端最小化 | 仅做 AI 代理和文件存储，业务逻辑放前端 | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-02 — v0.2 MVP milestone complete*
