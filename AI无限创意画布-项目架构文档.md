---
created: 2026-06-29
tags:
  - AI无限创意画布
  - 项目架构
  - 技术设计
  - 落地文档
---

# AI无限创意画布 — 项目架构文档

> **版本**: v0.1 (MVP单机/小团队版)
> **定位**: 基于Excalidraw轻量化无限画布、融合Blender几何节点程序化编辑逻辑、集成全品类AI生成能力的一站式创意设计平台
> **项目计划书**: [[示例文档/AI无限创意画布项目计划书]]

---

## 一、系统架构全景

```
┌──────────────────────────────────────────────────────────────────┐
│                    FRONTEND (SPA — 浏览器/GUI)                    │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │  Excalidraw      │  │  React Flow      │  │  UI Layer     │  │
│  │  无限画布(魔改)   │  │  节点编辑器       │  │  (Tailwind)   │  │
│  │  • 手绘风渲染     │  │  • 拖拽连线      │  │  • 工具栏     │  │
│  │  • 无限延展       │  │  • 参数面板      │  │  • 素材面板   │  │
│  │  • 分片加载       │  │  • 实时预览      │  │  • 导出面板   │  │
│  │  • 多元素管理     │  │  • 节点组嵌套    │  │  • 设置面板   │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬───────┘  │
│           │                     │                      │          │
│  ┌────────▼─────────────────────▼──────────────────────▼───────┐  │
│  │                    STATE LAYER (Zustand)                      │  │
│  │   CanvasStore │ NodeGraphStore │ AIQueueStore │ HistoryStore  │  │
│  │   ProjectStore │ UIPreferences │ ExportStore                  │  │
│  └────────────────────────────┬─────────────────────────────────┘  │
│                               │                                    │
│  ┌────────────────────────────▼─────────────────────────────────┐  │
│  │              STORAGE / API LAYER                              │  │
│  │                                                               │  │
│  │  ┌─────────────────┐  ┌─────────────┐  ┌─────────────────┐   │  │
│  │  │ IndexedDB       │  │ File API    │  │ HTTP Client     │   │  │
│  │  │ (Dexie.js)      │  │ (本地文件)   │  │ (fetch/ky)      │   │  │
│  │  │ • 项目数据      │  │ • 导入素材   │  │ • AI API代理    │   │  │
│  │  │ • 用户设置      │  │ • 导出成品   │  │ • 云端存储      │   │  │
│  │  │ • 缓存          │  │ • 资源管理   │  │ • 模板同步      │   │  │
│  │  └─────────────────┘  └─────────────┘  └────────┬────────┘   │  │
│  └──────────────────────────────────────────────────┼────────────┘  │
└─────────────────────────────────────────────────────┼──────────────┘
                                                      │ HTTP/WS
┌─────────────────────────────────────────────────────▼──────────────┐
│                    BACKEND (Node.js / Hono)                         │
│                                                                     │
│  ┌──────────────────┐  ┌────────────────┐  ┌──────────────────┐   │
│  │  AI Gateway      │  │  User Service  │  │  File Service    │   │
│  │  • API路由       │  │  • 认证授权    │  │  • 上传/下载     │   │
│  │  • 模型适配器    │  │  • 项目管理    │  │  • 媒体处理      │   │
│  │  • 请求队列      │  │  • 配额管理    │  │  • CDN分发       │   │
│  │  • 结果回调      │  │  • 订阅管理    │  │                  │   │
│  └────────┬─────────┘  └───────┬────────┘  └──────────────────┘   │
│           │                     │                                   │
│  ┌────────▼─────────────────────▼────────────────────────────────┐  │
│  │              DATA LAYER (Drizzle ORM)                          │  │
│  │  ┌──────────────────────┐  ┌──────────────────────────────┐   │  │
│  │  │  SQLite (本地开发)   │  │  Cloudflare D1 (生产)        │   │  │
│  │  │  • 用户表            │  │  • 项目表                      │   │  │
│  │  │  • 项目元数据        │  │  • AI生成记录                  │   │  │
│  │  │  • AI配置            │  │  • 模板数据                    │   │  │
│  │  │  • 使用量统计        │  │  • 素材元数据                  │   │  │
│  │  └──────────────────────┘  └──────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 二、技术栈详细清单

### 2.1 前端技术栈

| 层级 | 技术选型 | 版本 | 选型理由 |
|------|---------|------|---------|
| **语言** | TypeScript | 5.x | 类型安全、全栈统一 |
| **框架** | React | 18.x | 组件生态成熟、Excalidraw原生支持 |
| **构建** | Vite | 5.x | 极速HMR、Esm原生、插件丰富 |
| **画布** | Excalidraw (fork) | latest | 轻量无限画布、手绘风、开源可定制 |
| **节点编辑** | React Flow (xyflow) | 12.x | 业界最成熟的React节点编辑器 |
| **样式** | TailwindCSS | 3.x | 原子化CSS、设计一致性好 |
| **UI组件** | Radix UI + shadcn/ui | latest | 无障碍、可定制、美观 |
| **状态管理** | Zustand | 4.x | 轻量、TS支持好、非不可变但有Immer中间件 |
| **不可变** | Immer | 10.x | 配合Zustand做撤销/重做 |
| **存储** | Dexie.js (IndexedDB) | 3.x | 浏览器端结构化存储、支持索引查询 |
| **HTTP** | ky | 1.x | 轻量fetch封装、支持拦截器 |
| **实时通信** | WebSocket (原生) | — | AI生成进度推送 |
| **图标** | Lucide React | latest | 轻量、Tree-shakable |
| **测试** | Vitest + Testing Library | latest | 与Vite原生集成 |
| **E2E测试** | Playwright | latest | 跨浏览器测试 |
| **包管理** | pnpm | 9.x | 速度快、磁盘效率高 |

### 2.2 后端技术栈

| 层级 | 技术选型 | 版本 | 选型理由 |
|------|---------|------|---------|
| **运行时** | Node.js | 20 LTS | 稳定、生态成熟 |
| **框架** | Hono | 4.x | 轻量、快速、支持多运行时(Node/Cloudflare Workers) |
| **ORM** | Drizzle ORM | latest | TypeScript原生、零运行时、轻量 |
| **数据库** | SQLite (better-sqlite3) | latest | 零运维、适合单机版 |
| **云数据库** | Cloudflare D1 | — | 无服务器、全球分布式 |
| **对象存储** | Cloudflare R2 | — | S3兼容、无出站费 |
| **认证** | JWT (hono/jwt) | — | 轻量自包含认证 |
| **验证** | Zod | 3.x | 运行时类型验证 |
| **测试** | Vitest | latest | 与前端统一测试工具 |
| **API格式** | RESTful + SSE | — | 简单可靠 |

### 2.3 AI技术栈

| 能力 | 接入模型/平台 | 接口协议 | 备注 |
|------|-------------|---------|------|
| **文生图** | OpenAI DALL-E 3 / Stability.ai / Replicate | REST API | 多模型适配器 |
| **图生图** | Stability.ai img2img / Replicate | REST API | 风格迁移+重绘 |
| **文生视频** | Runway Gen-3 / Pika / Luma Dream Machine | REST API | 逐步增加模型 |
| **图生视频** | Runway / Pika / Luma | REST API | 静态→动态转换 |
| **本地AI(可选)** | Ollama (ComfyUI) | REST API | 离线生成方案 |
| **回退策略** | 队列+超时+重试 | — | 保证生成可靠性 |

---

## 三、项目目录结构

```
ai-creative-canvas/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # CI流程
│       └── deploy.yml             # 部署流程
│
├── packages/
│   ├── canvas/                    # 📦 Excalidraw魔改包
│   │   ├── src/
│   │   │   ├── elements/          # 自定义元素类型
│   │   │   │   ├── AIElement.ts   # AI生成图片元素
│   │   │   │   ├── VideoElement.ts # 视频元素
│   │   │   │   └── NodeGroup.ts   # 节点组元素
│   │   │   ├── renderer/          # 渲染引擎优化
│   │   │   │   ├── chunkRenderer.ts  # 分片渲染
│   │   │   │   └── lazyLoader.ts     # 按需加载
│   │   │   ├── actions/           # 拓展操作
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── node-editor/               # 📦 节点编辑器
│   │   ├── src/
│   │   │   ├── nodes/             # 自定义节点类型
│   │   │   │   ├── AITextToImageNode.tsx
│   │   │   │   ├── AIImageToImageNode.tsx
│   │   │   │   ├── AITextToVideoNode.tsx
│   │   │   │   ├── AIImageToVideoNode.tsx
│   │   │   │   ├── PromptNode.tsx
│   │   │   │   ├── StyleNode.tsx
│   │   │   │   ├── MergeNode.tsx
│   │   │   │   ├── OutputNode.tsx
│   │   │   │   └── PreviewNode.tsx
│   │   │   ├── controls/          # 参数控件
│   │   │   │   ├── SliderControl.tsx
│   │   │   │   ├── SelectControl.tsx
│   │   │   │   ├── PromptInput.tsx
│   │   │   │   └── ColorPicker.tsx
│   │   │   ├── engine/            # 节点引擎核心
│   │   │   │   ├── NodeEngine.ts    # 引擎主类
│   │   │   │   ├── NodeExecutor.ts  # 执行器
│   │   │   │   ├── ParamMapper.ts   # 参数映射
│   │   │   │   └── Validator.ts     # 节点验证
│   │   │   ├── store/
│   │   │   │   └── nodeStore.ts   # 节点状态
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── ai-core/                   # 📦 AI核心层
│   │   ├── src/
│   │   │   ├── adapters/          # AI模型适配器
│   │   │   │   ├── types.ts        # 统一接口定义
│   │   │   │   ├── OpenAIAdapter.ts
│   │   │   │   ├── StabilityAdapter.ts
│   │   │   │   ├── ReplicateAdapter.ts
│   │   │   │   ├── RunwayAdapter.ts
│   │   │   │   └── OllamaAdapter.ts
│   │   │   ├── queue/             # 请求队列
│   │   │   │   ├── AIQueue.ts
│   │   │   │   └── RateLimiter.ts
│   │   │   ├── prompt/            # Prompt工程
│   │   │   │   ├── PromptBuilder.ts
│   │   │   │   └── templates.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── shared/                    # 📦 共享类型与工具
│       ├── src/
│       │   ├── types/             # 共享类型定义
│       │   │   ├── project.ts
│       │   │   ├── canvas.ts
│       │   │   ├── node.ts
│       │   │   └── ai.ts
│       │   └── utils/
│       │       ├── idGen.ts
│       │       ├── debounce.ts
│       │       └── color.ts
│       └── package.json
│
├── apps/
│   ├── web/                       # 🚀 Web应用主入口
│   │   ├── src/
│   │   │   ├── components/        # 页面组件
│   │   │   │   ├── Layout/
│   │   │   │   ├── Toolbar/
│   │   │   │   ├── Sidebar/
│   │   │   │   └── ExportDialog/
│   │   │   ├── pages/
│   │   │   │   ├── EditorPage.tsx  # 主编辑页面
│   │   │   │   ├── ProjectPage.tsx # 项目管理
│   │   │   │   └── SettingsPage.tsx
│   │   │   ├── hooks/             # 自定义hooks
│   │   │   ├── stores/            # Zustand stores
│   │   │   ├── styles/
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── server/                    # 🖥️ 后端服务
│       ├── src/
│       │   ├── routes/
│       │   │   ├── ai.ts          # AI生成路由
│       │   │   ├── projects.ts    # 项目CRUD
│       │   │   ├── auth.ts        # 认证路由
│       │   │   └── files.ts       # 文件上传
│       │   ├── services/
│       │   │   ├── aiService.ts
│       │   │   └── fileService.ts
│       │   ├── middleware/
│       │   │   ├── auth.ts
│       │   │   └── rateLimit.ts
│       │   ├── db/
│       │   │   ├── schema.ts      # Drizzle schema
│       │   │   └── index.ts
│       │   └── index.ts           # 入口
│       ├── tsconfig.json
│       ├── wrangler.toml          # Cloudflare配置
│       └── package.json
│
├── tests/
│   ├── e2e/                       # E2E测试
│   │   ├── canvas.spec.ts
│   │   └── ai-generation.spec.ts
│   └── integration/               # 集成测试
│
├── scripts/                       # 开发脚本
│   ├── dev.sh                     # 本地启动
│   └── seed.ts                    # 数据种子
│
├── package.json                   # 根package (workspace)
├── pnpm-workspace.yaml
├── tsconfig.base.json             # 共享TS配置
├── .env.example                   # 环境变量模板
├── CLAUDE.md                      # Claude行为指南
└── README.md                      # 项目说明
```

---

## 四、核心模块设计

### 4.1 无限画布模块 (canvas)

**职责**: 提供无限延展、轻量流畅的创作画布，承载所有创作元素

**关键功能**:
- 无限缩放/平移（继承Excalidraw）
- 自定义AI元素渲染（图片、视频、节点组）
- 分片渲染 + 按需加载（性能优化）
- 元素分层/分组/锁定/隐藏
- 画布状态序列化/反序列化

**设计决策**:
- 基于Excalidraw源码二次开发，而非npm包封装
- 核心改动: 新增AI元素类型、性能优化、视频元素支持
- 渲染优化: Canvas分片（Viewport外的不渲染）、虚拟化列表

```typescript
// 核心接口示例
interface AICanvas {
  // 画布操作
  zoomTo(factor: number, center: Point): void
  panTo(position: Point): void
  
