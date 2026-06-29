---
created: 2026-06-29
tags:
  - AI无限创意画布
  - 技术决策
  - 架构决策记录
  - ADR
---

# AI无限创意画布 — 技术决策记录 (ADR)

> **目的**: 记录项目关键架构决策、选型理由、以及被否决方案的对比分析
> **格式**: Architecture Decision Record (ADR) 轻量化版

---

## ADR-001: 全栈 TypeScript 统一语言

### 状态
✅ **采纳**

### 背景
项目涉及前端画布渲染、节点编辑器、后端API、AI集成等多个技术领域，需要在不增加认知负荷的前提下保证代码质量。

### 决策
前端、后端、工具脚本全栈使用 TypeScript。

### 理由
| 因素 | 评估 |
|------|------|
| 🎯 **上下文切换成本** | 前后端统一语言，单人开发无需切换思维模式 |
| 🔒 **类型安全** | 节点引擎/AI参数映射等复杂逻辑，类型系统可捕获大量错误 |
| 🔄 **代码复用** | 类型定义(Prompt/Style/Params)前后端共享 |
| 🛠️ **工具链** | Vite+Vitest+Hono+Zod 全部原生TS支持 |
| 👥 **团队扩展** | 招聘React开发者即可，不需要前后端分离招聘 |

### 被否决方案
- **Python (FastAPI) + React**: 上下文切换成本高，类型定义需维护两套
- **Rust (Tauri) + React**: 学习曲线陡峭，MVP阶段过度设计
- **纯 JavaScript**: 缺乏类型安全，节点引擎复杂度高容易出runtime错误

---

## ADR-002: Excalidraw Fork 而非 NPM 封装

### 状态
✅ **采纳**

### 背景
需要深度定制画布能力：新增AI图片/视频元素、性能优化、自定义渲染逻辑。

### 决策
Fork Excalidraw 源码到 `packages/canvas/`，在源码层面进行二次开发。

### 理由
- Excalidraw 是纯开源项目 (MIT协议)，Fork无法律风险
- NPM包方案只能通过Plugin API扩展，能力受限（无法添加新元素类型）
- 需要修改核心渲染管线（分片渲染、视频元素）
- Fork后可自由优化打包体积，移除不必要的功能

### 修改范围控制
```
Excalidraw源码修改清单（"最小侵入"原则）:
  src/elements/       → 新增 AIElement, VideoElement 类型
  src/renderer/       → 优化渲染管线，分片渲染
  src/actions/        → 新增 AI相关操作
  src/data/           → 序列化支持新元素类型
  
  严禁修改:
  src/gestures/       → 手势系统不动
  src/align/          → 对齐系统不动
  src/scene/          → 场景管理尽量不动
```

---

## ADR-003: React Flow 作为节点编辑器底座

### 状态
✅ **采纳**

### 背景
需要实现Blender几何节点风格的可视化编辑系统，包括拖拽连线、参数面板、节点嵌套。

### 决策
使用 React Flow (xyflow) v12 作为节点编辑器基础框架。

### 理由
| 因素 | React Flow | 自研方案 | 备选(Diagram.js) |
|------|-----------|---------|-----------------|
| **拖拽连线** | 内置 + 自定义 | 3-4周开发 | 需自行实现 |
| **自定义节点** | React组件扩展 | — | 复杂API |
| **性能** | 虚拟化渲染 | 未知 | 好 |
| **生态** | 活跃(13k stars) | — | 较少 |
| **TypeScript** | 原生支持 | — | 需类型定义 |
| **学习成本** | 低(文档完善) | 高 | 中 |

### 关键注意事项
- React Flow 默认不适合 Blender 式样布局 → 需要自定义节点布局逻辑
- 节点执行引擎需要自研（React Flow只做UI，不做计算图引擎）
- 需要处理"节点组嵌套"的UI表现（React Flow支持子流程但有限制）

---

## ADR-004: Zustand + Immer 状态管理

### 状态
✅ **采纳**

### 背景
画布状态、节点图状态、AI队列状态需要高效管理，且需要支持撤销/重做。

### 决策
主状态管理使用 Zustand，不可变操作使用 Immer 中间件。

### 理由
- Zustand 体积最小 (1KB)，无 Provider 包裹
- Immer 中间件直接支持 mutable 写法而产出 immutable state
- 撤销/重做通过 Zustand 的 temporal middleware（或者自行实现 history store）
- 对比 Redux Toolkit: 更少样板代码，更直观

