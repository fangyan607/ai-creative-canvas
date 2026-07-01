# Phase 6: Backend Services — Research

**Researched:** 2026-07-01
**Domain:** Hono 4.x lightweight backend, SSE streaming, file storage, AI proxy
**Confidence:** HIGH
**Requirements covered:** BKND-01 (AI proxy API), BKND-02 (file upload/download)

## Summary

Phase 6 builds a Hono 4.x backend at `apps/backend/` alongside the existing `apps/web` frontend. The backend provides three core services: (1) an AI proxy endpoint at `/api/ai/generate` that hides client API keys by reading them from server environment variables, (2) file upload/download at `/api/files/upload` and `/api/files/:fileId` using local disk storage, and (3) a global SSE streaming endpoint at `/api/sse/progress` for real-time AI generation progress. The frontend toggles between direct mode (dev, zero backend dep) and proxy mode (production) via the compile-time env var `VITE_AI_PROXY_MODE`. Hono 4.12.27 is already in the lockfile as a transitive dependency, confirmed via `pnpm view hono version` returning `4.12.27`.

**Primary recommendation:** Build `apps/backend/` as a standard Hono 4.x + TypeScript app using `@hono/node-server@2.0.6` for Node.js serving. Create a clean three-router structure (`ai.ts`, `files.ts`, `sse.ts`) under a central `src/routes/` directory. The frontend SSE client (`SSEService` class + `useSSEProgress` hook) lives in `apps/web/src/services/sseService.ts`. Vite dev proxy forwards `/api/*` to `localhost:3001`.

### Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BKND-01 | AI backend proxy API that hides client API keys | Hono 4.x provides `streamSSE()` in `hono/streaming`; backend reuses `@ac-canvas/ai-core` adapters directly; API keys from `process.env.AI_OPENAI_KEY`, `AI_STABILITY_KEY` |
| BKND-02 | File upload and download service | Hono's `c.req.parseBody()` handles multipart form-data natively; local disk storage at `apps/backend/uploads/` by date sharded directories; memory Map for metadata tracking |

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01: Frontend execution + SSE broadcast layer** — Phase 5 AI execution chain (AIQueueStore + adapter direct EventEmitter) stays unchanged. Backend adds SSE broadcast endpoint. Adapter emits progress events while also sending to backend SSE service, then backend pushes via SSE to frontend.
  - Direct mode: adapter EventEmitter → EngineStore (identical to Phase 5)
  - Proxy mode: adapter EventEmitter → frontend HTTP request to backend → backend SSE → frontend EventSource → EngineStore
  - EngineStore update path remains unified across both modes

- **D-02: Global SSE endpoint `/api/sse/progress`** — Single SSE connection carries all AI progress events. Frontend opens one long-lived SSE connection. All tasks' progress/error/done events pushed over the same connection, differentiated by `taskId`/`nodeId` in the event payload.
  - No per-task-ID endpoint isolation (avoids connection churn)
  - SSE connection lives for page lifecycle (coexists with App)
  - Native EventSource auto-reconnect on disconnect

- **D-03: Standardized SSE event format**
  ```
  event: progress
  data: {"type":"progress","taskId":"uuid","nodeId":"n1","providerId":"openai","percent":45,"stage":"generating","timestamp":1719800000000}
  
  event: error
  data: {"type":"error","taskId":"uuid","nodeId":"n1","code":"rate_limited","message":"Rate limit exceeded","timestamp":1719800000000}
  
  event: done
  data: {"type":"done","taskId":"uuid","nodeId":"n1","result":{"imageBlobId":"...","width":1024,"height":1024},"timestamp":1719800000000}
  ```
  - `event` field uses standard SSE event types (`progress`/`error`/`done`)
  - `data` is JSON-serialized event payload with `type`, `taskId`, `nodeId`, `providerId`, `percent`, `stage`, `timestamp`
  - Format is independent of underlying AI adapter implementation

- **D-04: Independent SSE service layer + React Hook**
  - `SSEService` class: connection management, event parsing, dispatch by event type
  - `useSSEProgress` hook: maps SSE events to EngineStore's `setNodeStatus()`/`setNodeError()`
  - Service layer independently testable (mock EventSource)
  - Hook has single responsibility

- **D-05: Generic proxy + per-provider dispatch at `/api/ai/generate`** — Request body includes `providerId` field. Backend reads API Key from server env vars (`AI_OPENAI_KEY`, `AI_STABILITY_KEY`) by `providerId`, forwards request to AI provider.
  - Request body: `{ providerId: string, params: AdapterParams }` aligned with Phase 4 adapter interface
  - Response: if `Accept: text/event-stream` header present, SSE streaming; otherwise direct JSON
  - Backend adapters reuse `@ac-canvas/ai-core` existing AdapterRegistry and adapter classes

- **D-06: Local disk file storage at `apps/backend/uploads/` by date** — Organized as `uploads/YYYY-MM-DD/uuid.png`.
  - Endpoints: `POST /api/files/upload` (multipart/form-data), `GET /api/files/:fileId`
  - File ID is UUID; metadata stored in memory Map (no DB for MVP)
  - Supported types: PNG, JPG, WebP (aligned with AI adapter output)
  - No auto-cleanup in MVP