  // 元素管理
  addElement(type: 'ai-image' | 'ai-video' | 'node-group', props: ElementProps): void
  removeElement(id: string): void
  updateElement(id: string, props: Partial<ElementProps>): void
  
  // 序列化
  toJSON(): CanvasData
  fromJSON(data: CanvasData): void
  
  // 性能
  getVisibleElements(viewport: Viewport): CanvasElement[]
  optimizeChunks(): void
}
```

### 4.2 节点编辑器模块 (node-editor)

**职责**: 提供Blender几何节点风格的可视化程序化编辑系统

**节点类型一览**:

| 节点类别 | 节点名称 | 功能 | 输入 | 输出 |
|---------|---------|------|------|------|
| **输入** | PromptNode | 文本提示词输入 | text | prompt |
| **输入** | ImageInputNode | 图片素材输入 | file | image |
| **AI生成** | TextToImage | 文生图 | prompt, style, size | image |
| **AI生成** | ImageToImage | 图生图 | image, style, params | image |
| **AI生成** | TextToVideo | 文生视频 | prompt, params | video |
| **AI生成** | ImageToVideo | 图生视频 | image, prompt, params | video |
| **参数** | StyleNode | 风格参数设置 | params | style-config |
| **参数** | SizeNode | 尺寸参数 | params | size-config |
| **处理** | MergeNode | 多元素合并 | images/videos | composition |
| **处理** | FilterNode | 滤镜/效果 | image, filter | image |
| **输出** | PreviewNode | 实时预览 | any | preview |
| **输出** | ExportNode | 最终导出 | any | file |

**节点引擎核心逻辑**:

```typescript
// 节点执行引擎的核心抽象
abstract class BaseNode {
  id: string
  type: string
  inputs: Map<string, Socket>
  outputs: Map<string, Socket>
  params: Record<string, ParamValue>
  
