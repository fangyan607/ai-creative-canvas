// ---------------------------------------------------------------------------
// SseBroadcastManager Tests
// ---------------------------------------------------------------------------

import { describe, it, expect, vi } from 'vitest'
import { SseBroadcastManager, type SseEvent } from '../sseBroadcast'

function makeTestEvent(overrides: Partial<SseEvent> = {}): SseEvent {
  return {
    type: 'progress',
    taskId: 'task-1',
    nodeId: 'node-1',
    providerId: 'mock',
    percent: 50,
    stage: 'generating',
    timestamp: Date.now(),
    ...overrides,
  }
}

describe('SseBroadcastManager', () => {
  beforeEach(() => {
    SseBroadcastManager.getInstance().clear()
  })

  it('getInstance returns the same instance (singleton)', () => {
    const a = SseBroadcastManager.getInstance()
    const b = SseBroadcastManager.getInstance()
    expect(a).toBe(b)
  })

  it('addClient adds a client and clientCount increments', () => {
    const mgr = SseBroadcastManager.getInstance()
    const cb = vi.fn()
    mgr.addClient('client-1', cb)
    expect(mgr.clientCount).toBe(1)
  })

  it('removeClient removes a client and clientCount decrements', () => {
    const mgr = SseBroadcastManager.getInstance()
    const cb = vi.fn()
    mgr.addClient('client-1', cb)
    mgr.removeClient('client-1')
    expect(mgr.clientCount).toBe(0)
  })

  it('broadcast calls all registered client callbacks with the correct event', () => {
    const mgr = SseBroadcastManager.getInstance()
    const cb1 = vi.fn()
    const cb2 = vi.fn()
    mgr.addClient('c1', cb1)
    mgr.addClient('c2', cb2)

    const event = makeTestEvent()
    mgr.broadcast(event)

    expect(cb1).toHaveBeenCalledWith(event)
    expect(cb2).toHaveBeenCalledWith(event)
  })

  it('broadcast with no clients does not throw', () => {
    const mgr = SseBroadcastManager.getInstance()
    const event = makeTestEvent()
    expect(() => mgr.broadcast(event)).not.toThrow()
  })

  it('broadcast skips clients whose callback throws', () => {
    const mgr = SseBroadcastManager.getInstance()
    const throwingCb = vi.fn().mockImplementation(() => {
      throw new Error('client disconnected')
    })
    const goodCb = vi.fn()
    mgr.addClient('thrower', throwingCb)
    mgr.addClient('good', goodCb)

    const event = makeTestEvent()
    mgr.broadcast(event)

    // Throwing client should have been removed
    expect(mgr.clientCount).toBe(1)
    // Good client should have received the event
    expect(goodCb).toHaveBeenCalledWith(event)
  })
})