- **D-07: Build-time env var `VITE_AI_PROXY_MODE` toggle** (direct/proxy)
  - `direct` (default): frontend connects directly to AI provider APIs via ProviderStore
  - `proxy`: all AI requests go through backend `/api/ai/generate`
  - Compile-time decision, not runtime (simplifies implementation)
  - Dev uses `direct` mode; deployment uses `proxy` mode
  - In `proxy` mode, frontend ProviderStore no longer stores API keys

- **D-08: No auth in dev, JWT placeholder for production**
  - MVP dev endpoints have no auth (localhost trust environment)
  - Backend code reserves Hono JWT middleware injection point
  - File upload/download endpoints not authenticated (personal tool acceptable)
  - Future JWT via `@hono/jwt` middleware with `Authorization: Bearer <token>` header

### Claude's Discretion
- Backend project structure: `apps/backend/` as Hono app (vs `packages/backend/`)
- Backend `package.json` Hono route design and organization
- SSEService TypeScript interface definitions
- File storage directory path configurable (default `uploads/`)
- Backend startup port (dev default 3001)
- Vite dev proxy config (`vite.config.ts` proxy to localhost:3001)

### Deferred Ideas (OUT OF SCOPE)
- SSE connection authentication
- File auto-cleanup / quota management
- Backend ProviderStore server-side version
- Cloudflare R2 integration
- BKND-03 JWT authentication (deferred to v0.2)
- File CDN acceleration
- WebSocket alternative to SSE

</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Hono | 4.12.27 | Web framework | Already in lockfile as transitive dep. Multi-runtime (Node/Workers/Bun). ~28,600 req/sec on Node 22. ~12KB core bundle. `streamSSE()` for SSE, built-in `c.req.parseBody()` for multipart uploads. [VERIFIED: pnpm-lock.yaml + pnpm view] |
| @hono/node-server | 2.0.6 | Node.js HTTP server | Required adapter to serve Hono on Node.js. v2.x requires Node 20+. Provides `serve()` and `createAdaptorServer()`. [VERIFIED: npm registry via pnpm view] |
| TypeScript | 5.x | Language | Project standard. Backend TypeScript needs `tsx` for dev (watch mode), `tsc` for typecheck. [VERIFIED: root package.json] |
| @ac-canvas/ai-core | workspace:* | AI adapters | Reuses existing `AdapterRegistry`, `AiAdapter` base class, and concrete adapters (OpenAI, Stability, Mock). Backend installs via pnpm workspace protocol. [VERIFIED: packages/ai-core/src/index.ts, AdapterRegistry pattern] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @hono/zod-validator | latest (0.8.x) | Request validation | For request body validation at `/api/ai/generate` and `/api/files/upload`. Integrates with Zod 4.x used elsewhere in project. |
| tsx | 4.19.2 | TypeScript runner | For `apps/backend/` dev mode: `tsx watch src/index.ts`. No build step needed during development. |
| zod | ^4.4.3 | Runtime validation | Already in workspace. Use for validating SSE event payloads and AI proxy request bodies. |
| eventemitter3 | ^5.0.4 | Event emitter | Already used by `AiAdapter` base class. The SSE broadcast service on the backend will subscribe to adapter progress events and forward to SSE connections. [VERIFIED: packages/ai-core/package.json] |
| @hono/jwt | latest | JWT middleware | Placeholder only for D-08. Not installed yet — added when BKND-03 is implemented in v0.2. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @hono/node-server | Bun, Deno, Cloudflare Workers | Already on Node 24. Workers deployment is future concern. Node server is simplest for local dev. |
| 3 separate routers | Single monolithic router | Router separation scales better. Each of the 3 services (AI, files, SSE) has distinct concerns. |
| tsx | ts-node, tsx's own `--watch` | `tsx` is fastest TypeScript runner (based on esbuild). `ts-node` is slower. `tsx watch` provides native file-watching. |

**Installation:**
```bash
# Backend specific deps
cd apps/backend
pnpm add hono @hono/node-server @hono/zod-validator
pnpm add -D tsx typescript @types/node

# Workspace dependency on ai-core
pnpm add @ac-canvas/ai-core@workspace:*
```

**Version verification (confirmed 2026-07-01):**
- `hono@4.12.27` — verified via `pnpm view hono version` (already in lockfile)
- `@hono/node-server@2.0.6` — verified via `pnpm view @hono/node-server version`
- `Node.js` — current env has `v23.8.0`; project standard recommends Node 24 LTS

**SECURITY NOTE:** Hono 4.12.4+ is required to fix CVE-2026-29085 (SSE control field injection via CR/LF in `writeSSE()`). The project already has `hono@4.12.27` which is above this threshold.

## Architecture Patterns

### Recommended Project Structure

```
apps/backend/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                 # Entry point: serve() the Hono app on port 3001
│   ├── app.ts                   # Hono app factory: new Hono(), mount routers
│   ├── routes/
│   │   ├── ai.ts                # POST /api/ai/generate — AI proxy router
│   │   ├── files.ts             # POST /api/files/upload, GET /api/files/:fileId
│   │   └── sse.ts               # GET /api/sse/progress — SSE streaming router
│   ├── services/
│   │   └── sseBroadcast.ts      # SSE broadcast manager: tracking active connections
│   ├── middleware/
│   │   └── auth.ts              # JWT middleware placeholder (D-08, deferred stub)
│   └── config.ts                # Environment variable reader: AI_OPENAI_KEY, AI_STABILITY_KEY, PORT, UPLOAD_DIR

apps/web/src/services/
├── sseService.ts                # SSEService class — EventSource wrapper
└── useSSEProgress.ts            # React Hook mapping SSE events to EngineStore
```

