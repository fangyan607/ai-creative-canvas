// ---------------------------------------------------------------------------
// AI Proxy Route — POST /api/ai/generate
// ---------------------------------------------------------------------------
// Uses @ac-canvas/ai-core AdapterRegistry to look up adapters, reads API
// keys from server env vars (never from client input), and supports both
// JSON and SSE streaming response modes.
// ---------------------------------------------------------------------------

import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { AdapterRegistry } from '@ac-canvas/ai-core'
import type { AiAdapter } from '@ac-canvas/ai-core'
import { sanitizeErrorMessage } from '@ac-canvas/ai-core/interfaces/types'
import { config } from '../config'
import { getExtension, fileMetadata } from '../services/fileStore'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const aiRouter = new Hono()

aiRouter.post('/generate', async (c) => {
  // Parse request body
  const body = await c.req.json() as {
    providerId?: string
    params?: Record<string, unknown>
    __nodeId?: string
  }

  const providerId = body.providerId
  const params = body.params ?? {}

  // Validate providerId
  if (!providerId) {
    return c.json({ error: 'providerId is required' }, 400)
  }

  // Look up adapter from registry
  const AdapterClass = AdapterRegistry.getInstance().get(providerId)
  if (!AdapterClass) {
    return c.json({ error: `Unknown provider: ${providerId}` }, 400)
  }

  // Read API key from env vars — never from client request
  const apiKey = config.aiKeys[providerId] ?? ''

  // Instantiate adapter per request (fresh instance — prevents state leak)
  const adapter = new AdapterClass({ apiKey }) as AiAdapter

  const taskId = crypto.randomUUID()
  const nodeId = (params.__nodeId as string) || taskId

  // Create onStoreImage callback that saves to local disk
  const onStoreImage = async (blob: Blob): Promise<string> => {
    const fileId = crypto.randomUUID()
    const dateStr = new Date().toISOString().slice(0, 10)
    const subDir = path.join(config.uploadDir, dateStr)
    await mkdir(subDir, { recursive: true })
    const ext = getExtension(blob.type)
    const filePath = path.join(subDir, `${fileId}${ext}`)
    const buffer = Buffer.from(await blob.arrayBuffer())
    await writeFile(filePath, buffer)
    fileMetadata.set(fileId, {
      id: fileId,
      originalName: `${fileId}${ext}`,
      mimeType: blob.type,
      size: buffer.length,
      path: filePath,
      uploadedAt: Date.now(),
    })
    return fileId
  }

  // Determine response mode from Accept header
  const acceptsSSE = c.req.header('Accept')?.includes('text/event-stream')

  if (acceptsSSE) {
    // SSE streaming response
    return streamSSE(c, async (stream) => {
      let result: Record<string, unknown> | null = null

      try {
        // Wire progress events to SSE stream
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

        // Done event will be written both by the adapter's 'done' event
        // and explicitly after execute() completes
        adapter.on('done', (data: Record<string, unknown>) => {
          result = data
          stream.writeSSE({
            event: 'done',
            data: JSON.stringify({
              type: 'done',
              taskId,
              nodeId,
              providerId,
              result: data,
              timestamp: Date.now(),
            }),
          }).catch(() => {})
        })

        stream.onAbort(() => {
          adapter.removeAllListeners()
        })

        // Execute the adapter
        const adapterResult = await adapter.execute(params, {}, onStoreImage)

        // If 'done' event already wrote the result, skip
        if (!result) {
          stream.writeSSE({
            event: 'done',
            data: JSON.stringify({
              type: 'done',
              taskId,
              nodeId,
              providerId,
              result: adapterResult,
              timestamp: Date.now(),
            }),
          }).catch(() => {})
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        stream.writeSSE({
          event: 'error',
          data: JSON.stringify({
            type: 'error',
            taskId,
            nodeId,
            providerId,
            message,
            timestamp: Date.now(),
          }),
        }).catch(() => {})
      } finally {
        adapter.removeAllListeners()
      }
    })
  }

  // Direct JSON response
  try {
    const result = await adapter.execute(params, {}, onStoreImage)
    return c.json({ success: true, taskId, result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json(
      { success: false, taskId, error: sanitizeErrorMessage(message) },
      500,
    )
  } finally {
    adapter.removeAllListeners()
  }
})
