import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// Use vi.hoisted for all mock variables to handle vi.mock hoisting
const { mockCanvasSubscribe, mockNodeGraphSubscribe, mockCanvasGetState, mockNodeGraphGetState, mockProjectUpdate } = vi.hoisted(() => {
  const cs = vi.fn(() => () => {})
  const ns = vi.fn(() => () => {})
  const cg = vi.fn()
  const ng = vi.fn()
  const pu = vi.fn()
  return {
    mockCanvasSubscribe: cs,
    mockNodeGraphSubscribe: ns,
    mockCanvasGetState: cg,
    mockNodeGraphGetState: ng,
    mockProjectUpdate: pu,
  }
})

vi.mock('../../stores/canvasStore', () => ({
  useCanvasStore: {
    subscribe: (...args: any[]) => mockCanvasSubscribe(...args),
    getState: () => mockCanvasGetState(),
  },
}))

vi.mock('../../stores/nodeGraphStore', () => ({
  useNodeGraphStore: {
    subscribe: (...args: any[]) => mockNodeGraphSubscribe(...args),
    getState: () => mockNodeGraphGetState(),
  },
}))

vi.mock('../../indexedb/projectService', () => ({
  projectService: {
    update: (...args: any[]) => mockProjectUpdate(...args),
  },
}))

import { useAutoSave } from '../../hooks/useAutoSave'

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockCanvasSubscribe.mockClear()
    mockNodeGraphSubscribe.mockClear()
    mockCanvasGetState.mockClear()
    mockNodeGraphGetState.mockClear()
    mockProjectUpdate.mockClear()

    // Default serialized state
    mockCanvasGetState.mockReturnValue({
      serialize: () => ({
        elements: [{ id: 'el1', type: 'rectangle', x: 0, y: 0 }],
        viewport: { x: 0, y: 0, zoom: 1 },
      }),
    })
    mockNodeGraphGetState.mockReturnValue({
      serialize: () => ({
        nodes: [{ id: 'n1', type: 'prompt', position: { x: 0, y: 0 } }],
        edges: [],
      }),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('subscribes to both stores when projectId is provided', () => {
    renderHook(() => useAutoSave(42))
    expect(mockCanvasSubscribe).toHaveBeenCalledTimes(1)
    expect(mockNodeGraphSubscribe).toHaveBeenCalledTimes(1)
  })

  it('does NOT subscribe when projectId is null', () => {
    renderHook(() => useAutoSave(null))
    expect(mockCanvasSubscribe).not.toHaveBeenCalled()
    expect(mockNodeGraphSubscribe).not.toHaveBeenCalled()
  })

  it('calls projectService.update after debounce when store changes', async () => {
    mockProjectUpdate.mockResolvedValue(undefined)

    renderHook(() => useAutoSave(42))

    // Trigger a store change via the subscribe callback
    const canvasCb = mockCanvasSubscribe.mock.calls[0][0]
    canvasCb()

    // Fast-forward 180ms debounce
    vi.advanceTimersByTime(180)

    await vi.waitFor(() => {
      expect(mockProjectUpdate).toHaveBeenCalledTimes(1)
    })
  })

  it('passes correct data to projectService.update', async () => {
    mockProjectUpdate.mockResolvedValue(undefined)

    const testState = {
      serialize: () => ({
        elements: [{ id: 'test-el', type: 'rectangle' }],
        viewport: { x: 100, y: 200, zoom: 1.5 },
      }),
    }
    mockCanvasGetState.mockReturnValue(testState)
    mockNodeGraphGetState.mockReturnValue({
      serialize: () => ({
        nodes: [{ id: 'n1', type: 'prompt', position: { x: 0, y: 0 } }],
        edges: [{ source: 'n1', target: 'n2' }],
      }),
    })

    renderHook(() => useAutoSave(42))

    const canvasCb = mockCanvasSubscribe.mock.calls[0][0]
    canvasCb()
    vi.advanceTimersByTime(180)

    await vi.waitFor(() => {
      expect(mockProjectUpdate).toHaveBeenCalledWith(
        42,
        expect.objectContaining({
          canvasState: expect.any(String),
          viewport: expect.any(String),
          nodeGraph: expect.any(String),
        }),
      )
    })

    // Verify the JSON strings contain the serialized data
    const updateArg = mockProjectUpdate.mock.calls[0][1]
    expect(() => JSON.parse(updateArg.canvasState)).not.toThrow()
    expect(() => JSON.parse(updateArg.viewport)).not.toThrow()
    expect(() => JSON.parse(updateArg.nodeGraph)).not.toThrow()
  })

  it('skips save when serialized state matches lastSaved snapshot', async () => {
    mockProjectUpdate.mockResolvedValue(undefined)

    renderHook(() => useAutoSave(42))

    // First trigger — should save (no previous snapshot)
    const canvasCb = mockCanvasSubscribe.mock.calls[0][0]
    canvasCb()
    vi.advanceTimersByTime(180)

    await vi.waitFor(() => {
      expect(mockProjectUpdate).toHaveBeenCalledTimes(1)
    })

    // Second trigger with same state — should NOT save (snapshot matches)
    canvasCb()
    vi.advanceTimersByTime(180)

    // Give any pending promises to resolve
    await vi.advanceTimersByTimeAsync(0)

    // Update should still be called only once (second call skipped by no-change guard)
    expect(mockProjectUpdate).toHaveBeenCalledTimes(1)
  })

  it('cleans up subscriptions and debounce on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
    const { unmount } = renderHook(() => useAutoSave(42))

    // Trigger store change
    const canvasCb = mockCanvasSubscribe.mock.calls[0][0]
    canvasCb()

    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })
})
