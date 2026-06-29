---
created: 2026-06-29
tags:
  - AI无限创意画布
  - GSD
  - 开发计划
  - 项目管理
---

# AI无限创意画布 — GSD 精确开发计划

> **方法论**: GSD (Get Shit Done) + CodeGraph + GStack 三剑合璧
> **相关洞见**: [[Claude_Memory/10番茄CodeGraph+GSD+GStack精确开发洞见-2026-06-27]]
> **文档**: [[示例文档/AI无限创意画布-项目架构文档]] | [[示例文档/AI无限创意画布-技术决策记录]]

---

## 一、项目初始化流程

### 1.1 创建 GitHub 仓库

```bash
# 在GitHub创建新仓库: ai-creative-canvas
# 然后本地初始化
mkdir ai-creative-canvas
cd ai-creative-canvas
git init
git remote add origin git@github.com:【用户名】/ai-creative-canvas.git
```

### 1.2 初始化 monorepo 结构

```bash
# 创建 pnpm workspace
pnpm init
pnpm add -g pnpm # 确保最新

# 创建目录结构
mkdir -p packages/{canvas,node-editor,ai-core,shared}/src
mkdir -p apps/{web/src,server/src}
mkdir -p tests/{e2e,integration}
mkdir -p scripts
mkdir -p .github/workflows
```

### 1.3 初始化 CodeGraph 索引

```bash
# 安装 CodeGraph
npm install -g @codegraph/codegraph

# 在项目根目录初始化索引
cd ai-creative-canvas
codegraph init
# 创建 .codegraph/ 索引后，Claude 可随时查询代码地图
```

### 1.4 创建 CLAUDE.md

```bash
# 在项目根目录创建 CLAUDE.md
# 内容包含: 项目描述、架构概览、技术栈、目录结构说明
```

### 1.5 GSD 初始化

```bash
# 初始化 GSD 工作流
/gsd:new-project
# 输入项目名称: AI无限创意画布
# GSD 会在 .gsd/ 目录生成项目配置文件
```

---

## 二、分阶段开发计划（6个Phase）

### Phase 0: 项目脚手架与环境搭建（3天）

**目标**: 跑通完整开发环境，验证技术选型

| 任务ID | 任务描述 | 工时 | 依赖 | CodeGraph关键路径 |
|--------|---------|------|------|-----------------|
| P0-01 | 初始化 pnpm monorepo 配置 | 0.5天 | — | — |
| P0-02 | 配置 TypeScript (tsconfig.base.json + 各包tsconfig) | 0.5天 | P0-01 | — |
| P0-03 | 搭建 Vite + React + TailwindCSS 前端骨架 | 1天 | P0-02 | — |
| P0-04 | 搭建 Hono 后端骨架 | 0.5天 | P0-02 | — |
| P0-05 | 配置 ESLint + Prettier | 0.5天 | P0-01 | — |
| P0-06 | Fork Excalidraw 并验证本地构建 | 1天 | P0-03 | `packages/canvas/` |
| P0-07 | React Flow 集成验证 | 0.5天 | P0-03 | `packages/node-editor/` |
| P0-08 | Drizzle + SQLite 配置 | 0.5天 | P0-04 | `apps/server/src/db/` |
| P0-09 | GitHub CI 配置 | 0.5天 | 全部 | `.github/workflows/ci.yml` |
| P0-10 | CodeGraph 索引构建 + 验证 | 0.25天 | 全部 | `codegraph status` |

**验收标准**: `pnpm dev` 启动前端页面（空白画布） + 后端健康检查ok

**GStack关卡**: `/plan-ceo-review` 审查项目结构合理性

---

### Phase 1: 核心无限画布（2周）

**目标**: 实现可用无限画布，支持AI图片元素和基础操作

