// ---------------------------------------------------------------------------
// Backend Entry Point — starts the Hono server on the configured port
// ---------------------------------------------------------------------------

import { serve } from '@hono/node-server'
import { createApp } from './app'
import { config } from './config'

const app = createApp()

console.log(`Backend server starting on http://localhost:${config.port}`)

serve({
  fetch: app.fetch,
  port: config.port,
})
