import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock the stores before importing the tested module
// ---------------------------------------------------------------------------

const mockCanvasSerialize = vi.fn()
const mockCanvasLoadSerialized = vi.fn()
const mockNodeGraphSerialize = vi.fn()
const mockNodeGraphLoadSerialized = vi.fn()

vi.mock('../../stores/canvasStore', () => ({
  useCanvasStore: {
    getState: vi.fn(() => ({
      serialize: mockCanvasSerialize,
      loadSerialized: mockCanvasLoadSerialized,
    })),
    subscribe: vi.fn((_selector: any) => {
      // Return unsubscribe function
      return vi.fn()
    }),
  },
}))

vi.mock('../../stores/nodeGraphStore', () => ({
  useNodeGraphStore: {
    getState: vi.fn(() => ({
      serialize: mockNodeGraphSerialize,
      loadSerialized: mockNodeGraphLoadSerialized,
    })),
    subscribe: vi.fn((_selector: any) => {
      return vi.fn()
    }),
  },
}))

// ---------------------------------------------------------------------------
// Import after mocks are set up
// ---------------------------------------------------------------------------

import { useHistoryStore } from '../../stores/historyStore'

describe('HistoryStore — unified undo/redo with node graph', () => {
  const mockCanvasState = {
    elements: [{ id: 'el-1', type: 'rectangle' }],
    viewport: { x: 0, y: 0, zoom: 1 },
  }

  const mockNodeGraphState = {
    nodes: [
      { id: 'node-1', type: 'prompt', position: { x: 100, y: 200 }, data: { nodeType: 'prompt', prompt: 'hello', params: [] } },
    ],
    edges: [],
  }

  beforeEach(() => {
    vi.useFakeTimers()
    // Reset history store
    useHistoryStore.getState().clear()
    // Reset mocks
    vi.clearAllMocks()

    // Default mock implementations
    mockCanvasSerialize.mockReturnValue(mockCanvasState)
    mockNodeGraphSerialize.mockReturnValue(mockNodeGraphState)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should capture snapshot with both canvas and node graph state', () => {
    useHistoryStore.getState().captureSnapshot()

    const state = useHistoryStore.getState()
    expect(state.snapshots).toHaveLength(1)
    expect(state.currentIndex).toBe(0)

    const snapshot = state.snapshots[0]
    expect(snapshot.canvas).toEqual(mockCanvasState)
    expect(snapshot.nodeGraph).toEqual(mockNodeGraphState)

    expect(mockCanvasSerialize).toHaveBeenCalledOnce()
    expect(mockNodeGraphSerialize).toHaveBeenCalledOnce()
  })

  it('should restore both canvas and node graph on undo', () => {
    // Capture initial state
    useHistoryStore.getState().captureSnapshot()

    // Advance time past the merge window so the next call appends rather than replaces
    vi.advanceTimersByTime(200)

    // Simulate a change to both stores for the second snapshot
    const changedCanvas = {
      elements: [{ id: 'el-2', type: 'text' }],
      viewport: { x: 100, y: 0, zoom: 1.5 },
    }
    const changedNodeGraph = {
      nodes: [
        { id: 'node-2', type: 'text-to-image', position: { x: 0, y: 0 }, data: { nodeType: 'text-to-image', prompt: 'changed', width: 1024, height: 1024, model: 'dall-e-3', seed: -1, params: [] } },
      ],
      edges: [],
    }

    mockCanvasSerialize.mockReturnValue(changedCanvas)
    mockNodeGraphSerialize.mockReturnValue(changedNodeGraph)

    // Advance time to ensure merge window passes for the debounce check
    vi.advanceTimersByTime(200)
    useHistoryStore.getState().captureSnapshot()
    expect(useHistoryStore.getState().currentIndex).toBe(1)

    // Undo should restore the first snapshot (canvas + nodeGraph)
    vi.clearAllMocks()
    useHistoryStore.getState().undo()

    expect(mockCanvasLoadSerialized).toHaveBeenCalledWith(mockCanvasState)
    expect(mockNodeGraphLoadSerialized).toHaveBeenCalledWith(mockNodeGraphState)
    expect(useHistoryStore.getState().currentIndex).toBe(0)
  })

  it('should restore both canvas and node graph on redo', () => {
    // Capture first state
    useHistoryStore.getState().captureSnapshot()

    // Advance time past merge window
    vi.advanceTimersByTime(200)

    // Change state and capture second
    const changedCanvas = {
      elements: [{ id: 'el-2', type: 'text' }],
      viewport: { x: 100, y: 0, zoom: 1.5 },
    }
    const changedNodeGraph = {
      nodes: [{ id: 'node-2', type: 'text-to-image', position: { x: 0, y: 0 }, data: { nodeType: 'text-to-image', prompt: 'changed', width: 1024, height: 1024, model: 'dall-e-3', seed: -1, params: [] } }],
      edges: [],
    }

    mockCanvasSerialize.mockReturnValue(changedCanvas)
    mockNodeGraphSerialize.mockReturnValue(changedNodeGraph)

    vi.advanceTimersByTime(200)
    useHistoryStore.getState().captureSnapshot()
    expect(useHistoryStore.getState().currentIndex).toBe(1)

    // Undo once to go back
    vi.clearAllMocks()
    useHistoryStore.getState().undo()

    // Redo should restore the second snapshot
    vi.clearAllMocks()
    useHistoryStore.getState().redo()

    expect(mockCanvasLoadSerialized).toHaveBeenCalledWith(changedCanvas)
    expect(mockNodeGraphLoadSerialized).toHaveBeenCalledWith(changedNodeGraph)
    expect(useHistoryStore.getState().currentIndex).toBe(1)
  })

  it('should handle backward compatibility — merges correctly when nodeGraph present', () => {
    // Capture two snapshots with time separation
    useHistoryStore.getState().captureSnapshot()
    vi.advanceTimersByTime(200)

    const changedCanvas = {
      elements: [{ id: 'el-2', type: 'text' }],
      viewport: { x: 100, y: 0, zoom: 1.5 },
    }
    const changedNodeGraph = {
      nodes: [{ id: 'node-2', type: 'merge', position: { x: 50, y: 50 }, data: { nodeType: 'merge', blendMode: 'multiply', params: [] } }],
      edges: [],
    }
    mockCanvasSerialize.mockReturnValue(changedCanvas)
    mockNodeGraphSerialize.mockReturnValue(changedNodeGraph)

    vi.advanceTimersByTime(200)
    useHistoryStore.getState().captureSnapshot()

    expect(useHistoryStore.getState().snapshots).toHaveLength(2)
  })
})