  abstract execute(context: ExecutionContext): Promise<ExecutionResult>
  abstract validate(): ValidationResult
}

// 引擎主循环
class NodeEngine {
  async executeGraph(graph: NodeGraph): Promise<ExecutionResult> {
    // 1. Topological Sort (拓扑排序)
    const sorted = this.topologicalSort(graph)
    
    // 2. 分级执行（同级别并行）
    const levels = this.partitionIntoLevels(sorted)
    
    for (const level of levels) {
      // 同层级节点并行执行
      const results = await Promise.all(
        level.map(node => this.executeNode(node, graph))
      )
      
      // 3. 传播结果到下一级
      this.propagateResults(level, results, graph)
    }
    
    return this.collectOutputs(graph)
  }
}
```

### 4.3 AI核心模块 (ai-core)

**职责**: 统一管理多模型AI生成能力，提供稳定可靠的生成服务

**适配器模式设计**:

```typescript
// 统一AI服务接口
interface AIProvider {
  textToImage(params: TextToImageParams): Promise<GenerationResult>
  imageToImage(params: ImageToImageParams): Promise<GenerationResult>
  textToVideo(params: TextToVideoParams): Promise<GenerationResult>
  imageToVideo(params: ImageToVideoParams): Promise<GenerationResult>
}