| 任务ID | 任务描述 | 工时 | 依赖 | 关键文件 |
|--------|---------|------|------|---------|
| P1-01 | Excalidraw 核心代码分析（CodeGraph explore） | 0.5天 | P0-06 | `packages/canvas/src/` |
| P1-02 | AIElement 类型定义 + 渲染 | 1.5天 | P1-01 | `elements/AIElement.ts` |
| P1-03 | 图片元素加载/显示/缩放 | 1天 | P1-02 | `renderer/imageRenderer.ts` |
| P1-04 | 分片渲染性能优化 | 2天 | P1-03 | `renderer/chunkRenderer.ts` |
| P1-05 | LRU图片缓存 | 1天 | P1-03 | `renderer/imageCache.ts` |
| P1-06 | 元素分层/分组/锁定 | 1.5天 | P1-01 | `actions/layerManager.ts` |
| P1-07 | 画布序列化/反序列化 | 1天 | P1-02 | `data/serializer.ts` |
| P1-08 | IndexedDB项目保存/加载 | 1.5天 | P1-07 | `storage/projectStore.ts` |
| P1-09 | 撤销/重做系统 | 1天 | P1-06 | `actions/undoRedo.ts` |

**验收标准**: 可在无限画布上自由绘制、拖拽、缩放；可添加AI图片元素；项目可保存/加载

**里程碑**: ✅ **画布可用**

**GStack关卡**: `/plan-eng-review` + `/review` 代码审查

---

### Phase 2: 节点编辑器系统（2.5周）

**目标**: 实现完整的拖拽式节点编辑系统

| 任务ID | 任务描述 | 工时 | 依赖 | 关键文件 |
|--------|---------|------|------|---------|
| P2-01 | React Flow 集成 + 定制主题 | 0.5天 | P0-07 | `node-editor/src/index.ts` |
| P2-02 | 节点类型定义系统 | 1天 | P2-01 | `nodes/types.ts` |
| P2-03 | PromptNode 实现 | 0.5天 | P2-02 | `nodes/PromptNode.tsx` |
| P2-04 | TextToImageNode 实现 | 1天 | P2-02 | `nodes/AITextToImageNode.tsx` |
| P2-05 | ImageToImageNode 实现 | 1天 | P2-02 | `nodes/AIImageToImageNode.tsx` |
| P2-06 | StyleNode / SizeNode 参数节点 | 1天 | P2-02 | `nodes/StyleNode.tsx` |
| P2-07 | MergeNode 合并节点 | 1天 | P2-02 | `nodes/MergeNode.tsx` |
| P2-08 | PreviewNode 实时预览 | 1.5天 | P2-04 | `nodes/PreviewNode.tsx` |
| P2-09 | **🛠️ 节点执行引擎核心** | 3天 | P2-02 | `engine/NodeEngine.ts` |
| P2-10 | 拓扑排序 + 并行执行 | 1.5天 | P2-09 | `engine/NodeExecutor.ts` |
| P2-11 | 增量执行（Dirty标记） | 1.5天 | P2-10 | `engine/DirtyTracker.ts` |
| P2-12 | 参数面板（右侧详情面板） | 1.5天 | P2-08 | `controls/ParamPanel.tsx` |
| P2-13 | 参数到AI模型参数映射 | 1天 | P2-12 | `engine/ParamMapper.ts` |
| P2-14 | 节点图序列化/反序列化 | 1天 | P2-10 | `store/nodeStore.ts` |
| P2-15 | 节点撤销/重做 | 1天 | P2-14 | `store/historyStore.ts` |

**验收标准**: 可拖拽节点、连线、调节参数、执行生成、预览结果

**里程碑**: ✅ **节点引擎可用**

**GStack关卡**: `/plan-eng-review` + `/review` + `/qa`

---

### Phase 3: AI 集成层（1.5周）

**目标**: 接入真实AI模型，实现文生图和图生图功能