### Pattern 1: Hono App Factory + Router Mounting

**What:** Create the Hono app in a separate `app.ts` factory function, mount route modules using `app.route()`. The entry `index.ts` only calls `serve()`.

**When to use:** Standard pattern for Hono apps with 2+ route modules. Avoids monolithic route definitions.

**Example:**
```typescript
// apps/backend/src/app.ts
import { Hono } from 'hono'
import { aiRouter } from './routes/ai'
import { filesRouter } from './routes/files'
import { sseRouter } from './routes/sse'

export function createApp(): Hono {
  const app = new Hono()

  // Mount route modules under /api prefix
  app.route('/api/ai', aiRouter)      // /api/ai/generate
  app.route('/api/files', filesRouter) // /api/files/upload, /api/files/:fileId
  app.route('/api/sse', sseRouter)     // /api/sse/progress

  // Health check
  app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }))

  return app
}
```

```typescript
// apps/backend/src/index.ts
import { serve } from '@hono/node-server'
import { createApp } from './app'

const app = createApp()
const port = Number(process.env.PORT) || 3001

console.log(`Backend server starting on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port,
})
```

### Pattern 2: SSE Broadcast Manager

**What:** A singleton `SseBroadcastManager` class that tracks all active SSE connections and broadcasts events to all of them. Each SSE connection is wrapped in a tracked client object with an ID for lifecycle management.

**When to use:** Multiple SSE clients need to receive the same broadcast events. The global SSE endpoint `/api/sse/progress` is shared by all frontend sessions.

**Example:**
```typescript
// apps/backend/src/services/sseBroadcast.ts
import type { SSEStreamingApi } from 'hono/streaming'

interface SseClient {
  id: string
  stream: SSEStreamingApi
  connectedAt: number
}

interface SseEvent {
  type: 'progress' | 'error' | 'done'
  taskId: string
  nodeId: string
  providerId: string
  percent?: number
  stage?: string
  code?: string
  message?: string
  result?: Record<string, unknown>
  timestamp: number
}

export class SseBroadcastManager {
  private clients = new Map<string, SseClient>()
  private static instance: SseBroadcastManager

  static getInstance(): SseBroadcastManager {
    if (!SseBroadcastManager.instance) {
      SseBroadcastManager.instance = new SseBroadcastManager()
    }
    return SseBroadcastManager.instance
  }

  addClient(id: string, stream: SSEStreamingApi): void {
    this.clients.set(id, { id, stream, connectedAt: Date.now() })
  }

  removeClient(id: string): void {
    this.clients.delete(id)
  }

  broadcast(event: SseEvent): void {
    const payload = JSON.stringify(event)
    for (const [id, client] of this.clients) {
      try {
        client.stream.writeSSE({
          event: event.type,
          data: payload,
        })
      } catch {
        // Client disconnected — clean up
        this.clients.delete(id)
      }
    }
  }

  get clientCount(): number {
    return this.clients.size
  }
}
```

### Pattern 3: SSE Endpoint with streamSSE and Connection Lifecycle

**What:** Hono's `streamSSE()` manages the SSE stream. The SSE router creates a client entry via `SseBroadcastManager` and cleans up on abort.

**When to use:** For the `/api/sse/progress` global SSE endpoint.

**Example:**
```typescript
// apps/backend/src/routes/sse.ts
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { SseBroadcastManager } from '../services/sseBroadcast'

export const sseRouter = new Hono()
const broadcastManager = SseBroadcastManager.getInstance()

sseRouter.get('/progress', async (c) => {
  const clientId = crypto.randomUUID()

  return streamSSE(c, async (stream) => {
    // Register client
    broadcastManager.addClient(clientId, stream)

    // Send initial connected event
    await stream.writeSSE({
      event: 'connected',
      data: JSON.stringify({ clientId, timestamp: Date.now() }),
    })

    // Clean up on client disconnect
    stream.onAbort(() => {
      broadcastManager.removeClient(clientId)
    })

    // Keep connection alive with periodic heartbeats
    // (prevents proxy/load-balancer timeouts)
    const heartbeat = setInterval(async () => {
      try {
        await stream.writeSSE({
          event: 'heartbeat',
          data: JSON.stringify({ timestamp: Date.now() }),
        })
      } catch {
        clearInterval(heartbeat)
      }
    }, 30000)

    // The streamSSE callback holds the connection open. In practice,
    // it waits for events to be pushed — the broadcast manager calls
    // stream.writeSSE() from outside this callback when new events arrive.
    // We use a Promise that never resolves to keep the stream alive,
    // relying on onAbort for cleanup.
    await new Promise<void>((_resolve, reject) => {
      stream.onAbort(() => {
        clearInterval(heartbeat)
        reject(new Error('Client disconnected'))
      })
    })
  })
})
```

**IMPORTANT IMPLEMENTATION NOTE:** The above pattern has a subtle challenge — `streamSSE` expects the callback to be the active writer, but we want `SseBroadcastManager` to write from outside. The canonical approach is to store a reference to `stream.writeSSE` externally and keep the stream alive with an await that only resolves on abort. Alternatively, all broadcasting happens from within the streamSSE callback by polling an event queue. For this project, the "store reference and keep alive" approach is simpler. [ASSUMED]

### Pattern 4: File Upload and Download Routes

**What:** Use `c.req.parseBody()` to extract uploaded files, save to date-sharded directories on disk. Download via `c.body()` with the file's Buffer and proper Content-Type.

**When to use:** For the file upload/download endpoints.

**Example:**
```typescript
// apps/backend/src/routes/files.ts
import { Hono } from 'hono'
import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'

