---
status: testing
phase: 07-application-ui
source: [07-01-SUMMARY.md, 07-02-SUMMARY.md, 07-03-SUMMARY.md]
started: 2026-07-01T13:15:00Z
updated: 2026-07-01T13:15:00Z
---

## Current Test

number: 1
name: App Shell 渲染
expected: |
  导航到根路径 /，应看到：
  - 顶部 TopBar，左侧显示 "AI创意画布" 文字
  - TopBar 中显示项目名称（默认 "无标题项目"）和保存状态 "已保存"
  - 左侧 TabbedSidebar 包含三个标签：图层、素材、属性
  - 标签可点击切换
  - 右下角有画布/节点模式切换按钮
awaiting: user response

## Tests

### 1. App Shell 渲染
expected: 页面加载后看到 TopBar（AI创意画布、项目名、保存状态）、TabbedSidebar（图层/素材/属性）、画布视图
result: [pending]

### 2. 侧栏折叠
expected: 点击侧栏折叠按钮，侧栏从 288px 缩至 44px 图标模式；再次点击展开。图标悬停显示 Tooltip
result: [pending]

### 3. 暗黑模式
expected: 按 T 切换深色/浅色/跟随系统主题。页面无闪烁切换。刷新后主题保持
result: [pending]

### 4. 键盘快捷键
expected: 按 ? 打开快捷键面板，显示分组快捷键列表。按 Esc 关闭。快捷键面板可搜索
result: [pending]

### 5. 项目管理 — 项目列表
expected: 导航到 /projects，看到项目网格视图。无项目时显示空状态 "暂无项目"。有项目时显示卡片（名称、时间戳）
result: [pending]

### 6. 项目管理 — 新建/打开/删除
expected: 点击 "新建项目" 打开 StartPageDialog，可选择 "空白画布" 或模板创建。点击项目卡片打开。删除按钮弹出确认对话框后删除
result: [pending]

### 7. 画布导出 — 一键导出
expected: 在画布页面 TopBar 中看到 "导出 PNG" 按钮。点击后浏览器触发 PNG 下载
result: [pending]

### 8. 画布导出 — 高级配置
expected: 点击导出按钮旁下拉箭头，选择 "导出为..." 打开对话框。可设置格式（PNG/JPG）、分辨率（1x/2x/3x）、背景（透明/白色），点击导出后下载
result: [pending]

### 9. 执行进度面板
expected: 画布页面底部有进度面板。折叠时显示状态条；展开后显示节点执行状态（队列中/执行中/完成/错误），带颜色标识
result: [pending]

### 10. 执行日志
expected: 进度面板展开后内嵌执行日志，显示节点执行历史、状态标识、时间。有 "清除" 按钮
result: [pending]

### 11. 设置页面 — 路由访问
expected: 导航到 /settings，看到完整设置页面，包含 AI 供应商、主题、导出默认值、语言四个区域
result: [pending]

### 12. 设置页面 — AI 供应商配置
expected: 供应商卡片可开关，可输入 API Key（密码掩码 + 显示切换）、Base URL、模型名。保存后设置保留
result: [pending]

### 13. 设置页面 — 主题切换
expected: 浅色/深色/跟随系统 三个按钮可点击，页面主题实时切换。刷新后保持
result: [pending]

### 14. 提示词编辑器
expected: 可编辑模板文本，输入 {{variable}} 后自动识别变量。实时预览区域显示渲染结果。保存后写入 IndexedDB
result: [pending]

### 15. Slider 控件
expected: 在节点编辑模式下选择 TextToImage 节点，属性面板中 width/height/seed 参数使用滑块 + 数字输入框组合
result: [pending]

## Summary

total: 15
passed: 0
issues: 0
pending: 15
skipped: 0

## Gaps

[none yet]
