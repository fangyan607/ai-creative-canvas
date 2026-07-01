// ---------------------------------------------------------------------------
// AI Proxy Route Tests
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { AdapterRegistry } from '@ac-canvas/ai-core'
import { MockAdapter } from '@ac-canvas/ai-core/adapters/mock.adapter'
import { createApp } from '../../app'

const app = createApp()

describe('POST /api/ai/generate', () => {
  beforeAll(() => {
    // Register a MockAdapter in fallback mode for Node.js test compatibility
    // (manual mode requires OffscreenCanvas which is not available in Node)
    class FallbackMockAdapter extends MockAdapter {
      constructor(options?: Record<string, unknown>) {
        super({ ...(options || {}), mode: 'fallback' } as any)
      }
    }

    const registry = AdapterRegistry.getInstance()
    registry.clear()
    registry.register(FallbackMockAdapter)
  })

  afterAll(() => {
    // Restore default adapters
    const registry = AdapterRegistry.getInstance()
    registry.clear()
    registry.register(MockAdapter)
  })

  it('returns 400 when body is empty (missing providerId)', async () => {
    const res = await app.request('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('error', 'providerId is required')
  })

  it('returns 400 for unknown providerId', async () => {
    const res = await app.request('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: 'unknown-provider' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('error')
    expect(body.error).toContain('Unknown provider')
  })

  it('returns 200 with MockAdapter (JSON mode)', async () => {
    const res = await app.request('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerId: 'mock',
        params: { prompt: 'test', width: 512, height: 512 },
      }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('success', true)
    expect(body).toHaveProperty('taskId')
    expect(body).toHaveProperty('result')
    expect(body.result).toHaveProperty('imageBlobId')
    expect(body.result).toHaveProperty('width')
    expect(body.result).toHaveProperty('height')
    expect(body.result).toHaveProperty('model')
    expect(body.result).toHaveProperty('timing')
  })

  it('returns SSE stream when Accept header includes text/event-stream', async () => {
    const res = await app.request('/api/ai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        providerId: 'mock',
        params: { prompt: 'test', width: 512, height: 512 },
      }),
    })
    expect(res.status).toBe(200)
    const contentType = res.headers.get('Content-Type')
    expect(contentType).toContain('text/event-stream')
  })

  it('returns 400 for empty string providerId', async () => {
    const res = await app.request('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: '', params: { prompt: 'test' } }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('error', 'providerId is required')
  })
})