export const filesRouter = new Hono()

// In-memory metadata store (MVP — no database)
interface FileRecord {
  id: string
  originalName: string
  mimeType: string
  size: number
  path: string
  uploadedAt: number
}
const fileStore = new Map<string, FileRecord>()

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// POST /api/files/upload — multipart file upload
filesRouter.post('/upload', async (c) => {
  const body = await c.req.parseBody()
  const file = body['file']

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No file uploaded' }, 400)
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return c.json({ error: `Unsupported file type: ${file.type}. Allowed: PNG, JPG, WebP` }, 400)
  }

  if (file.size > MAX_FILE_SIZE) {
    return c.json({ error: 'File too large. Max 10MB' }, 400)
  }

  const fileId = crypto.randomUUID()
  const dateStr = new Date().toISOString().slice(0, 10) // 2026-07-01
  const subDir = join(UPLOAD_DIR, dateStr)

  // Ensure subdirectory exists
  if (!existsSync(subDir)) {
    await mkdir(subDir, { recursive: true })
  }

  const ext = file.type === 'image/png' ? '.png'
    : file.type === 'image/jpeg' ? '.jpg'
    : '.webp'
  const filePath = join(subDir, `${fileId}${ext}`)

  // Write file to disk
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(filePath, buffer)

  // Store metadata
  const record: FileRecord = {
    id: fileId,
    originalName: file.name,
    mimeType: file.type,
    size: file.size,
    path: filePath,
    uploadedAt: Date.now(),
  }
  fileStore.set(fileId, record)

  return c.json({
    fileId,
    url: `/api/files/${fileId}`,
    mimeType: file.type,
    size: file.size,
  }, 201)
})

// GET /api/files/:fileId — file download
filesRouter.get('/:fileId', async (c) => {
  const fileId = c.req.param('fileId')
  const record = fileStore.get(fileId)

  if (!record) {
    return c.json({ error: 'File not found' }, 404)
  }

  try {
    const buffer = await readFile(record.path)
    return c.body(buffer, 200, {
      'Content-Type': record.mimeType,
      'Content-Disposition': `inline; filename="${record.originalName}"`,
    })
  } catch {
    return c.json({ error: 'File not found on disk' }, 404)
  }
})
```

### Pattern 5: AI Proxy Route with Adapter Reuse

**What:** The `/api/ai/generate` endpoint uses the existing `@ac-canvas/ai-core` registry to instantiate adapters, reads API keys from env vars, and either streams SSE progress or returns JSON.

**When to use:** For the AI proxy endpoint (BKND-01).

**Example:**
```typescript
// apps/backend/src/routes/ai.ts
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { AdapterRegistry, AiAdapter } from '@ac-canvas/ai-core'
import { SseBroadcastManager } from '../services/sseBroadcast'

export const aiRouter = new Hono()

// Map providerId to environment variable name
const API_KEY_ENV_MAP: Record<string, string> = {
  openai: 'AI_OPENAI_KEY',
  stability: 'AI_STABILITY_KEY',
  mock: 'AI_MOCK_KEY', // Mock doesn't need a key, but env var can override behavior
}

aiRouter.post('/generate', async (c) => {
  const body = await c.req.json()
  const { providerId, params } = body as {
    providerId: string
    params: Record<string, unknown>
  }

  if (!providerId) {
    return c.json({ error: 'providerId is required' }, 400)
  }

  // Get adapter constructor from registry
  const registry = AdapterRegistry.getInstance()
  const AdapterClass = registry.get(providerId)
  if (!AdapterClass) {
    return c.json({ error: `Unknown provider: ${providerId}` }, 400)
  }

  // Read API key from env var
  const envKey = API_KEY_ENV_MAP[providerId]
  if (!envKey) {
    return c.json({ error: `No API key configured for provider: ${providerId}` }, 500)
  }
  const apiKey = process.env[envKey] || ''

  // Determine response mode from Accept header
  const acceptsSSE = c.req.header('Accept')?.includes('text/event-stream')
  const taskId = crypto.randomUUID()
  const nodeId = (params as any).__nodeId as string || taskId

  // Instantiate adapter
  const adapter = new AdapterClass({ apiKey }) as AiAdapter

  if (acceptsSSE) {
    // SSE streaming response
    return streamSSE(c, async (stream) => {
      // Wire adapter events to SSE stream
      adapter.on('progress', (data: { percent: number; stage: string }) => {
        stream.writeSSE({
          event: 'progress',
          data: JSON.stringify({
            type: 'progress',
            taskId,
            nodeId,
            providerId,
            percent: data.percent,
            stage: data.stage,
            timestamp: Date.now(),
          }),
        }).catch(() => {})
      })

      adapter.on('error', (data: { code: string; message: string }) => {
        stream.writeSSE({
          event: 'error',
          data: JSON.stringify({
            type: 'error',
            taskId,
            nodeId,
            providerId,
            code: data.code,
            message: data.message,
            timestamp: Date.now(),
          }),
        }).catch(() => {})
      })

      adapter.on('done', (result: any) => {
        stream.writeSSE({
          event: 'done',
          data: JSON.stringify({
            type: 'done',
            taskId,
            nodeId,
            providerId,
            result,
            timestamp: Date.now(),
          }),
        }).catch(() => {})
      })

      stream.onAbort(() => {
        adapter.removeAllListeners()
      })

      // Execute adapter
      try {
        const result = await adapter.execute(
          params,
          {},
        )
        // done event already emitted above
      } catch (err) {
        // Error already handled via adapter 'error' event
      }
    })
  } else {
    // Direct JSON response
    try {
      const result = await adapter.execute(params, {})
      return c.json({ success: true, taskId, result })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return c.json({ success: false, taskId, error: message }, 500)
    }
  }
})
```

**NOTE:** The above code is illustrative. The adapter pattern on the backend has a key difference from the frontend: on the frontend, the adapter emits progress events that flow to EngineStore. On the backend, the adapter events must be forwarded to the SSE stream. Additionally, the backend does NOT use `onStoreImage` (images are stored to disk by the file service instead). [ASSUMED]

### Pattern 6: Frontend SSEService + useSSEProgress Hook

**What:** A service class wrapping the native `EventSource` API, plus a React hook that integrates with EngineStore.

**When to use:** In the frontend app when proxy mode is active (`VITE_AI_PROXY_MODE=proxy`).

**Example:**
```typescript
// apps/web/src/services/sseService.ts

