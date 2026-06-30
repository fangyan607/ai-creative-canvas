# AI无限创意画布

## What This Is

基于 Excalidraw 轻量化无限画布、融合 Blender 几何节点程序化编辑逻辑、集成全品类 AI 生成能力的一站式创意设计平台。用户无需专业设计技能，即可通过节点拖拽、参数微调、图层联动，精准控制 AI 生成内容的细节、风格和动态逻辑。产品适配图文设计、短视频创作、视觉创意、动态海报、概念设计等场景，服务个人创作者、自媒体从业者、中小设计团队、电商运营、学生群体等用户。

## Core Value

用户可以在一个无限自由的画布上，通过拖拽节点的方式，精准可控地完成 AI 图文创作全流程——从创意构思、素材生成、逻辑编辑、效果调试到成品输出。

## Requirements

### Validated

- [x] **CANVAS-01**: 用户可以在无限延展的画布上自由绘制、拖拽、缩放、平移 *— Validated in Phase 1 (Core Canvas)*
- [x] **CANVAS-04**: 画布状态支持序列化/反序列化（保存/加载） *— Validated in Phase 1 (Core Canvas)*
- [x] **CANVAS-05**: 画布支持分片渲染性能优化，500+ 元素不卡顿 *— Validated in Phase 1 (Core Canvas)*
- [x] **NODE-01**: 用户可以拖拽节点到编辑器并连线形成创作流程 *— Validated in Phase 2 (Node Editor Interface)*
- [x] **NODE-02**: 系统提供 PromptNode、TextToImageNode、StyleNode、MergeNode、PreviewNode 等节点类型 *— Validated in Phase 2 (Node Editor Interface)*
- [x] **NODE-05**: 用户可以在参数面板调节节点参数 *— Validated in Phase 2 (Node Editor Interface)*

### Active

- [ ] **CANVAS-02**: 画布支持 AI 生成图片元素的渲染和展示
- [ ] **CANVAS-03**: 画布支持元素分层/分组/锁定/隐藏
- [ ] **NODE-03**: 节点执行引擎支持拓扑排序和并行执行
- [ ] **NODE-04**: 节点支持增量执行（仅重计算变更路径）
- [ ] **AI-01**: 用户通过文生图节点输入 Prompt 生成图片
- [ ] **AI-02**: 用户通过图生图节点进行风格迁移或重绘
- [ ] **AI-03**: 系统可接入 OpenAI DALL-E 3 和 Stability.ai 模型
- [ ] **AI-04**: AI 请求队列和速率限制保证调用稳定性
- [ ] **AI-05**: 生成进度通过 SSE 实时推送到前端
- [ ] **UI-01**: 工具栏、侧边栏、素材面板等基础 UI 组件
- [ ] **UI-02**: 用户可以将画布导出为 PNG/JPG 格式
- [ ] **UI-03**: 用户可以管理多个项目（创建/打开/保存/删除）
- [ ] **UI-04**: 用户可以配置 AI API Key
- [ ] **BKND-01**: 后端提供 AI 代理 API，隐藏 API Key
- [ ] **BKND-02**: 后端支持文件上传/下载
- [ ] **BKND-03**: 后端提供基础 JWT 认证
- [ ] **TEST-01**: 节点引擎单元测试覆盖核心逻辑
- [ ] **TEST-02**: AI 适配器 Mock 测试
- [ ] **TEST-03**: 核心 E2E 流程测试通过

### Out of Scope

- AI 文生视频/图生视频 — 高 API 成本且复杂度大，推迟至 v0.2
- 云端实时同步协作 — 本地单机优先，协作功能在 v0.3
- 模板广场 — 生态功能，v0.3 考虑
- Electron 桌面应用 — v0.3 阶段考虑
- 移动端适配 — v1.0 阶段
- 3D 节点创作 — 长期演进
- 自训练 AI 模型 — 使用现有商业模型 API

## Context

- **项目状态**: Phase 1 (Core Canvas) 完成 ✓ — Excalidraw 无限画布、HistoryStore 撤销/重做、IndexedDB 持久化、LRU 图片缓存已实现。Phase 2 (Node Editor Interface) 完成 ✓ — 5 节点类型、NodeGraphStore 状态管理、PropertyPanel 参数面板、ConnectionValidator 连线验证、2 模板、IndexedDB 集成。
- **开发模式**: 单人全栈 TypeScript 开发，采用 GSD + CodeGraph + GStack 精确开发工作流
- **技术选型**: 已通过 ADR 完成全部 10 项关键决策，技术栈已锁定
- **MVP 定位**: v0.1 聚焦无限画布 + 节点编辑器 + AI 文生图/图生图的核心闭环验证
- **已知风险**: Excalidraw 魔改复杂度、AI API 费用、节点引擎执行效率

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
| SQLite + D1 双模式 | MVP 零运维起步，未来可平滑上云 | — Pending |
| pnpm monorepo + Vite | 磁盘效率高、构建速度快 | ✓ Good |
| 分片渲染 + LRU 缓存 | 解决大画布性能瓶颈 | ✓ Good |
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
*Last updated: 2026-06-30 — Phase 1 (Core Canvas) and Phase 2 (Node Editor Interface) complete*