| 任务ID | 任务描述 | 工时 | 依赖 | 关键文件 |
|--------|---------|------|------|---------|
| P3-01 | AIProvider 统一接口定义 | 0.5天 | — | `ai-core/types.ts` |
| P3-02 | OpenAI DALL-E 3 适配器 | 1.5天 | P3-01 | `adapters/OpenAIAdapter.ts` |
| P3-03 | Stability.ai 适配器 | 1.5天 | P3-01 | `adapters/StabilityAdapter.ts` |
| P3-04 | Replicate 适配器 | 1天 | P3-01 | `adapters/ReplicateAdapter.ts` |
| P3-05 | MockAdapter（离线调试用） | 0.5天 | P3-01 | `adapters/MockAdapter.ts` |
| P3-06 | AI请求队列 | 1.5天 | P3-01 | `queue/AIQueue.ts` |
| P3-07 | 速率限制器 | 0.5天 | P3-06 | `queue/RateLimiter.ts` |
| P3-08 | Prompt Builder（提示词构建） | 1天 | — | `prompt/PromptBuilder.ts` |
| P3-09 | Prompt 模板系统 | 1天 | P3-08 | `prompt/templates.ts` |
| P3-10 | 生成进度推送 (SSE) | 1.5天 | P3-06 | `apps/server/src/routes/ai.ts` |
| P3-11 | 节点↔AI适配器对接 | 1天 | P3-02, P2-13 | `engine/AIBridge.ts` |

**验收标准**: 画布中拖拽文本→节点→AI生成→看到结果图片

**里程碑**: ✅ **AI生成可用**

**GStack关卡**: `/plan-eng-review` + `/review` + `/qa` + `/playwright-cli`（端到端测试）

---

### Phase 4: 后端服务与UI完善（1.5周）

**目标**: 完善配套功能，提升用户体验

| 任务ID | 任务描述 | 工时 | 依赖 | 关键文件 |
|--------|---------|------|------|---------|
| P4-01 | AI代理API开发 | 1天 | P3-06 | `server/src/routes/ai.ts` |
| P4-02 | 文件上传/下载服务 | 1天 | — | `server/src/routes/files.ts` |
| P4-03 | JWT认证系统 | 1天 | — | `server/src/middleware/auth.ts` |
| P4-04 | 项目管理API | 1天 | P4-03 | `server/src/routes/projects.ts` |
| P4-05 | 工具栏/侧边栏UI | 1.5天 | — | `web/src/components/Toolbar/` |
| P4-06 | 素材导入面板 | 1天 | P4-05 | `web/src/components/Sidebar/` |
| P4-07 | 导出功能 (PNG/JPG) | 1.5天 | P1-02 | `web/src/components/ExportDialog/` |
| P4-08 | 项目管理页面 | 1.5天 | P4-04 | `web/src/pages/ProjectPage.tsx` |
| P4-09 | 设置页面 (AI Key配置) | 1天 | — | `web/src/pages/SettingsPage.tsx` |
| P4-10 | 响应式布局适配 | 1天 | 全部 | `web/src/components/Layout/` |

**验收标准**: 完整的UI界面、项目管理、导出功能、AI配置

**里程碑**: ✅ **MVP功能完整**

**GStack关卡**: `/plan-eng-review` + `/review` + `/qa` + `/cso`（安全审计）

---

### Phase 5: 测试与质量打磨（1周）

**目标**: 核心功能测试通过，修复主要Bug

| 任务ID | 任务描述 | 工时 | 依赖 |
|--------|---------|------|------|
| P5-01 | 节点引擎单元测试 | 1.5天 | P2-10 |
| P5-02 | AI适配器Mock测试 | 1天 | P3-05 |
| P5-03 | 画布序列化/反序列化测试 | 0.5天 | P1-07 |
| P5-04 | 画布大元素压力测试 | 1天 | P1-04 |
| P5-05 | 节点编辑器集成测试 | 1天 | P2-14 |
| P5-06 | E2E: 创建项目→拖拽节点→AI生成→导出 | 1天 | Phase4 |
| P5-07 | E2E: 项目保存→刷新→加载→继续编辑 | 0.5天 | P1-08 |
| P5-08 | 性能优化 (内存/渲染/执行) | 1天 | Phase1-3 |
| P5-09 | Bug修复回合 | 1天 | 全部 |

**验收标准**: 测试覆盖率 > 70%, 核心流程E2E通过

**里程碑**: ✅ **MVP发布候选**

**GStack关卡**: `/qa` + `/benchmark` + `/retro`

---

### Phase 6: 文档与发布准备（3天）

**目标**: 项目文档完善，准备第一次发布

