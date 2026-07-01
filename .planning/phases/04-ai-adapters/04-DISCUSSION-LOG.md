# Phase 4: AI Adapters — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-01
**Phase:** 04-ai-adapters
**Areas discussed:** 适配器接口 + 图片输出处理, 包结构 + BYOK 存储, Prompt 模板系统, MockAdapter 行为

---

## 适配器接口 + 图片输出处理

### 适配器形式

| Option | Description | Selected |
|--------|-------------|----------|
| Class (OOP 风格) | 每个适配器是一个 class，实现统一的 AiAdapter 接口 | ✓ |
| 函数工厂 + 对象 | 适配器是一个 createAdapter(config) 工厂函数返回对象 | |

**User's choice:** Class (OOP 风格)
**Notes:** 经典适配器模式，清晰可扩展

### 适配器接口方法

| Option | Description | Selected |
|--------|-------------|----------|
| execute() | 实现 Executor 签名，生成图像 | ✓ |
| testConnection() | 测试 API key 和端点是否有效 | ✓ |
| getModels() | 返回支持的模型列表及参数约束 | ✓ |
| getConfigSchema() | 返回配置 schema，用于自动生成 UI | ✓ |

**User's choice:** 全部 4 个方法
**Notes:** 用户选择了全部方法

### 图片输出方式

| Option | Description | Selected |
|--------|-------------|----------|
| 适配器返回原始数据 | 返回 ArrayBuffer/Blob，调用方负责存储 | |
| 适配器直接存入 BlobStore | 适配器接收 storeImage(blob) 回调，返回 blobId | ✓ |

**User's choice:** 适配器直接存入 BlobStore
**Notes:** 适配器通过回调存储，不管理存储生命周期

### 返回结构字段

| Option | Description | Selected |
|--------|-------------|----------|
| imageBlobId | 生成图片的 Blob 引用 ID | ✓ |
| width + height | 实际生成尺寸 | ✓ |
| seed + model | 实际使用的 seed 和模型名 | ✓ |
| timing | 生成耗时 ms | ✓ |

**User's choice:** 全部 4 个字段

### 进度上报模式

| Option | Description | Selected |
|--------|-------------|----------|
| 回调函数 onProgress | execute() 接受 onProgress 参数 | |
| 事件发射器 EventEmitter | 适配器继承 EventEmitter，调用方监听事件 | ✓ |

**User's choice:** EventEmitter 模式
**Notes:** 更灵活，Phase 5 SSE 可以直接桥接 EventEmitter 事件

---

## 包结构 + BYOK 存储

### 包结构

| Option | Description | Selected |
|--------|-------------|----------|
| 新 packages/ai-core 工作空间包 | 独立包，与 excalidraw/node-editor 同级 | ✓ |
| apps/web/src/ai/ 模块 | 放前端 app 内部，更简单但日后需抽包 | |

**User's choice:** 新 packages/ai-core 工作空间包
**Notes:** 符合 monorepo 模式，Phase 5 可以干净引用

### API Key 存储

| Option | Description | Selected |
|--------|-------------|----------|
| IndexedDB（持久化） | 用户关闭浏览器后 Key 不丢失 | ✓ |
| 仅内存（session-only） | 每次刷新重新配置 | |
| sessionStorage + 可选持久化 | 折中方案 | |

**User's choice:** IndexedDB（持久化）

### Key 加密

| Option | Description | Selected |
|--------|-------------|----------|
| 不加密，明文存储 | MVP 简化 | |
| 简单编码/混淆 | 防不经意目视 | |
| Web Crypto API 加密 | SubtleCrypto 派生密钥加密存储 | ✓ |

**User's choice:** Web Crypto API 加密
**Notes:** 安全优先，但如果 UX 复杂度太高可使用轻量方案过渡

### 自定义 Base URL

| Option | Description | Selected |
|--------|-------------|----------|
| 需要 | 用户可自定义每个提供商的 API 端点 | ✓ |
| 不需要 | 硬编码官方端点 | |

**User's choice:** 需要自定义 base URL
**Notes:** 支持代理/镜像场景

---

## Prompt 模板系统

### 模板语法

| Option | Description | Selected |
|--------|-------------|----------|
| 自定义简单语法 {{variable}} | 轻量双花括号替换 | |
| Handlebars 兼容语法 | 支持条件/循环等复杂逻辑 | ✓ |

**User's choice:** Handlebars 兼容语法
**Notes:** 实现为轻量自定义解析器，不全量引入 Handlebars

### 模板存储

| Option | Description | Selected |
|--------|-------------|----------|
| TypeScript 常量文件 | 类型安全，无查询，MVP 模式 | ✓ |
| IndexedDB 数据库 | 灵活但过度设计 | |
| JSON 配置文件 | 中间方案 | |

**User's choice:** TypeScript 常量文件

### 模板归属

| Option | Description | Selected |
|--------|-------------|----------|
| 集中管理 | 所有模板集中存放 | ✓ |
| 分散在各适配器目录 | 每个适配器包携带自己的模板 | |

**User's choice:** 集中管理

### 模板变量来源

| Option | Description | Selected |
|--------|-------------|----------|
| 节点参数 | 来自 TextToImageNodeData 等字段 | ✓ |
| 上游节点输出 | 前驱节点的生成内容 | ✓ |
| 全局上下文 | 画布信息、项目信息 | ✓ |
| 系统预设 | 内置角色设定、质量修饰词 | ✓ |

**User's choice:** 全部 4 类变量源

---

## MockAdapter 行为

### Mock 图片样式

| Option | Description | Selected |
|--------|-------------|----------|
| 颜色块 + 文字标注 | 彩色矩形上用文字显示 prompt、provider、seed | ✓ |
| 随机几何图案 | 根据 seed 生成随机几何图形 | |
| 渐进复杂度 | 简单模式/调试模式分层 | |

**User's choice:** 颜色块 + 文字标注
**Notes:** 简单可靠，对调试友好

### Mock 使用模式

| Option | Description | Selected |
|--------|-------------|----------|
| 仅离线开发 | 无 API Key 时自动启用 | |
| 离线 + 演示模式 | 可手动选择 MockAdapter 演示完整流程 | ✓ |

**User's choice:** 离线 + 演示模式
**Notes:** MockAdapter 作为一等公民在 UI 中可选

---

## Claude's Discretion

| Area | Note |
|------|------|
| Provider config UI | 由 getConfigSchema() 自动生成 |
| 加密实现细节 | 可用 passphrase 派生或 app-level 固定密钥 |
| MockAdapter 渲染 | OffscreenCanvas 绘制 |
| providerConfig 表设计 | 新表或 projects 现有表扩展，由 planner 决定 |
| storeImage 回调签名 | 由调用方传入 vs 全局注册，planner 决定 |

## Deferred Ideas

- Visual prompt template editor — Phase 7
- User-customizable runtime templates — v0.2+
- More AI providers (Replicate, etc.) — v0.2+
- MockAdapter visual fidelity upgrade — future
- Team-shared API Keys — v0.2+