```typescript
// 状态结构示例
interface EditorStore {
  // 画布状态
  canvas: CanvasState
  
  // 节点图
  nodeGraph: NodeGraphState
  
  // AI队列
  aiQueue: AIQueueState
  
  // 历史(撤销/重做)
  history: HistoryState
}

const useEditorStore = create<EditorStore>()(
  immer((set) => ({
    // ...状态定义
  }))
)
```

### 被否决方案
- **Redux Toolkit**: 样板代码多，对单人项目过度设计
- **Jotai**: 原子化状态在复杂联动场景不如Zustand直观
- **MobX**: 可变状态不利于撤销/重做实现

---

## ADR-005: 适配器模式接入多AI模型

### 状态
✅ **采纳**

### 背景
需要接入多种AI模型（OpenAI/Stability/Replicate/Runway），且未来可能增加。

### 决策
使用适配器模式 (Adapter Pattern)，定义统一 `AIProvider` 接口，每个模型实现一个适配器。

```typescript
interface AIProvider {
  readonly name: string
  textToImage(params: TextToImageParams): Promise<GenerationResult>
  imageToImage(params: ImageToImageParams): Promise<GenerationResult>
  textToVideo(params: TextToVideoParams): Promise<GenerationResult>
  imageToVideo(params: ImageToVideoParams): Promise<GenerationResult>
  isAvailable(): boolean   // 检查配置是否有效
}
```

### 理由
- 新增模型只需新增适配器类，无需修改已有代码（开闭原则）
- 测试时可用MockAdapter替代真实API调用
- 用户可配置使用的模型，适配器自动路由

---

## ADR-006: SQLite (本地) + Cloudflare D1 (云端) 双模式数据库

### 状态
✅ **采纳**（MVP阶段仅SQLite）

### 背景
MVP定位单机/小团队使用，但需保留未来上云的能力。

### 决策
使用 Drizzle ORM，本地开发用 SQLite (better-sqlite3)，生产可选 Cloudflare D1。

### 理由
- Drizzle ORM 同时支持 SQLite 和 D1（D1 兼容 SQLite 语法）
- SQLite 零运维，适合单机版
- SQL + Drizzle 类型安全，比 Prisma 轻量
- 从 SQLite 迁移到 D1 只需改连接配置

### 数据库Schema核心表

```sql
-- 用户表
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 项目表
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  canvas_data TEXT,        -- 画布JSON序列化
  node_graph_data TEXT,    -- 节点图JSON序列化
  thumbnail_url TEXT,
  version INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- AI生成记录表
CREATE TABLE ai_generations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  node_id TEXT NOT NULL,        -- 哪个节点触发的
  provider TEXT NOT NULL,       -- 使用的AI模型
  type TEXT NOT NULL,           -- text-to-image / image-to-image 等
  params TEXT NOT NULL,         -- 传入参数(JSON)
  result_url TEXT,              -- 生成结果URL
  status TEXT NOT NULL,         -- pending / processing / done / failed
  error_message TEXT,
  tokens_used INTEGER,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

---

## ADR-007: Vite Monorepo (pnpm workspace) 项目结构

### 状态
✅ **采纳**

### 背景
项目包含多个独立包（canvas/node-editor/ai-core/shared）和两个应用（web/server），需要高效管理。

### 决策
使用 pnpm workspace monorepo 结构，Vite 作为 web 构建工具。

### 理由
| 因素 | pnpm workspace | npm workspaces | turbo repo |
|------|---------------|---------------|------------|
| **磁盘效率** | ✅ 硬链接复用 | ❌ 重复安装 | ✅ |
| **依赖隔离** | ✅ 严格 | ❌ 扁平化 | ✅ |
| **构建缓存** | 有 | 无 | ✅ (但增加复杂度) |
| **学习成本** | 低 | 低 | 中 |

Vite 选型理由：
- 开发HMR速度远超Webpack（ms级 vs s级）
- Rollup生产构建，Tree-shaking优秀
- 插件生态丰富
- Excalidraw 本身使用 Vite 构建

---

## ADR-008: 分片渲染 + LRU缓存 解决大画布性能

### 状态
✅ **采纳**

### 背景
无限画布可能承载数千个元素（图片、文字、图形），浏览器渲染压力大。

### 决策
- **分片渲染**: 仅渲染当前视口内的元素，视口外元素降采样为占位符
- **LRU缓存**: 图片资源使用LRU缓存，最大内存占用限制
- **Web Worker**: 序列化/计算在Worker线程执行

```typescript
class ChunkRenderer {
  private viewport: Viewport
  private chunks: Map<string, Chunk>
  private cache: LRUCache<string, ImageBitmap>
  
