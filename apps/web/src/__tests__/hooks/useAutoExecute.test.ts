import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// All mocks must use vi.hoisted() so they are hoisted before vi.mock() calls
const { mockSubscribe, mockGetState, mockSetExecuting, mockSetNodeStatus, mockSetNodeError, mockExecute, mockGetNodeStatus } = vi.hoisted(() => {
  const s = vi.fn(() => () => {})
  const g = vi.fn()
  const se = vi.fn()
  const sn = vi.fn()
  const sne = vi.fn()
  const ex = vi.fn()
  const gns = vi.fn()
  return {
    mockSubscribe: s,
    mockGetState: g,
    mockSetExecuting: se,
    mockSetNodeStatus: sn,
    mockSetNodeError: sne,
    mockExecute: ex,
    mockGetNodeStatus: gns,
  }
})

vi.mock('../../stores/nodeGraphStore', () => ({
  useNodeGraphStore: {
    subscribe: (...args: any[]) => mockSubscribe(...args),
    getState: () => mockGetState(),
  },
}))

vi.mock('../../stores/engineStore', () => ({
  useEngineStore: {
    getState: () => ({
      setExecuting: mockSetExecuting,
      setNodeStatus: mockSetNodeStatus,
      setNodeError: mockSetNodeError,
    }),
  },
}))

vi.mock('../../engine/NodeEngine', () => ({
  NodeEngine: class {
    execute = mockExecute
    getNodeStatus = mockGetNodeStatus
  },
}))

vi.mock('../../engine/resolvers', () => ({
  createDefaultResolvers: vi.fn(() => new Map()),
}))

import { useAutoExecute } from '../../hooks/useAutoExecute'

describe('useAutoExecute', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockSubscribe.mockClear()
    mockGetState.mockClear()
    mockSetExecuting.mockClear()
    mockSetNodeStatus.mockClear()
    mockSetNodeError.mockClear()
    mockExecute.mockClear()
    mockGetNodeStatus.mockClear()

    // Default store state
    mockGetState.mockReturnValue({
      nodes: [
        { id: 'a', type: 'prompt' as any, position: { x: 0, y: 0 }, data: {} },
        { id: 'b', type: 'preview' as any, position: { x: 100, y: 0 }, data: {} },
      ],
      edges: [{ source: 'a', target: 'b' }],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('subscribes to NodeGraphStore on mount', () => {
    const { unmount } = renderHook(() => useAutoExecute())
    expect(mockSubscribe).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('calls setExecuting(true) before execution and setExecuting(false) after', async () => {
    mockExecute.mockResolvedValue({
      success: true,
      executedNodes: ['a', 'b'],
    })
    mockGetNodeStatus.mockReturnValue('done')

    renderHook(() => useAutoExecute())

    // Store subscription callback
    const storeCallback = mockSubscribe.mock.calls[0][0]
    storeCallback()

    // Fast-forward 180ms debounce
    vi.advanceTimersByTime(180)

    // Wait for async execute
    await vi.waitFor(() => {
      expect(mockSetExecuting).toHaveBeenCalledWith(true)
    })
    await vi.waitFor(() => {
      expect(mockSetExecuting).toHaveBeenCalledWith(false)
    })
  })

  it('passes nodes and edges from store to engine.execute', async () => {
    mockExecute.mockResolvedValue({
      success: true,
      executedNodes: ['a', 'b'],
    })

    renderHook(() => useAutoExecute())

    const storeCallback = mockSubscribe.mock.calls[0][0]
    storeCallback()
    vi.advanceTimersByTime(180)

    await vi.waitFor(() => {
      expect(mockExecute).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'a' }),
          expect.objectContaining({ id: 'b' }),
        ]),
        expect.arrayContaining([
          expect.objectContaining({ source: 'a', target: 'b' }),
        ]),
      )
    })
  })

  it('syncs node status to EngineStore after successful execution', async () => {
    mockExecute.mockResolvedValue({
      success: true,
      executedNodes: ['a', 'b'],
    })
    mockGetNodeStatus.mockReturnValue('done')

    renderHook(() => useAutoExecute())

    const storeCallback = mockSubscribe.mock.calls[0][0]
    storeCallback()
    vi.advanceTimersByTime(180)

    await vi.waitFor(() => {
      expect(mockSetNodeStatus).toHaveBeenCalledWith('a', 'done')
      expect(mockSetNodeStatus).toHaveBeenCalledWith('b', 'done')
    })
  })

  it('calls setExecuting(false) even when engine throws', async () => {
    mockExecute.mockRejectedValue(new Error('Engine crash'))

    renderHook(() => useAutoExecute())

    const storeCallback = mockSubscribe.mock.calls[0][0]
    storeCallback()
    vi.advanceTimersByTime(180)

    await vi.waitFor(() => {
      expect(mockSetExecuting).toHaveBeenCalledWith(false)
    })
  })

  it('cleans up debounce timeout on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
    const { unmount } = renderHook(() => useAutoExecute())

    // Trigger a store change that schedules a debounced execute
    const storeCallback = mockSubscribe.mock.calls[0][0]
    storeCallback()

    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })

  it('skips execution when no nodes exist in store', async () => {
    // Override getState for this test to return empty nodes
    mockGetState.mockReturnValueOnce({
      nodes: [],
      edges: [],
    })

    renderHook(() => useAutoExecute())

    const storeCallback = mockSubscribe.mock.calls[0][0]
    storeCallback()
    vi.advanceTimersByTime(180)

    // No execution should happen
    expect(mockSetExecuting).not.toHaveBeenCalled()
  })
})