| 任务ID | 任务描述 | 工时 | 依赖 |
|--------|---------|------|------|
| P6-01 | README.md 完善 | 0.5天 | Phase5 |
| P6-02 | 本地部署文档 | 0.5天 | Phase5 |
| P6-03 | API文档 (自动生成) | 0.5天 | Phase4 |
| P6-04 | 用户快速入门指南 | 1天 | Phase5 |
| P6-05 | 发布 v0.1.0-alpha | 0.5天 | Phase5 |
| P6-06 | 项目复盘 + RETRO.md | 0.5天 | 全部 |

**验收标准**: GitHub Release v0.1.0-alpha，文档完整

**里程碑**: 🚀 **v0.1.0-alpha 发布**

**GStack关卡**: `/ship` + `/retro`

---

## 三、开发节奏规划

### 3.1 建议每日工作流

```
早上 (CodeGraph + Plan):
  ① codegraph explore "<今日要修改的模块>"  →  理解当前代码状态
  ② GSD plan-phase 或 /gsd:quick  →  规划今日任务

白天 (Execute):
  ③ 按GSD任务列表逐项执行
  ④ 每个任务完成后 /gsd:progress 更新状态

晚上 (Verify + Commit):
  ⑤ GStack review  →  代码审查
  ⑥ GStack qa  →  质量检测
  ⑦ git commit -m "feat: ..."  →  原子提交
  ⑧ 更新MEMORY.md项目进度
```

### 3.2 专注时间估算

| Phase | 估时 | 每日专注(h) | 日历天 |
|-------|------|------------|--------|
| P0: 脚手架 | 3天 | 4-6h | 2-3天 |
| P1: 核心画布 | 11天 | 4-6h | 9-14天 |
| P2: 节点编辑器 | 18天 | 4-6h | 14-18天 |
| P3: AI集成 | 11天 | 4-6h | 9-14天 |
| P4: 后端+UI | 12天 | 4-6h | 10-14天 |
| P5: 测试 | 7天 | 4-6h | 6-7天 |
| P6: 发布 | 3天 | 4-6h | 3天 |
| **总计** | **65天** | **4-6h** | **~8周** |

### 3.3 番茄钟建议

```
每个开发日 = 4-6个番茄钟（每个番茄钟25min工作+5min休息）

推荐节奏:
  🍅 1: CodeGraph代码理解 + GSD任务规划
  🍅 2: 核心编码（最难的先做）
  🍅 3: 核心编码继续
  🍅 4: 测试 + 代码审查
  🍅 5: Bug修复 + 提交
  🍅 6: 文档 + 进度更新
```

---

## 四、GStack 质量关卡矩阵

| Phase | CEO审查 | 架构审查 | 代码审查 | QA | 安全审计 | E2E测试 |
|-------|---------|---------|---------|------|---------|--------|
| P0: 脚手架 | ✅ | ✅ | — | — | — | — |
| P1: 核心画布 | — | ✅ | ✅ | — | — | — |
| P2: 节点编辑器 | — | ✅ | ✅ | ✅ | — | — |
| P3: AI集成 | — | ✅ | ✅ | ✅ | — | ✅ |
| P4: 后端+UI | — | ✅ | ✅ | ✅ | ✅ | — |
| P5: 测试 | — | — | — | ✅ | — | ✅ |
| P6: 发布 | ✅ | — | — | — | ✅ | ✅ |

**关卡命令速查**:
```bash
/plan-ceo-review     # CEO评审 — 项目方向/商业模式
/plan-eng-review     # 架构评审 — 技术方案合理性
/review              # 代码审查 — 代码质量
/qa                  # 质量检测 — 功能完整性
/cso                 # 安全审计 — 安全漏洞
/playwright-cli      # E2E测试 — 用户流程
/ship                # 发布关卡 — 上线准备
```

---

## 五、Git 提交规范

### 5.1 分支命名

```
feature/canvas-ai-element       # 新功能
fix/node-engine-crash           # Bug修复
refactor/node-executor          # 重构
docs/architecture-update        # 文档
chore/deps-update               # 杂项
experiment/webgpu-accel         # 实验性
```

### 5.2 Commit Message 格式