// 适配器示例
class OpenAIAdapter implements AIProvider {
  async textToImage(params: TextToImageParams): Promise<GenerationResult> {
    const response = await this.client.images.generate({
      model: 'dall-e-3',
      prompt: params.prompt,
      size: params.size,
      n: 1,
    })
    return { url: response.data[0].url, format: 'png' }
  }
}

class StabilityAdapter implements AIProvider {
  async textToImage(params: TextToImageParams): Promise<GenerationResult> {
    // Stability.ai特有API调用
    const response = await this.client.generate({
      prompt: params.prompt,
      style: params.style,
    })
    return { data: response.image, format: 'png' }
  }
}
```

**请求队列系统**:

```
用户操作 → AI节点触发 → 参数映射 → 入队(Queue)
                                        ↓
                                   RateLimiter检查
                                        ↓
                                   AI Adapter调用
                                        ↓
                              ┌─ 成功 → 结果回传 → 画布更新
                              │
                              └─ 失败 → 重试(3次) → 错误提示
```

---

## 五、核心数据流

### 5.1 AI生成流程（完整链路）

```
用户操作流:
  ① 用户拖拽 TextToImage 节点到画布
  ② 连接 PromptNode → TextToImage → PreviewNode
  ③ 在 PromptNode 输入 "一只赛博朋克风格的猫"
  ④ 在 TextToImage 调节参数 (风格=赛博朋克, 尺寸=1024x1024)
  ⑤ 点击"执行"或自动触发

