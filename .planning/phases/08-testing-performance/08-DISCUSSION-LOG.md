# Phase 8: Testing & Performance — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-02
**Phase:** 08-testing-performance
**Areas discussed:** Test Infrastructure, E2E + CI Pipeline, Coverage + Performance, Test Gap Analysis

---

## Test Infrastructure

| Option | Description | Selected |
|--------|-------------|----------|
| Root vitest workspace | 根目录 vitest workspace 模式，覆盖所有包 | ✓ |
| Per-package configs | 每个包各自维护 vitest.config.ts | |
| Just make it run | 不管结构，先让测试能跑起来 | |

| Option | Description | Selected |
|--------|-------------|----------|
| Core: test + test:run + coverage | 标准 vitest 三件套 | |
| Minimal: just test | 只有 pnpm test:run | |
| Comprehensive | test + test:run + coverage + test:ui + test:perf | ✓ |

**User's choice:** Root vitest workspace + Comprehensive test scripts
**Notes:** User wants full vitest tooling available: watch mode, single-run, coverage UI, vitest UI panel, and benchmark entry.

---

## E2E + CI Pipeline

| Option | Description | Selected |
|--------|-------------|----------|
| Playwright + headless | Playwright v1.61 + headless Chromium | ✓ |
| Vitest browser mode | 使用 @vitest/browser | |

| Option | Description | Selected |
|--------|-------------|----------|
| Core flow only | 单一核心 E2E 路径 | ✓ |
| Core + critical variants | 核心 + 模板、设置等变体 | |
| Full coverage | 所有用户交互路径 | |

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub Actions | push/PR 自动运行测试 | |
| Manual + pre-commit | husky + lint-staged | |
| Skip CI for now | MVP 不做 CI | ✓ |

**User's choice:** Playwright + headless, Core flow only E2E, CI deferred to v0.2
**Notes:** E2E 测试先本地运行，CI 在 v0.2 里程碑添加。Playwright 已存在于依赖树中。

---

## Coverage + Performance

| Option | Description | Selected |
|--------|-------------|----------|
| Core logic > 80% | 核心逻辑 >80%，UI >50% | ✓ |
| Uniform > 70% | 所有模块统一 >70% | |
| Just fill gaps | 不设硬性覆盖目标 | |

| Option | Description | Selected |
|--------|-------------|----------|
| Benchmark + 500 elements | 引擎基准 + 500 元素渲染测试 | ✓ |
| Just sanity check | 快速检查确保没变慢 | |
| Full perf suite | 全面性能测试套件 | |

**User's choice:** Core logic > 80% coverage, Benchmark + 500 elements performance testing
**Notes:** Core logic 包括节点引擎、AI 适配器、核心 Zustand 存储。Excalidraw fork 自带测试不考核覆盖。

---

## Test Gap Analysis

| Option | Description | Selected |
|--------|-------------|----------|
| Hooks + resolver tests | useAutoExecute, useAutoSave, resolvers.ts | ✓ |
| AI core missing tests | encryption.ts, registry.ts | |
| Node editor component tests | 节点组件渲染测试 | |
| Skip — core coverage enough | 当前测试已足够 | |

**User's choice:** Hooks + resolver tests only
**Notes:** encryption/registry/node-editor 组件等测试延期。核心逻辑覆盖已基本完备。

---

## Claude's Discretion

- vitest workspace 配置结构的具体实现细节（各包的 include/exclude 模式）
- E2E Playwright 配置文件的具体内容（baseURL、timeout、screenshot 设置）
- 性能基准测试的具体指标阈值

## Deferred Ideas

- CI Pipeline (GitHub Actions) — v0.2 里程碑
- Pre-commit hooks (husky) — v0.2
- E2E flow variants — 模板创建设置等扩展
- AI core 补充测试 (encryption, registry) — 未来版本
- Node editor 组件渲染测试 — 未来版本
- 全面性能测试套件 — 未来版本