```
<type>(<scope>): <描述>

# type: feat / fix / refactor / docs / chore / test / perf
# scope: canvas / node-editor / ai-core / server / web / shared

示例:
  feat(canvas): add AIElement type and rendering
  fix(node-editor): fix topological sort circular dependency
  refactor(ai-core): extract common adapter logic
  docs: add architecture decision records
  test(node-editor): add engine unit tests
```

---

## 六、常用 GSD 命令速查

```bash
# 项目级
/gsd:new-project           # 新建项目
/gsd:explore               # 了解当前项目结构

# 阶段规划
/gsd:plan-phase            # 规划新的开发阶段
/gsd:discuss-phase         # 讨论阶段细节
/gsd:list-phase-assumptions # 列出阶段假设

# 执行
/gsd:execute-phase         # 自动驾驶执行阶段
/gsd:quick                 # 快速模式（小任务）
/gsd:resume-work           # 恢复被打断的工作

# 质量
/gsd:verify-work           # 验证当前工作
/gsd:check-todos           # 查看待办

# 完成
/gsd:complete-milestone    # 完成里程碑
/gsd:session-report        # 生成会话报告

# 代码地图（必须先装CodeGraph）
codegraph explore "<模块名>"   # 理解代码
codegraph status              # 查看代码库状态
```

---

## 七、CLAUDE.md 项目配置模板

项目根目录创建 `CLAUDE.md`:

```markdown
# AI无限创意画布 — Claude开发指南

## 项目概述
基于Excalidraw无限画布 + Blender式节点编辑 + 全品类AI生成的一站式创意设计平台。

## 技术栈
- 前端: React 18 + TypeScript + Vite + TailwindCSS
- 画布: Excalidraw (fork) / React Flow / Zustand
- 后端: Hono + Drizzle ORM + SQLite
- AI: OpenAI / Stability / Replicate (适配器模式)

## 项目结构
apps/web/          — Web应用
apps/server/       — 后端服务
packages/canvas/   — 魔改Excalidraw
packages/node-editor/ — 节点编辑器
packages/ai-core/  — AI集成核心
packages/shared/   — 共享类型/工具

## 开发命令
pnpm dev           — 启动开发环境
pnpm build         — 构建
pnpm test          — 运行测试
pnpm lint          — 代码检查

## CodeGraph
codegraph explore "关键词"     — 查找和理解代码
codegraph explore --impact "修改范围" — 了解修改影响

## 开发原则
1. 先CodeGraph理解代码，再动手修改
2. 每个功能拆分到最小原子任务
3. 每个任务完成后/gsd:progress更新进度
4. 每个阶段完成跑GStack质量关卡

## 提交规范
feat/ fix/ refactor/ docs/ chore/ test/
格式: <type>(<scope>): <描述>
```

---

## 八、风险应对与回退计划

| 风险场景 | 征兆 | 应对措施 |
|---------|------|---------|
| Excalidraw魔改破坏了核心功能 | Canvas渲染异常 | git stash回退，改用Overlay模式 |
| React Flow性能不足 | 节点超过50个卡顿 | 切换到Canvas渲染模式 |
| AI API费用超预期 | 测试月度账单过高 | 全面使用MockAdapter + 缓存 |
| 节点引擎复杂度失控 | Phase 2超期2周 | 先实现线性执行(无并行)，剪掉增量执行 |
| 开发热情下降/拖延 | 连续3天无进展 | 降低到每天1番茄钟，保持连贯性 |

---

## 九、MVP 质量门定义

| 门禁 | 标准 | 检测方式 |
|------|------|---------|
| **功能完整** | P0功能全部实现 | E2E测试通过 |
| **无崩溃** | 无C级别bug | 手动测试 + 压力测试 |
| **项目持久化** | 保存→刷新→加载完整 | E2E测试 |
| **AI生成** | 至少一个适配器可用 | 集成测试(Mock) |
| **画布流畅** | 500+元素不卡顿 | 性能测试 |
| **代码质量** | 无严重lint错误 | ESLint + GStack review |
| **文档完整** | README + 部署文档 + CLAUDE.md | 人工检查 |

---

*创建: 2026-06-29 | 作者: Claudian | 版本: v0.1*
