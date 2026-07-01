// ---------------------------------------------------------------------------
// SSE Route — Global SSE endpoint at GET /api/sse/progress
// ---------------------------------------------------------------------------
// Uses streamSSE with a per-client event queue and polling loop (avoids
// the external-writeSSE-ref assumption). All AI progress, error, and done
// events are broadcast over this single connection, differentiated by
// taskId/nodeId in the event payload (per D-02/D-03).
// ---------------------------------------------------------------------------

import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { SseBroadcastManager, type SseEvent } from '../services/sseBroadcast'

export const sseRouter = new Hono()

const sseManager = SseBroadcastManager.getInstance()

sseRouter.get('/progress', async (c) => {
  const clientId = crypto.randomUUID()

  return streamSSE(c, async (stream) => {
    // Per-client event queue: callbacks push events here
    const queue: SseEvent[] = []

    // Register client callback that pushes to the queue
    sseManager.addClient(clientId, (event) => {
      queue.push(event)
    })

    // Send initial connected event
    await stream.writeSSE({
      event: 'connected',
      data: JSON.stringify({ clientId, timestamp: Date.now() }),
    })

    // Clean up on client disconnect
    stream.onAbort(() => {
      sseManager.removeClient(clientId)
    })

    // Polling loop: drain queue every 100ms
    // This avoids the external-writeSSE-ref assumption from Research Assumption A1
    while (true) {
      while (queue.length > 0) {
        const event = queue.shift()!
        try {
          await stream.writeSSE({
            event: event.type,
            data: JSON.stringify(event),
          })
        } catch {
          sseManager.removeClient(clientId)
          return
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  })
})