系统处理流:
  ⑥ Zustand Store 更新节点状态
  ⑦ NodeEngine 拓扑排序 → 确定执行顺序
  ⑧ PromptNode 返回提示词文本
  ⑨ TextToImage 节点 → AI Core → OpenAIAdapter
  ⑩ 请求入队 → RateLimiter检查 → 发送API请求
  ⑪ WebSocket推送进度(排队中→生成中→完成)
  ⑫ 结果返回 → 渲染到PreviewNode
  ⑬ 用户可选择"应用到画布" → 图片嵌入Excalidraw画布
```

### 5.2 节点联动更新流

```
参数修改 → NodeEngine.dirty标记 → 上游节点
                                   ↓
                          重建执行路径
                                   ↓
                       仅执行脏路径上的节点
                                   ↓
                         Propagate到下游
                                   ↓
                          实时预览更新
```

---

## 六、性能优化策略

### 6.1 画布性能

| 策略 | 实现方式 | 预期效果 |
|------|---------|---------|
| **分片渲染** | 仅渲染视口内元素 | 10万+元素不卡顿 |
| **虚拟化** | 非视口元素降采样 | 平滑缩放平移 |
| **Web Worker** | 序列化/计算在Worker | UI不阻塞 |
| **图片懒加载** | 按需加载+LRU缓存 | 减少内存占用 |
| **Canvas2D优化** | 离屏Canvas+合成 | 渲染帧率提升 |

### 6.2 节点引擎性能

| 策略 | 实现方式 |
|------|---------|
| **增量执行** | 仅执行变更路径上的节点 |
| **并行执行** | 同层级节点Promise.all |
| **缓存结果** | 节点输出缓存，输入未变则跳过 |
| **节流预览** | 高频变更时debounce预览更新 |

---

## 七、开发环境与工具链

### 7.1 开发工具

| 工具 | 用途 | 配置说明 |
|------|------|---------|
| **VSCode** | IDE | 推荐插件: ES7+ React/Redux/React-Native/JS snippets, Tailwind CSS IntelliSense, Prettier |
| **Claude Code** | AI编程助手 | 通过CLAUDE.md配置项目上下文 |
| **CodeGraph** | 代码地图 | `.codegraph/` 索引整个项目 |
| **GSD (Get Shit Done)** | 任务管理 | 原子化任务拆分 + 波浪式执行 |
| **GStack** | 质量关 | CEO评审 → 架构评审 → 代码审查 → QA → 安全审计 |
| **GitHub** | 版本控制 | main/dev/feature分支策略 |

### 7.2 开发工作流

```
日常开发循环:

