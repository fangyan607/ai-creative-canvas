// ---------------------------------------------------------------------------
// useSSEProgress tests
//
// Tests the React hook that maps SSE events to EngineStore actions.
// Uses @testing-library/react renderHook for rendering and a mock EventSource
// for event simulation.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEngineStore } from '../../stores/engineStore'

// ---------------------------------------------------------------------------
// Mock EventSource
// ---------------------------------------------------------------------------

let lastMockEventSource: MockEventSource | null = null

class MockEventSource {
  readonly url: string
  onopen: ((event: Event) => void) | null = null
  onerror: ((event: Event | string) => void) | null = null
  private listeners: Array<{ type: string; handler: EventListenerOrEventListenerObject }> = []

  constructor(url: string) {
    this.url = url
    lastMockEventSource = this
  }

  addEventListener(type: string, handler: EventListenerOrEventListenerObject): void {
    this.listeners.push({ type, handler })
  }

  triggerEvent(type: string, data: string): void {
    const listener = this.listeners.find((l) => l.type === type)
    if (listener) {
      const event = new MessageEvent(type, { data })
      if (typeof listener.handler === 'function') {
        listener.handler(event)
      }
    }
  }

  close(): void {
    this.onopen = null
    this.onerror = null
    this.listeners = []
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  lastMockEventSource = null
  ;(globalThis as any).EventSource = MockEventSource
  useEngineStore.getState().clearAll()
})

afterEach(() => {
  delete (globalThis as any).EventSource
  lastMockEventSource = null
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useSSEProgress', () => {
  it('registers progress handler that calls setNodeStatus', async () => {
    const mod = await import('../../services/useSSEProgress')
    mod.__setProxyMode('proxy')
    mod.initSSE()
    renderHook(() => mod.useSSEProgress())

    act(() => {
      lastMockEventSource!.triggerEvent('progress', JSON.stringify({
        type: 'progress',
        taskId: 'task-1',
        nodeId: 'node-1',
        providerId: 'openai',
        percent: 45,
        stage: 'generating',
        timestamp: Date.now(),
      }))
    })

    expect(useEngineStore.getState().nodeStatus['node-1']).toBe('executing')
    mod.__resetSSESingleton()
    mod.__setProxyMode(undefined)
  })

  it('registers error handler that calls setNodeStatus and setNodeError', async () => {
    const mod = await import('../../services/useSSEProgress')
    mod.__setProxyMode('proxy')
    mod.initSSE()
    renderHook(() => mod.useSSEProgress())

    act(() => {
      lastMockEventSource!.triggerEvent('error', JSON.stringify({
        type: 'error',
        taskId: 'task-1',
        nodeId: 'node-2',
        providerId: 'openai',
        code: 'rate_limited',
        message: 'Rate limit exceeded',
        timestamp: Date.now(),
      }))
    })

    expect(useEngineStore.getState().nodeStatus['node-2']).toBe('error')
    expect(useEngineStore.getState().nodeErrors['node-2']).toBe('Rate limit exceeded')
    mod.__resetSSESingleton()
    mod.__setProxyMode(undefined)
  })

  it('registers done handler that calls setNodeStatus', async () => {
    const mod = await import('../../services/useSSEProgress')
    mod.__setProxyMode('proxy')
    mod.initSSE()
    renderHook(() => mod.useSSEProgress())

    act(() => {
      lastMockEventSource!.triggerEvent('done', JSON.stringify({
        type: 'done',
        taskId: 'task-1',
        nodeId: 'node-3',
        providerId: 'openai',
        result: { imageBlobId: 'blob-1', width: 1024, height: 1024 },
        timestamp: Date.now(),
      }))
    })

    expect(useEngineStore.getState().nodeStatus['node-3']).toBe('done')
    mod.__resetSSESingleton()
    mod.__setProxyMode(undefined)
  })

  it('cleanup unsubscribes handlers on unmount', async () => {
    const mod = await import('../../services/useSSEProgress')
    mod.__setProxyMode('proxy')
    mod.initSSE()
    const { unmount } = renderHook(() => mod.useSSEProgress())

    unmount()
    useEngineStore.getState().clearAll()

    act(() => {
      lastMockEventSource!.triggerEvent('progress', JSON.stringify({
        type: 'progress',
        taskId: 'task-1',
        nodeId: 'node-4',
        providerId: 'openai',
        percent: 50,
        stage: 'generating',
        timestamp: Date.now(),
      }))
    })

    expect(useEngineStore.getState().nodeStatus['node-4']).toBeUndefined()
    mod.__resetSSESingleton()
    mod.__setProxyMode(undefined)
  })

  it('is no-op in direct mode', async () => {
    const mod = await import('../../services/useSSEProgress')
    mod.__setProxyMode('direct')

    mod.initSSE()
    expect(lastMockEventSource).toBeNull()

    renderHook(() => mod.useSSEProgress())
    expect(useEngineStore.getState().nodeStatus).toEqual({})

    mod.__resetSSESingleton()
    mod.__setProxyMode(undefined)
  })
})

describe('initSSE', () => {
  it('creates SSEService only once (singleton pattern)', async () => {
    const mod = await import('../../services/useSSEProgress')
    mod.__setProxyMode('proxy')

    mod.initSSE()
    expect(lastMockEventSource).not.toBeNull()
    const firstUrl = lastMockEventSource!.url

    lastMockEventSource = null
    mod.initSSE()
    expect(lastMockEventSource).toBeNull()
    expect(firstUrl).toBe('/api/sse/progress')

    mod.__resetSSESingleton()
    mod.__setProxyMode(undefined)
  })
})
