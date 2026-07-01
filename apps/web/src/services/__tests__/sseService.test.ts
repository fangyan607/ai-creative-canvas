// ---------------------------------------------------------------------------
// SSEService tests
//
// Uses Vitest with jsdom environment. Mocks the global EventSource API to
// test connection lifecycle and event dispatch without a real backend.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock EventSource
// ---------------------------------------------------------------------------

interface MockEventListener {
  type: string
  handler: EventListenerOrEventListenerObject
}

class MockEventSource {
  readonly url: string
  onopen: ((event: Event) => void) | null = null
  onerror: ((event: Event | string) => void) | null = null
  private listeners: MockEventListener[] = []

  constructor(url: string) {
    this.url = url
    // Track the last created instance for test control
    lastMockEventSource = this

    // Use setTimeout to simulate async open (like real EventSource)
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 0)
  }

  addEventListener(type: string, handler: EventListenerOrEventListenerObject): void {
    this.listeners.push({ type, handler })
  }

  /** Test helper: simulate an incoming SSE event */
  triggerEvent(type: string, data: string): void {
    const listener = this.listeners.find((l) => l.type === type)
    if (listener) {
      const event = new MessageEvent(type, { data })
      if (typeof listener.handler === 'function') {
        listener.handler(event)
      }
    }
  }

  /** Test helper: simulate onerror */
  triggerError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'))
    }
  }

  close(): void {
    this.onopen = null
    this.onerror = null
    this.listeners = []
  }
}

// Store reference to the last created MockEventSource for test control
let lastMockEventSource: MockEventSource | null = null

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  lastMockEventSource = null

  // Replace global EventSource with our mock class
  ;(globalThis as any).EventSource = MockEventSource
})