[新功能/修Bug]
     │
     ▼
① CodeGraph explore → 理解现有代码
     │
     ▼
② GSD plan-phase → 规划执行方案
     │
     ▼
③ GSD execute-phase → 自动驾驶执行
     │
     ▼
④ GStack review → 代码审查
     │
     ▼
⑤ GStack qa → 质量检测
     │
     ▼
⑥ 通过? ──是──→ git commit → push
     │
     否
     │
     ▼
  返回③ 修复
```

### 7.3 分支策略

```
main        ── 稳定发布版
  │
dev         ── 开发主分支
  │
feature/*   ── 功能分支 (feature/canvas-ai-elements)
fix/*       ── 修复分支 (fix/video-render-bug)
experiment/ ── 实验分支 (experiment/webgpu-accel)
```

---

## 八、MVP版本范围定义

### v0.1 MVP 核心功能清单

| 模块 | 功能 | 优先级 | 预估工时 |
|------|------|--------|---------|
| **画布** | 基础无限画布（继承Excalidraw） | P0 | 1周 |
| **画布** | AI图片元素渲染 | P0 | 3天 |
| **画布** | 元素分层/分组/拖拽 | P0 | 2天 |
| **画布** | 项目保存/加载 (IndexedDB) | P0 | 2天 |
| **节点** | 节点编辑器基础框架 (React Flow) | P0 | 1周 |
| **节点** | PromptNode + TextToImageNode | P0 | 3天 |
| **节点** | StyleNode + MergeNode | P1 | 2天 |
| **节点** | 节点执行引擎 (拓扑排序+并行执行) | P0 | 1周 |
| **节点** | 实时预览节点 | P1 | 2天 |
| **AI** | OpenAI DALL-E 3 适配器 | P0 | 2天 |
| **AI** | Stability.ai 适配器 | P1 | 2天 |
| **AI** | 请求队列+速率限制 | P0 | 3天 |
| **AI** | 生成进度推送 (SSE/WS) | P1 | 2天 |
| **UI** | 工具栏/侧边栏 | P0 | 3天 |
| **UI** | 导出面板 (PNG/JPG) | P1 | 2天 |
| **UI** | 项目管理页面 | P1 | 3天 |
| **后端** | AI代理API | P0 | 3天 |
| **后端** | 基础认证 | P1 | 2天 |
| **后端** | 文件上传服务 | P1 | 2天 |

### MVP排除项（后续版本）

- ❌ 云端协作
- ❌ 移动端适配
- ❌ 模板广场
- ❌ AI文生视频/图生视频（需更高预算）
- ❌ 3D节点创作
- ❌ Electron桌面应用
- ❌ 离线AI模型（Ollama）

---

## 九、风险与技术挑战

| 风险 | 影响 | 应对方案 |
|------|------|---------|
| Excalidraw魔改难度大 | 开发周期延长 | 先做最小修改，用Overlay方案替代侵入式修改 |
| AI API成本高 | 开发测试受限 | 使用Mock适配器 + 缓存响应 |
| 节点引擎复杂度高 | 开发阻塞 | 先实现线性执行，再优化并行 |
| 浏览器内存限制 | 大画布崩溃 | 分片渲染 + 图片压缩 + LRU缓存 |
| 视频生成API昂贵 | 功能受限 | MVP先不做视频，聚焦图文 |

---

## 十、相关文档

- [[示例文档/AI无限创意画布项目计划书]] — 原始项目计划
- [[示例文档/AI无限创意画布-技术决策记录]] — 技术选型决策详情
- [[示例文档/AI无限创意画布-GSD开发计划]] — 分阶段开发计划
- [[示例文档/AI无限创意画布-项目架构文档]] — 本文档

---

*创建: 2026-06-29 | 作者: Claudian | 版本: v0.1*
