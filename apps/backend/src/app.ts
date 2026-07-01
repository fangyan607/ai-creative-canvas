// ---------------------------------------------------------------------------
// Hono App Factory — mounts all routers and registers AI adapters
// ---------------------------------------------------------------------------

import { Hono } from 'hono'
import { AdapterRegistry } from '@ac-canvas/ai-core'
import { MockAdapter } from '@ac-canvas/ai-core/adapters/mock.adapter'
import { OpenAiAdapter } from '@ac-canvas/ai-core/adapters/openai.adapter'
import { StabilityAdapter } from '@ac-canvas/ai-core/adapters/stability.adapter'

import { aiRouter } from './routes/ai'
import { filesRouter } from './routes/files'
import { sseRouter } from './routes/sse'

// Register all supported AI adapters at factory time
const registry = AdapterRegistry.getInstance()
registry.register(MockAdapter)     // providerId: 'mock'
registry.register(OpenAiAdapter)   // providerId: 'openai'
registry.register(StabilityAdapter) // providerId: 'stability'

export function createApp(): Hono {
  const app = new Hono()

  // Health check — returns only status and timestamp (T-06-04)
  app.get('/api/health', (c) => {
    return c.json({ status: 'ok', timestamp: Date.now() })
  })

  // Mount route modules
  app.route('/api/ai', aiRouter)
  app.route('/api/files', filesRouter)
  app.route('/api/sse', sseRouter)

  return app
}