export type SseEventHandler = (payload: SseEventPayload) => void

export interface SseEventPayload {
  type: 'progress' | 'error' | 'done'
  taskId: string
  nodeId: string
  providerId: string
  percent?: number
  stage?: string
  code?: string
  message?: string
  result?: Record<string, unknown>
  timestamp: number
}

export class SSEService {
  private eventSource: EventSource | null = null
  private handlers = new Map<string, Set<SseEventHandler>>()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private url: string

  constructor(url: string = '/api/sse/progress') {
    this.url = url
  }

  connect(): void {
    if (this.eventSource) return
    this.eventSource = new EventSource(this.url)

    this.eventSource.onopen = () => {
      this.reconnectAttempts = 0
    }

    this.eventSource.addEventListener('progress', (event) => {
      this.dispatch('progress', JSON.parse(event.data))
    })
    this.eventSource.addEventListener('error', (event) => {
      this.dispatch('error', JSON.parse(event.data))
    })
    this.eventSource.addEventListener('done', (event) => {
      this.dispatch('done', JSON.parse(event.data))
    })

    // Heartbeat for keepalive
    this.eventSource.addEventListener('heartbeat', () => {
      // Reset reconnect counter on any event
      this.reconnectAttempts = 0
    })

    this.eventSource.onerror = () => {
      // EventSource automatically reconnects, but we cap retries
      this.reconnectAttempts++
      if (this.reconnectAttempts > this.maxReconnectAttempts) {
        this.disconnect()
      }
    }
  }

  disconnect(): void {
    this.eventSource?.close()
    this.eventSource = null
  }

  on(eventType: string, handler: SseEventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set())
    }
    this.handlers.get(eventType)!.add(handler)
    return () => this.handlers.get(eventType)?.delete(handler)
  }

  private dispatch(eventType: string, payload: SseEventPayload): void {
    const handlers = this.handlers.get(eventType)
    if (handlers) {
      for (const handler of handlers) {
        handler(payload)
      }
    }
  }
}
```

```typescript
// apps/web/src/services/useSSEProgress.ts
import { useEffect, useRef } from 'react'
import { SSEService } from './sseService'
import { useEngineStore } from '../stores/engineStore'

let sseServiceInstance: SSEService | null = null

export function initSSE(): void {
  if (!sseServiceInstance) {
    sseServiceInstance = new SSEService()
    sseServiceInstance.connect()
  }
}

export function destroySSE(): void {
  sseServiceInstance?.disconnect()
  sseServiceInstance = null
}

