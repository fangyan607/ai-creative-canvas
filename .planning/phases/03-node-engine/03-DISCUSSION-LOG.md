# Phase 3: Node Engine — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-30
**Phase:** 03-node-engine
**Areas discussed:** 执行模型 (sync vs async), 执行触发与生命周期, 脏路径标记粒度, 子分组方案
**Language:** Chinese (用户沟通语言)

---

## 执行模型 — Sync vs Async

| Option | Description | Selected |
|--------|-------------|----------|
| 同步引擎优先 | Phase 3 构建纯同步 DAG 引擎，异步节点用 Promise stub 占位，Phase 5 再实现真正的异步调度 | ✓ |
| 原生异步引擎 | 引擎从第一天支持 async/await，所有 execute() 返回 Promise | |

**User's choice:** 同步引擎优先
**Notes:** 引擎接口需设计为接受异步解析器的模式 (resolver pattern)，Phase 5 可直接替换实现。边界清晰，Phase 3 可独立验证 DAG 执行正确性。

---

## 执行触发与生命周期

| Option | Description | Selected |
|--------|-------------|----------|
| 手动执行按钮 | 用户编辑后点击"运行"按钮触发 | |
| 自动执行 | 每次变化自动触发 | |
| 混合模式 | 同步变化自动执行 + 异步手动确认。Phase 3 全自动，Phase 5 过渡到混合 | ✓ |

**User's choice:** 混合模式
**Notes:** Phase 3 无真实 AI 调用，全自动执行安全且提供即时反馈。180ms 防抖匹配 HistoryStore merge window。

### 执行状态展示

| Option | Description | Selected |
|--------|-------------|----------|
| 节点级状态指示 | 每个节点边框/角标显示状态 (idle/queued/executing/done/error/skipped) | ✓ |
| 状态指示 + 全局进度条 | 节点指示 + 工具栏进度条 | |
| 状态指示 + 执行日志面板 | 节点指示 + 可折叠日志面板 | |

**User's choice:** 节点级状态指示
**Notes:** 最直观且侵入性最小。状态存储在与 node data 分离的 engine state map 中。

### 错误处理

| Option | Description | Selected |
|--------|-------------|----------|
| 失败传播 | 节点 error → 下游全部 skipped → 停止执行 | ✓ |
| 跳过继续 | 节点 error 标记，下游继续用已有数据 | |

**User's choice:** 失败传播
**Notes:** 防止下游使用损坏数据。用户修复后重新执行清除错误状态。

---

## 脏路径标记粒度

| Option | Description | Selected |
|--------|-------------|----------|
| 节点级脏标记 | 节点输出变化 → 标记所有下游 dirty。简单高效 | ✓ |
| 值级脏标记 | 比较输出值是否实际变化，不变则不传播 | |

**User's choice:** 节点级脏标记
**Notes:** 值级比较对图像等大型数据成本高，收益有限。启动时所有节点为 dirty，首次执行清整张图。

---

## 子分组方案 (NODE-07)

| Option | Description | Selected |
|--------|-------------|----------|
| React Flow 原生 group + parentId | 使用 React Flow 内置 group 节点和 parentId 属性 | ✓ |
| 自定义组节点 | 创建 GroupNode 组件，自行实现拖拽约束等逻辑 | |
| 逻辑分组（数据层） | 仅在 NodeGraphNode 上添加 groupId 字段 | |

**User's choice:** React Flow 原生 group + parentId
**Notes:** 序列化格式保持扁平 `{ nodes, edges }`，子节点增加 `parentId` 字段。单层分组范围 Phase 3 覆盖。嵌套分组推迟。

---

## Claude's Discretion

- Engine interface API design (resolver pattern for node executors)
- Group collapse/expand animation style and timing
- Keyboard shortcuts for execution (reserve Ctrl+Enter)
- Detailed color palette for execution state indicators

## Deferred Ideas

- 嵌套子分组 (Nested groups) — 未来阶段
- 执行日志面板 — Phase 7 UI 范畴
- 全局进度条 — Phase 7 UI 增强
- 值级脏标记优化 — 性能分析后决定
- 手动"执行"按钮 — Phase 5 AI 调用成本考虑时引入
- 用户自定义分组颜色/主题 — Phase 3 使用默认样式