  // 获取当前视口可见元素
  getVisibleElements(allElements: CanvasElement[]): CanvasElement[] {
    return allElements.filter(el => 
      isIntersecting(el.bounds, this.viewport)
    )
  }
  
  // 将画布分为虚拟Chunk
  partitionIntoChunks(elements: CanvasElement[]): Chunk[] {
    // 每个Chunk大小: 2000x2000px
    // 仅加载当前视口附近 3x3 个Chunk
  }
}
```

---

## ADR-009: MVP阶段不做视频生成

### 状态
✅ **采纳**（P2优先级）

### 背景
项目计划书包含文生视频/图生视频功能，但视频AI API成本极高（Runway约$0.05/秒），且实现复杂度大。

### 决策
MVP版本仅实现文生图/图生图功能，视频生成推迟到v0.2。

### 时序安排
```
v0.1 (MVP)     → 文生图 + 图生图                  ← 📍 我们在这里
v0.2           → 文生视频 + 图生视频 (Runway/Luma)
v0.3           → 视频编辑节点 (裁剪/拼接/转场)
```

### 架构预留
虽然不做视频，但适配器接口已预留 `textToVideo` / `imageToVideo` 方法，后续增加只需实现新适配器。

---

## ADR-010: 后端最小化 — 仅做AI代理和文件存储

### 状态
✅ **采纳**

### 背景
理想情况下所有AI调用可直接从浏览器发起（前端有API key即可），但存在CORS和密钥安全问题。

### 决策
后端最小化设计：
- **AI Proxy**: 转发前端请求到AI API，隐藏API Key，添加速率限制
- **File Service**: 文件上传/下载/管理
- **Auth**: 基础JWT认证（可选，MVP可跳过）
- 所有"业务逻辑"放在前端

### 后端API清单（MVP）

```
POST   /api/v1/ai/generate     → AI生成入口
GET    /api/v1/ai/status/:id   → 生成状态查询
POST   /api/v1/files/upload    → 文件上传
GET    /api/v1/files/:id       → 文件下载
POST   /api/v1/auth/login      → 登录
POST   /api/v1/auth/register   → 注册
GET    /api/v1/projects        → 项目列表
POST   /api/v1/projects        → 创建项目
PUT    /api/v1/projects/:id    → 更新项目
DELETE /api/v1/projects/:id    → 删除项目
```

---

## 补充: 被否决整体架构方案

| 方案 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| **Electron桌面应用** | 本地文件系统、离线能力 | 打包体积大、更新分发复杂、MVP阶段过度 | ❌ v0.3考虑 |
| **Python + FastAPI** | AI生态好 | 前后端语言不一致、类型系统隔阂 | ❌ |
| **Tauri (Rust)** | 极致性能、体积小 | Rust学习成本、WebView兼容问题 | ❌ v1.0考虑 |
| **Next.js全栈** | SSR/SSG | 画布应用不需要SEO、Server Action增加复杂度 | ❌ |
| **Cloudflare Pages纯前端** | 零后端运维 | 限制多、AI代理需Worker | ⏳ 可选部署方案 |
| **Firebase/Supabase** | BaaS快速开发 | Vendor lock-in、成本不可控 | ❌ |

---

## 决策时间线

| 日期 | 决策 | 状态 |
|------|------|------|
| 2026-06-29 | ADR-001: 全栈TypeScript | ✅ 采纳 |
| 2026-06-29 | ADR-002: Excalidraw Fork | ✅ 采纳 |
| 2026-06-29 | ADR-003: React Flow | ✅ 采纳 |
| 2026-06-29 | ADR-004: Zustand+Immer | ✅ 采纳 |
| 2026-06-29 | ADR-005: AI适配器模式 | ✅ 采纳 |
| 2026-06-29 | ADR-006: SQLite+D1双模式 | ✅ 采纳 |
| 2026-06-29 | ADR-007: pnpm monorepo+Vite | ✅ 采纳 |
| 2026-06-29 | ADR-008: 分片渲染+LRU | ✅ 采纳 |
| 2026-06-29 | ADR-009: MVP不做视频 | ✅ 采纳 |
| 2026-06-29 | ADR-010: 后端最小化 | ✅ 采纳 |

---

*创建: 2026-06-29 | 作者: Claudian | 版本: v0.1*