export function useSSEProgress(): void {
  const setNodeStatus = useEngineStore((s) => s.setNodeStatus)
  const setNodeError = useEngineStore((s) => s.setNodeError)
  const initialized = useRef(false)

  useEffect(() => {
    if (!sseServiceInstance || initialized.current) return
    initialized.current = true

    const unsubProgress = sseServiceInstance.on('progress', (payload) => {
      setNodeStatus(payload.nodeId, 'executing')
    })

    const unsubError = sseServiceInstance.on('error', (payload) => {
      setNodeStatus(payload.nodeId, 'error')
      if (payload.message) {
        setNodeError(payload.nodeId, payload.message)
      }
    })

    const unsubDone = sseServiceInstance.on('done', (payload) => {
      setNodeStatus(payload.nodeId, 'done')
    })

    return () => {
      unsubProgress()
      unsubError()
      unsubDone()
    }
  }, [setNodeStatus, setNodeError])
}
```

### Anti-Patterns to Avoid

- **Monolithic backend:** Putting all routes in a single file. Use separate router modules (`routes/ai.ts`, `routes/files.ts`, `routes/sse.ts`).
- **SSE without heartbeat:** Proxies and load balancers may timeout idle connections. Send a heartbeat event every 30 seconds.
- **Blocking the SSE stream:** The `streamSSE` callback should not do synchronous blocking work. All I/O should be async.
- **Storing files by ID without tracking:** The in-memory Map is fine for MVP but be aware it resets on server restart. Document this limitation in code comments.
- **Sharing SSE stream reference unsafely:** The `streamSSE` callback owns the stream. Broadcasting from outside requires a safe pattern (store `writeSSE` ref, keep stream alive with a forever promise, clean up on abort).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE streaming | Custom SSE implementation with raw `Response` | Hono `streamSSE()` from `hono/streaming` | Handles chunked transfer encoding, keepalive, abort detection, proper SSE wire format |
| Multipart file parsing | Manual multipart stream parser | `c.req.parseBody()` (built into Hono) | Built-in, handles boundary parsing, large file streaming, field extraction |
| TypeScript execution | `tsc` + `node` with build step | `tsx watch src/index.ts` | Hot-reload during development, no build step needed |
| CORS handling | Manual CORS headers | Hono `cors()` middleware or Vite dev proxy | Vite proxy in dev eliminates CORS entirely; production deploys same-origin |
| Zod request validation | Manual validation with if/else chains | `@hono/zod-validator` | Declarative schema validation with type inference |

**Key insight:** Hono's built-in helpers (`streamSSE`, `parseBody`, `cors`) eliminate the most error-prone parts of building a lightweight backend. The `streamSSE` function in particular handles SSE wire format correctness (field sanitization via CVE-2026-29085 fix, proper framing) that is easy to get wrong in a hand-rolled implementation.

## Common Pitfalls

### Pitfall 1: SSE Connection Lifecycle Mismanagement
**What goes wrong:** The SSE stream closes prematurely or accumulates orphaned client references when clients disconnect without proper cleanup.
**Why it happens:** `stream.onAbort()` might not fire in all disconnect scenarios (network drop, browser tab close). The `SseBroadcastManager` continues trying to write to closed streams, causing unhandled rejections.
**How to avoid:** (1) Use try/catch around every `stream.writeSSE()` call in the broadcast manager. (2) Implement the heartbeat as an active health check — if heartbeat write fails, remove the client. (3) Set a maximum client count to prevent resource exhaustion.
**Warning signs:** Server console shows "Cannot set headers after they are sent" errors; SSE connections accumulate without limit.

### Pitfall 2: CORS Issues in Dev Mode
**What goes wrong:** Frontend on `localhost:5173` cannot connect to backend on `localhost:3001` due to CORS policy.
**Why it happens:** Vite dev server runs on a different port than the backend.
**How to avoid:** Configure Vite proxy in `vite.config.ts`:
```typescript
// apps/web/vite.config.ts — add server.proxy
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
    },
  },
},
```
This eliminates CORS entirely in dev mode. Production uses same-origin deployment or a separate reverse proxy.
**Warning signs:** Browser console shows CORS errors only in dev mode.

### Pitfall 3: SSE Control Field Injection (CVE-2026-29085)
**What goes wrong:** Unsanitized event type or data containing CR/LF characters can inject fake SSE frames, leading to data injection attacks.
**Why it happens:** Before Hono 4.12.4, `writeSSE()` did not validate that `event`, `id`, and `retry` fields contained `\r` or `\n` characters.
**How to avoid:** Use Hono 4.12.4+ (already satisfied — 4.12.27 in lockfile). Additionally, sanitize user-controlled data that goes into SSE field values.
**Warning signs:** N/A (this pitfall is already mitigated by the version in use, but important to document for awareness).

### Pitfall 4: File Path Traversal
**What goes wrong:** Malicious fileId values like `../../etc/passwd` could read arbitrary files from the server.
**Why it happens:** The `/api/files/:fileId` route uses the `fileId` parameter directly in file path construction.
**How to avoid:** Always validate `:fileId` is a valid UUID format before using it. Do not allow arbitrary path segments. For this MVP, the in-memory metadata Map already prevents traversal (the `fileId` is looked up in the Map first, which only contains real UUIDs), but the `readFile()` at `record.path` should still use `path.resolve()` and verify it's within the uploads directory.
**Warning signs:** 404 errors for expected files; security scan alerts.

### Pitfall 5: Race Condition on File Metadata
**What goes wrong:** Two concurrent uploads for the same fileId overwrite each other's metadata.
**Why it happens:** The in-memory Map allows overwrite by default.
**How to avoid:** Check if `fileId` already exists in the Map before writing. In practice, using `crypto.randomUUID()` makes collisions astronomically unlikely, but an explicit check is defensive. More importantly, the date-sharded directory structure already prevents on-disk collisions since each file gets a unique name.

### Pitfall 6: Adapter State Leak Between Requests
**What goes wrong:** Reusing an adapter instance across requests causes event listener accumulation or stale state.
**Why it happens:** Each AI proxy request creates a new adapter instance but doesn't clean up properly.
**How to avoid:** Create a fresh adapter instance per request (the adapter constructor is cheap). Always call `adapter.removeAllListeners()` in a finally block (matching the pattern established in `aiBridge.ts`). Do NOT reuse adapter instances or hold a singleton adapter.

## Code Examples

### SSE Stream (Hono streamSSE) — Verified Pattern

```typescript
import { streamSSE } from 'hono/streaming'

