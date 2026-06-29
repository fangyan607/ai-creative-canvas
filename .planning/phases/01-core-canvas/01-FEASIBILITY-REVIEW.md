# 项目可行性评审报告

**评审时间：** 2026-06-29
**评审模式：** SELECTIVE EXPANSION
**项目状态：** Phase 1 已交付（6个计划/5 Wave/39测试），8 个 Phase 路线图

---

## 总体判定

**✅ 可行 — 项目基础扎实，方向正确**

Phase 1 的执行质量（6 个计划全部交付、39 测试通过、自定义代码 0 TS 错误）证明技术选型正确、工作流有效、单人开发节奏可持续。

---

## 确认的前提条件

| # | 前提 | 状态 |
|---|------|------|
| 1 | 中文创作者是核心用户（需国产模型、中文优化、无墙访问） | ✅ |
| 2 | Excalidraw 手绘美学是产品视觉标识 | ✅ |
| 3 | 节点工作流是核心差异化（vs Canva 等模板工具） | ✅ |
| 4 | 视频作为可插拔能力，API 接入推迟 | 🟡 架构预留，接入后置 |
| 5 | 本地优先（IndexedDB），后端按需引入 | ✅ |

---

## 维度评审摘要

### 架构 — OK
三层架构（Canvas / Node / AI）通过 5 个 Zustand Store 通信已验证可行。
**关键风险：** Excalidraw fork drift（HIGH）— 已建立同步机制

### 错误处理 — OK
Phase 1 覆盖：HistoryStore 合并窗口、LRU硬上限、状态序列化过滤、拖拽暂停

### 安全 — OK（攻击面极小）
当前无服务端、无用户认证、无网络通信。AI API Key 存储是后续关注点

### 测试 — 39 tests（良好基线）
覆盖 CanvasStore、HistoryStore、LRUCache、IndexedDB。E2E 测试推迟到 Phase 8

### 性能 — 基线已建立
2000×2000px 分片裁剪 + 分级渲染 + 200MB LRU 缓存

### 部署 — 无风险
纯静态 SPA，`pnpm build` → `vite build` → Cloudflare Pages / GitHub Pages

### 长期轨迹 — 高度可逆（5/5）
Excalidraw fork、Store、IndexedDB、AI 适配器均为可替换抽象层

### 设计 — 一致
Excalidraw 手绘美学保持，Phase 2 节点编辑器风格在实现时确定

---

## 已采纳扩展

| # | 建议 | Effort | 执行时机 |
|---|------|--------|---------|
| 1 | 中文品牌名 + 中文 README | S | Phase 2 启动前 |
| 2 | Excalidraw 上游同步（v0.18.0 fork 后首次） | S | Phase 2 启动前 |
| 3 | Phase 4 优先接入国内 AI 模型（通义万相/文心一格） | 0（调优先级） | Phase 4 启动时 |
| 4 | Phase 2 加入节点模板快速开始功能（预置工作流） | S | Phase 2 范围 |

---

## 风险登记表

| 风险 | 级别 | 可能性 | 影响 | 缓解措施 |
|------|------|--------|------|---------|
| Excalidraw fork drift | 🔴 CRITICAL | Med | 隔离后无法合并上游 | 2-4周同步周期 + FORK_CHANGES.md |
| 单人开发 scope creep | 🟡 HIGH | Med | 持续延期 | GSD phase gates + 每次只做一件事 |
| AI API 费用失控 | 🟡 MED | Low | 项目成本超支 | MockAdapter 默认 + 国内模型低价 |
| 竞品抢占市场 | 🟢 LOW | Low | 中文社区被其他项目占领 | 中文定位 + Excalidraw 美学不可复制 |
| React Flow ↔ Excalidraw 坐标漂移 | 🟡 MED | Low | 节点的画布定位不准 | Phase 1 已创建坐标转换 stub |

---

## 竞品格局（2026年6月）

| 竞品 | 相似度 | 差异点 |
|------|--------|--------|
| **Franklin Canvas** | ⭐⭐⭐ | 开源节点 AI 媒体工作室 + 无限画布。但我们有 Excalidraw 手绘美学 + 中文生态 |
| **Node Banana (MIT)** | ⭐⭐⭐ | 生成式 AI 管线。但我们有完整节点编辑器 + 无限画布 + 中文优化 |
| **NodeTool (AGPL)** | ⭐⭐ | 最全面，支持本地模型。但 AGPL 许可证限制商用，且无手绘画布 |
| **ComfyUI** | ⭐ | 功能最强大，但需要 GPU + 英文 + 学习曲线陡峭 |

**核心差异化（与竞品对比后确认）：**
1. **Excalidraw 手绘美学** — 所有竞品都是严肃工具风格
2. **中文生态 + 国产 AI 模型** — 所有竞品面向海外市场
3. **无 GPU、免安装** — 浏览器打开即用，vs ComfyUI 需要本地 GPU

---

## 建议下一步

**Phase 2 前置（~45分钟 CC 工作量）：**
1. 中文品牌名 + README
2. Excalidraw 上游同步

**然后进入 Phase 2：** `gsd-discuss-phase 2 --auto`

---

*评审人：Claude（CEO Review Mode）*
*基于：系统审计 + /office-hours 设计文档 + 竞品分析*
