---
status: testing
phase: 06-backend-services
source:
  - .planning/phases/06-backend-services/06-01-SUMMARY.md
  - .planning/phases/06-backend-services/06-02-SUMMARY.md
started: 2026-07-01T18:30:00Z
updated: 2026-07-01T18:52:00Z
---

## Current Test

number: 9
name: 前端 Vite 开发代理
expected: |
  前端 dev server 代理 /api/* 到 localhost:3001
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: 启动后端，/api/health 返回 {"status":"ok","timestamp":...}
result: pass

### 2. AI 代理 — JSON 模式
expected: POST /api/ai/generate 返回 200 + JSON 结果
result: pass

### 3. AI 代理 — SSE 流式模式
expected: POST with Accept: text/event-stream 返回 event: progress + event: done
result: pass

### 4. AI 代理 — 错误处理
expected: 未知 providerId 返回 400 + error 消息
result: pass

### 5. 文件上传
expected: POST multipart PNG 返回 201 + fileId + url
result: pass

### 6. 文件下载
expected: GET /api/files/{fileId} 返回 200 + image/png
result: pass

### 7. 文件类型校验
expected: 上传 text/plain 返回 400 拒绝
result: pass

### 8. 文件路径遍历防护
expected: GET /api/files/../../../etc/passwd 返回 404
result: pass

### 9. 文件大小校验
expected: 上传 >10MB 文件返回 400 拒绝
result: pass

### 10. 代理模式切换
expected: VITE_AI_PROXY_MODE 切换 direct/proxy
result: [pending]

## Summary

total: 10
passed: 9
issues: 0
pending: 1
skipped: 0

## Gaps

[none yet]
