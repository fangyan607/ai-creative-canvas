# Requirements: AI无限创意画布

**Defined:** 2026-06-29
**Core Value:** 用户可以在一个无限自由的画布上，通过拖拽节点的方式，精准可控地完成 AI 图文创作全流程——从创意构思、素材生成、逻辑编辑、效果调试到成品输出。

## v1 Requirements

Requirements for MVP (v0.1-alpha). Each maps to roadmap phases.

### 无限画布 (Canvas)

- [ ] **CANVAS-01**: 用户可以在无限延展的画布上自由绘制、拖拽、缩放和平移
- [ ] **CANVAS-02**: 画布支持 AI 生成图片元素的渲染和展示（AIElement）
- [ ] **CANVAS-03**: 画布支持元素分层、分组、锁定、隐藏管理
- [ ] **CANVAS-04**: 画布采用分片渲染优化，500+ 元素保持流畅操作
- [ ] **CANVAS-05**: 画布操作支持撤销/重做
- [ ] **CANVAS-06**: 项目可通过 IndexedDB 本地保存和加载

### 节点编辑器 (Node Editor)

- [ ] **NODE-01**: 用户可通过 React Flow 集成实现节点拖拽和连线
- [ ] **NODE-02**: 系统提供核心节点类型：PromptNode、TextToImageNode、StyleNode、MergeNode、PreviewNode
- [ ] **NODE-03**: 节点执行引擎支持拓扑排序、同层并行执行、增量执行（Dirty标记）
- [ ] **NODE-04**: 用户可在右侧参数面板调节节点参数
- [ ] **NODE-05**: 节点图支持序列化/反序列化（保存/加载）
- [ ] **NODE-06**: 节点操作支持撤销/重做
- [ ] **NODE-07**: 节点支持子分组（Group），防止"节点汤"

### AI 核心 (AI Core)

- [ ] **AI-01**: 系统通过 OpenAI DALL-E 3 适配器实现文生图
- [ ] **AI-02**: 系统通过 Stability.ai 适配器实现文生图和图生图
- [ ] **AI-03**: 系统提供 MockAdapter 用于离线调试
- [ ] **AI-04**: AI 请求队列 + 速率限制保证调用稳定性和可控性
- [ ] **AI-05**: 用户可自带 API Key 和自定义 API URL（BYOK 模式）
- [ ] **AI-06**: 系统提供 Prompt 构建器和模板系统
- [ ] **AI-07**: 生成进度通过 SSE（Hono streamSSE）实时推送到前端
- [ ] **AI-08**: 节点引擎与 AI 适配器完成桥接对接

### UI 界面 (UI)

- [ ] **UI-01**: 提供工具栏、侧边栏、素材面板等基础 UI 组件
- [ ] **UI-02**: 用户可将画布导出为 PNG/JPG 格式
- [ ] **UI-03**: 用户可创建、打开、保存、删除项目（项目管理页面）
- [ ] **UI-04**: 用户可在设置页面配置 AI API Key

### 后端服务 (Backend)

- [ ] **BKND-01**: 后端提供 AI 代理 API，隐藏客户端 API Key
- [ ] **BKND-02**: 后端支持文件上传和下载服务

### 测试 (Testing)

- [ ] **TEST-01**: 节点引擎核心逻辑单元测试覆盖
- [ ] **TEST-02**: AI 适配器 Mock 测试
- [ ] **TEST-03**: 核心 E2E 流程测试（创建项目→拖拽节点→AI生成→导出）

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### AI 视频生成

- **VID-01**: 文生视频功能（Runway / Luma 接入）
- **VID-02**: 图生视频功能
- **VID-03**: 视频编辑节点（裁剪/拼接/转场）

### 用户系统

- **AUTH-01**: JWT 认证系统（注册/登录）
- **AUTH-02**: 用户项目管理（服务端）

### 高级功能

- **ADV-01**: 云端存储和同步（Cloudflare R2 + D1）
- **ADV-02**: 模板广场（用户上传/复用节点模板）

## Out of Scope

明确排除的功能。记录以防止范围蔓延。

| Feature | Reason |
|---------|--------|
| AI 文生视频 / 图生视频 | 高 API 成本且复杂度大，推迟至 v0.2 |
| 云端实时同步协作 | 本地单机优先，协作功能在 v0.3 |
| 模板广场 | 生态功能，v0.3 考虑 |
| Electron 桌面应用 | v0.3 阶段考虑 |
| 移动端适配 | v1.0 阶段 |
| 3D 节点创作 | 长期演进 |
| 自训练 AI 模型 | 使用现有商业模型 API |
| WebSocket 实时通信 | SSE 已满足 v1 需求，过度设计 |
| 计费/订阅系统 | v0.1 不需商业化 |
| Replicate 适配器 | MVP 阶段保留 OpenAI + Stability 两条主流即可 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CANVAS-01 | Phase 1 | Pending |
| CANVAS-02 | Phase 1 | Pending |
| CANVAS-03 | Phase 1 | Pending |
| CANVAS-04 | Phase 1 | Pending |
| CANVAS-05 | Phase 1 | Pending |
| CANVAS-06 | Phase 1 | Pending |
| NODE-01 | Phase 2 | Pending |
| NODE-02 | Phase 2 | Pending |
| NODE-03 | Phase 2 | Pending |
| NODE-04 | Phase 2 | Pending |
| NODE-05 | Phase 2 | Pending |
| NODE-06 | Phase 2 | Pending |
| NODE-07 | Phase 2 | Pending |
| AI-01 | Phase 3 | Pending |
| AI-02 | Phase 3 | Pending |
| AI-03 | Phase 3 | Pending |
| AI-04 | Phase 3 | Pending |
| AI-05 | Phase 3 | Pending |
| AI-06 | Phase 3 | Pending |
| AI-07 | Phase 3 | Pending |
| AI-08 | Phase 3 | Pending |
| UI-01 | Phase 4 | Pending |
| UI-02 | Phase 4 | Pending |
| UI-03 | Phase 4 | Pending |
| UI-04 | Phase 4 | Pending |
| BKND-01 | Phase 4 | Pending |
| BKND-02 | Phase 4 | Pending |
| TEST-01 | Phase 5 | Pending |
| TEST-02 | Phase 5 | Pending |
| TEST-03 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-29*
*Last updated: 2026-06-29 after initial definition*