afterEach(() => {
  // Clean up
  delete (globalThis as any).EventSource
  lastMockEventSource = null
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SSEService', () => {
  it('connects and sets up EventSource with the default URL', async () => {
    const { SSEService } = await import('../sseService')
    const service = new SSEService()
    service.connect()

    expect(lastMockEventSource).not.toBeNull()
    expect(lastMockEventSource!.url).toBe('/api/sse/progress')
    expect(service.isConnected()).toBe(true)
    service.disconnect()
  })

  it('connects and sets up EventSource with a custom URL', async () => {
    const { SSEService } = await import('../sseService')
    const service = new SSEService('/custom/endpoint')
    service.connect()

    expect(lastMockEventSource).not.toBeNull()
    expect(lastMockEventSource!.url).toBe('/custom/endpoint')
    service.disconnect()
  })

  it('dispatches progress events to registered handlers with parsed JSON payload', async () => {
    const { SSEService } = await import('../sseService')
    const service = new SSEService()
    const handler = vi.fn()

    service.on('progress', handler)
    service.connect()

    const payload = {
      type: 'progress',
      taskId: 'task-1',
      nodeId: 'node-1',
      providerId: 'openai',
      percent: 50,
      stage: 'generating',
      timestamp: Date.now(),
    }

    // Simulate incoming progress event
    lastMockEventSource!.triggerEvent('progress', JSON.stringify(payload))

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      type: 'progress',
      taskId: 'task-1',
      nodeId: 'node-1',
      percent: 50,
    }))

    service.disconnect()
  })

  it('dispatches error events to registered handlers', async () => {
    const { SSEService } = await import('../sseService')
    const service = new SSEService()
    const handler = vi.fn()

    service.on('error', handler)
    service.connect()

    const payload = {
      type: 'error',
      taskId: 'task-1',
      nodeId: 'node-1',
      providerId: 'openai',
      code: 'rate_limited',
      message: 'Rate limit exceeded',
      timestamp: Date.now(),
    }

    lastMockEventSource!.triggerEvent('error', JSON.stringify(payload))

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      type: 'error',
      code: 'rate_limited',
      message: 'Rate limit exceeded',
    }))

    service.disconnect()
  })

  it('dispatches done events to registered handlers', async () => {
    const { SSEService } = await import('../sseService')
    const service = new SSEService()
    const handler = vi.fn()

    service.on('done', handler)
    service.connect()

    const payload = {
      type: 'done',
      taskId: 'task-1',
      nodeId: 'node-1',
      providerId: 'openai',
      result: { imageBlobId: 'blob-1', width: 1024, height: 1024 },
      timestamp: Date.now(),
    }

    lastMockEventSource!.triggerEvent('done', JSON.stringify(payload))

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      type: 'done',
      result: expect.objectContaining({ imageBlobId: 'blob-1' }),
    }))

    service.disconnect()
  })

  it('on() returns an unsubscribe function that removes the handler', async () => {
    const { SSEService } = await import('../sseService')
    const service = new SSEService()
    const handler = vi.fn()

    const unsubscribe = service.on('progress', handler)
    service.connect()

    // First event — handler should be called
    lastMockEventSource!.triggerEvent('progress', JSON.stringify({
      type: 'progress', taskId: 't1', nodeId: 'n1', providerId: 'mock', timestamp: Date.now(),
    }))

    expect(handler).toHaveBeenCalledTimes(1)

    // Unsubscribe
    unsubscribe()

    // Second event — handler should NOT be called
    lastMockEventSource!.triggerEvent('progress', JSON.stringify({
      type: 'progress', taskId: 't2', nodeId: 'n2', providerId: 'mock', timestamp: Date.now(),
    }))

    expect(handler).toHaveBeenCalledTimes(1)

    service.disconnect()
  })

  it('isConnected() returns true after connect(), false after disconnect()', async () => {
    const { SSEService } = await import('../sseService')
    const service = new SSEService()

    expect(service.isConnected()).toBe(false)

    service.connect()
    expect(service.isConnected()).toBe(true)

    service.disconnect()
    expect(service.isConnected()).toBe(false)
  })

  it('handles malformed JSON in event data gracefully (does not throw)', async () => {
    const { SSEService } = await import('../sseService')
    const service = new SSEService()
    const handler = vi.fn()

    service.on('progress', handler)
    service.connect()

    // Malformed JSON should not cause an exception
    expect(() => {
      lastMockEventSource!.triggerEvent('progress', '{invalid json')
    }).not.toThrow()

    // Handler should not have been called
    expect(handler).toHaveBeenCalledTimes(0)

    // Valid JSON after malformed should still work
    lastMockEventSource!.triggerEvent('progress', JSON.stringify({
      type: 'progress', taskId: 't1', nodeId: 'n1', providerId: 'mock', timestamp: Date.now(),
    }))

    expect(handler).toHaveBeenCalledTimes(1)

    service.disconnect()
  })

  it('only creates one EventSource when connect() is called twice', async () => {
    const { SSEService } = await import('../sseService')
    const service = new SSEService()

    service.connect()
    service.connect() // second call should be no-op

    // Only one EventSource instance should have been created
    expect(lastMockEventSource).not.toBeNull()

    service.disconnect()
  })

  it('handles unknown event types gracefully', async () => {
    const { SSEService } = await import('../sseService')
    const service = new SSEService()
    service.connect()

    // Triggering an unregistered event type should not throw
    expect(() => {
      lastMockEventSource!.triggerEvent('unknown', JSON.stringify({ type: 'unknown', timestamp: Date.now() }))
    }).not.toThrow()

    service.disconnect()
  })

  it('handles empty handlers map gracefully for dispatch', async () => {
    const { SSEService } = await import('../sseService')
    const service = new SSEService()
    service.connect()

    // Dispatch with no handlers should not throw
    expect(() => {
      lastMockEventSource!.triggerEvent('progress', JSON.stringify({
        type: 'progress', taskId: 't1', nodeId: 'n1', providerId: 'mock', timestamp: Date.now(),
      }))
    }).not.toThrow()

    service.disconnect()
  })
})
