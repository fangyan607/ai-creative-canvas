---
status: partial
phase: 04-ai-adapters
source: 04-VERIFICATION.md
started: 2026-07-01T11:33:00Z
updated: 2026-07-01T11:33:00Z
---

# Phase 4: AI Adapters — Human Verification UAT

> Items requiring manual testing before phase sign-off.

## Current Test

Starting with MockAdapter visual verification.

## Tests

### 1. MockAdapter 输出验证
expected: MockAdapter 生成彩色矩形 PNG，包含 prompt 文字、seed、尺寸、"MOCK" 水印
result: [pending]

### 2. OpenAiAdapter 真实 API 调用
expected: POST to /v1/images/generations with Authorization header
result: [pending]

### 3. StabilityAdapter 真实 API 调用
expected: SDXL → v1 JSON, SD3 → v2beta FormData
result: [pending]

### 4. Web Crypto 浏览器端加解密
expected: API Key 存入 IndexedDB 为密文，读取还原明文
result: [pending]

### 5. 模板引擎端到端管道
expected: 四类变量源正确注入模板
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