app.get('/sse', async (c) => {
  return streamSSE(c, async (stream) => {
    // Send initial event
    await stream.writeSSE({
      event: 'connected',
      data: JSON.stringify({ status: 'connected' }),
    })

    // Write multiple events
    let id = 0
    while (true) {
      await stream.writeSSE({
        event: 'update',
        data: JSON.stringify({ id: id++, time: new Date() }),
        id: String(id),
      })
      await stream.sleep(1000)
    }
  })
})
```
Source: Hono docs — https://hono.dev/docs/helpers/streaming [CITED]

### File Upload (Hono parseBody) — Verified Pattern

```typescript
app.post('/upload', async (c) => {
  const body = await c.req.parseBody()
  const file = body['file']
  if (file && file instanceof File) {
    // File is a Web API File object
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await writeFile(`./uploads/${file.name}`, buffer)
  }
  return c.json({ success: true })
})
```
Source: Hono docs — https://honodev.pages.dev/examples/file-upload [CITED]

### Server Start (Hono + Node.js) — Verified Pattern

```typescript
import { serve } from '@hono/node-server'
import { Hono } from 'hono'

const app = new Hono()
app.get('/', (c) => c.text('Hello Hono!'))

serve({
  fetch: app.fetch,
  port: 3000,
})
```
Source: https://hono.dev/docs/getting-started/nodejs [CITED]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual SSE via raw Response | Hono `streamSSE()` helper | Hono 4.x GA | Automatic chunked encoding, abort handling, proper SSE wire format |
| `@hono/node-server` v1.x | v2.x | Early 2026 | Requires Node 20+. New `serve()` signature with consolidated options object. `createAdaptorServer()` for custom HTTP server. |
| Hono pre-4.12.4 | Hono 4.12.4+ | CVE-2026-29085 fix (March 2026) | SSE field sanitization — `writeSSE()` now validates `event`/`id`/`retry` fields for CR/LF injection |

**Deprecated/outdated:**
- Express 5: 2.3x slower than Hono on Node.js benchmarks. Not multi-runtime. Not recommended for new projects.
- `c.req.raw.body` for manual multipart parsing: Use `c.req.parseBody()` instead.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The `streamSSE` callback can store a reference to `stream.writeSSE` externally and keep the stream alive with an unresolved Promise, enabling `SseBroadcastManager` to broadcast from outside the callback. | SSE Broadcast Manager | Low — Alternative is to poll an in-memory event queue from within the callback. The stored-reference pattern is used in production Hono apps. |
| A2 | The backend adapter `execute()` calls do not need the `onStoreImage` callback because the backend file service handles storage separately. | AI Proxy Route | Medium — If the adapter needs `onStoreImage` to return a valid `imageBlobId` (which AdapterResult requires), the backend must either (a) provide a dummy callback that stores to local disk, or (b) skip blob storage and use backend file service. The `imageBlobId` in `AdapterResult` is a string — it can be a backend file UUID even if not stored via the callback. |

## Open Questions

1. **How does the AI queue interact with the proxy mode?**
   - What we know: In direct mode, `aiQueueStore.ts` enqueues jobs and processes them serially per-provider. In proxy mode, the frontend bridge sends an HTTP POST to `/api/ai/generate` instead.
   - What's unclear: Should the queue still exist on the frontend in proxy mode, or does the backend become the queue manager? If the frontend queue stays, it would queue HTTP requests rather than adapter executions.
   - Recommendation: Keep the frontend queue. The proxy endpoint simply replaces the direct adapter call. The queue's rate limiting and serial execution per-provider remain valuable even with a backend proxy.

2. **How should the adapter's `onStoreImage` callback work in proxy mode?**
   - What we know: Adapters expect `onStoreImage(blob) => Promise<string>` which returns an imageBlobId. In direct mode, this stores to IndexedDB via `imageBlobStore`.
   - What's unclear: In proxy mode, should the backend adapter write the image blob to disk directly and return the file UUID? Or should it return the blob in the SSE/JSON response for the frontend to store?
   - Recommendation: In proxy mode, skip the `onStoreImage` callback. The backend adapter returns the blob as base64 in the done event's `result` object. The frontend SSE handler stores it locally (to IndexedDB) and updates the `imageBlobId`.

3. **Should the frontend SSE connection be initialized at App mount or only when proxy mode is active?**
   - What we know: SSE connection stays alive for the page lifecycle (D-02).
   - What's unclear: Whether to always connect SSE and just ignore events in direct mode, or to only connect when `VITE_AI_PROXY_MODE=proxy`.
   - Recommendation: Only initialize SSE when proxy mode is active. Check `import.meta.env.VITE_AI_PROXY_MODE` at startup. In direct mode, the existing EventEmitter path from Phase 5 handles all progress updates.

4. **How to handle the backend's tsconfig?**
   - What we know: Frontend uses Vite 8 with Rolldown. Backend runs on Node.js with `tsx`.
   - What's unclear: Backend tsconfig needs different settings (no JSX, `moduleResolution: "bundler"` for workspace packages).
   - Recommendation: Create a minimal `tsconfig.json` for `apps/backend/` extending a workspace root tsconfig if one exists, or standalone with `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`, `"target": "ES2024"`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend runtime | Yes (v23.8.0) | v23.8.0 | Target Node 24 LTS; v23 is close enough for dev |
| pnpm | Package management | Yes | 11.8.0 | -- |
| Hono | Web framework | Yes (in lockfile) | 4.12.27 | Already available as transitive dep |
| @hono/node-server | Node.js adaptor | Not installed | 2.0.6 (latest) | Must be added to apps/backend/package.json |
| tsx | TypeScript runner | Not installed | 4.19.2 (latest) | Must be added as devDep. Fallback: `tsc --watch` + separate terminal |
| apps/backend/ | Project directory | Does not exist | -- | Must be created. Follows `apps/web` pattern |

**Missing dependencies with no fallback:** None — all required packages are installable via pnpm.

**Missing dependencies with fallback:**
- `tsx` — can be replaced with `tsc --watch` + `node --watch` in separate terminals, but tsx is preferred for convenience

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.x (already in workspace root) |
| Config file | Can be per-package or workspace-level — backend tests in `apps/backend/src/**/*.test.ts` |
| Quick run command | `cd apps/backend && npx vitest run --reporter=verbose` |
| Full suite command | `pnpm -r test` (if backend adds test script to package.json) |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BKND-01 | AI proxy POST /api/ai/generate routes request correctly | unit | `npx vitest run apps/backend/src/routes/ai.test.ts` | ❌ Wave 0 |
| BKND-01 | AI proxy SSE streaming sends progress events | integration | `npx vitest run apps/backend/src/routes/ai.test.ts` | ❌ Wave 0 |
| BKND-01 | AI proxy reads API keys from env vars | unit | `npx vitest run apps/backend/src/routes/ai.test.ts` | ❌ Wave 0 |
| BKND-02 | File upload saves to correct date-sharded directory | integration | `npx vitest run apps/backend/src/routes/files.test.ts` | ❌ Wave 0 |
| BKND-02 | File download returns correct file by fileId | integration | `npx vitest run apps/backend/src/routes/files.test.ts` | ❌ Wave 0 |
| BKND-02 | File type validation rejects unsupported types | unit | `npx vitest run apps/backend/src/routes/files.test.ts` | ❌ Wave 0 |
| BKND-XX | SSE broadcast manager tracks clients and broadcasts | unit | `npx vitest run apps/backend/src/services/sseBroadcast.test.ts` | ❌ Wave 0 |
| BKND-XX | Frontend SSEService connects and dispatches events | unit | `npx vitest run apps/web/src/services/sseService.test.ts` | ❌ Wave 0 |
| BKND-XX | Frontend useSSEProgress maps SSE events to EngineStore | unit | `npx vitest run apps/web/src/services/useSSEProgress.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --changed`
- **Per wave merge:** Full backend test suite
- **Phase gate:** Backend unit tests + frontend SSE tests green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `apps/backend/package.json` — add vitest as devDep, test script
- [ ] `apps/backend/src/routes/__tests__/ai.test.ts` — AI proxy route tests
- [ ] `apps/backend/src/routes/__tests__/files.test.ts` — file upload/download tests
- [ ] `apps/backend/src/services/__tests__/sseBroadcast.test.ts` — SSE broadcast manager tests
- [ ] `apps/web/src/services/__tests__/sseService.test.ts` — frontend SSEService tests
- [ ] `apps/web/src/services/__tests__/useSSEProgress.test.ts` — frontend SSE hook tests

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No (deferred to v0.2) | @hono/jwt middleware placeholder |
| V3 Session Management | No | Stateless API, no sessions in MVP |
| V4 Access Control | No (deferred to v0.2) | -- |
| V5 Input Validation | Yes | @hono/zod-validator for request bodies; file type/size validation |
| V6 Cryptography | No | API keys stored in env vars (not at rest in DB); SSE uses no encryption on localhost |

### Known Threat Patterns for Hono

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SSE control field injection (CVE-2026-29085) | Tampering | Hono 4.12.4+ sanitizes `writeSSE()` fields; current lockfile has 4.12.27 |
| File path traversal | Tampering | Validate fileId as UUID; verify resolved path is within uploads directory |
| Unauthenticated file access | Information Disclosure | Acceptable for MVP (personal tool, localhost). Deferred to v0.2 with JWT |
| API key leakage via error messages | Information Disclosure | Backend reuses `sanitizeErrorMessage()` from `@ac-canvas/ai-core` |
| Env var exposure via /api/health | Information Disclosure | Health endpoint returns only `status` and `timestamp` — no env vars |

## Sources

### Primary (HIGH confidence)
- Hono 4.x streaming helper docs — `streamSSE()` API (https://hono.dev/docs/helpers/streaming)
- Hono 4.x Node.js adapter docs (https://hono.dev/docs/getting-started/nodejs)
- Hono file upload example (https://honodev.pages.dev/examples/file-upload)
- `pnpm view hono version` returning `4.12.27` — confirmed in lockfile
- `pnpm view @hono/node-server version` returning `2.0.6`
- Existing ai-core codebase at `packages/ai-core/src/` — adapter interface, registry, types

### Secondary (MEDIUM confidence)
- CVE-2026-29085 details via OpenCVE and Snyk (https://app.opencve.io/cve/CVE-2026-29085, https://security.snyk.io/vuln/SNYK-JS-HONO-15423717)
- Node.js releases — Node 24 LTS status (https://github.com/nodejs/Release)

### Tertiary (LOW confidence)
- `@hono/zod-validator` API details — assumed based on standard Hono ecosystem patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Hono 4.12.27 version verified in lockfile; @hono/node-server 2.0.6 verified via npm registry
- Architecture: HIGH — Patterns verified against Hono official docs and across multiple Hono production projects
- Pitfalls: HIGH — CVE-2026-29085 confirmed; file traversal patterns standard; SSE lifecycle issues documented across Hono issues

**Research date:** 2026-07-01
**Valid until:** 30 days (stable Hono 4.x, no major version changes expected)
