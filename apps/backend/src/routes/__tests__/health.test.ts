// ---------------------------------------------------------------------------
// Health Endpoint Tests
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest'
import { createApp } from '../../app'

const app = createApp()

describe('GET /api/health', () => {
  it('returns 200 status', async () => {
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
  })

  it('returns body with status and timestamp (no extra fields)', async () => {
    const res = await app.request('/api/health')
    const body = await res.json()
    expect(body).toHaveProperty('status', 'ok')
    expect(body).toHaveProperty('timestamp')
    expect(typeof body.timestamp).toBe('number')
    // T-06-04: Must not expose env vars or config values
    expect(body).not.toHaveProperty('env')
    expect(body).not.toHaveProperty('keys')
    expect(body).not.toHaveProperty('config')
    expect(Object.keys(body)).toEqual(['status', 'timestamp'])
  })
})
