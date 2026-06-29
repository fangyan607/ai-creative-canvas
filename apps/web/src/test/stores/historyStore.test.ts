import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useHistoryStore } from '../../stores/historyStore'
import { useCanvasStore } from '../../stores/canvasStore'

describe('HistoryStore', () => {
  beforeEach(() => {
    useHistoryStore.getState().clear()

    // Reset canvas store mock data
    useCanvasStore.setState({
      elements: {},
      viewport: { x: 0, y: 0, zoom: 1 },
      selectedElementIds: {},
      isDragging: false,
      elementOrder: [],
      excalidrawAPI: null,
    })
  })

  it('Test 10: captureSnapshot appends to snapshot stack', () => {
    expect(useHistoryStore.getState().snapshots.length).toBe(0)
    expect(useHistoryStore.getState().currentIndex).toBe(-1)

    useHistoryStore.getState().captureSnapshot()

    expect(useHistoryStore.getState().snapshots.length).toBe(1)
    expect(useHistoryStore.getState().currentIndex).toBe(0)
  })

  it('Test 11: undo restores previous state via CanvasStore.loadSerialized', () => {
    vi.useFakeTimers()
    const store = useHistoryStore.getState()
    const spy = vi.spyOn(useCanvasStore.getState(), 'loadSerialized')

    // Capture first snapshot
    store.captureSnapshot()
    vi.advanceTimersByTime(200) // exceed merge window

    // Make a change and capture second snapshot
    useCanvasStore.getState().setViewport({ x: 100, y: 100, zoom: 2 })
    store.captureSnapshot()

    expect(useHistoryStore.getState().snapshots.length).toBe(2)
    expect(useHistoryStore.getState().currentIndex).toBe(1)

    // Undo back to first snapshot
    spy.mockClear()
    useHistoryStore.getState().undo()

    expect(spy).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('Test 12: redo restores forward state', () => {
    vi.useFakeTimers()
    const store = useHistoryStore.getState()
    const spy = vi.spyOn(useCanvasStore.getState(), 'loadSerialized')

    // First snapshot
    store.captureSnapshot()
    vi.advanceTimersByTime(200) // exceed merge window
    // Second snapshot
    store.captureSnapshot()

    // Undo to first
    useHistoryStore.getState().undo()
    expect(useHistoryStore.getState().currentIndex).toBe(0)

    // Redo back to second
    spy.mockClear()
    useHistoryStore.getState().redo()

    expect(spy).toHaveBeenCalledTimes(1)
    expect(useHistoryStore.getState().currentIndex).toBe(1)
    vi.useRealTimers()
  })

  it('Test 13: rapid changes within 180ms merge window collapse into one snapshot', () => {
    const store = useHistoryStore.getState()

    // Capture first snapshot
    store.captureSnapshot()
    expect(useHistoryStore.getState().snapshots.length).toBe(1)

    // Rapidly capture more — they should merge into the same slot
    store.captureSnapshot()
    store.captureSnapshot()
    store.captureSnapshot()

    expect(useHistoryStore.getState().snapshots.length).toBe(1)
    expect(useHistoryStore.getState().currentIndex).toBe(0)
  })

  it('Test 14: setPaused(true) prevents captureSnapshot from creating entries', () => {
    useHistoryStore.getState().setPaused(true)

    useHistoryStore.getState().captureSnapshot()
    useHistoryStore.getState().captureSnapshot()

    expect(useHistoryStore.getState().snapshots.length).toBe(0)

    // Unpause and verify capturing works again
    useHistoryStore.getState().setPaused(false)
    useHistoryStore.getState().captureSnapshot()

    expect(useHistoryStore.getState().snapshots.length).toBe(1)
  })

  it('Test 15: snapshot stack does not exceed 50 entries', () => {
    // Capture 55 snapshots (needs time advancement to avoid merge window)
    const store = useHistoryStore.getState()

    // We'll manually override the merge window behavior by waiting >180ms
    // between captures using vi.advanceTimersByTime
    vi.useFakeTimers()

    for (let i = 0; i < 55; i++) {
      // This simulates manual time progression, but since the merge window
      // uses Date.now() internally, we need to advance time
      store.captureSnapshot()
      vi.advanceTimersByTime(200) // exceed the 180ms merge window
    }

    expect(useHistoryStore.getState().snapshots.length).toBeLessThanOrEqual(50)
    expect(useHistoryStore.getState().snapshots.length).toBe(50)

    vi.useRealTimers()
  })

  it('Test 16: clear() resets snapshots and currentIndex to -1', () => {
    const store = useHistoryStore.getState()
    store.captureSnapshot()
    store.captureSnapshot()
    expect(useHistoryStore.getState().snapshots.length).toBeGreaterThan(0)

    store.clear()

    expect(useHistoryStore.getState().snapshots.length).toBe(0)
    expect(useHistoryStore.getState().currentIndex).toBe(-1)
  })

  it('Test 17: undo at start of history (currentIndex <= 0) is a no-op', () => {
    useHistoryStore.getState().undo()

    expect(useHistoryStore.getState().currentIndex).toBe(-1)

    // Capture once, try undo when already at start
    useHistoryStore.getState().captureSnapshot()
    useHistoryStore.getState().undo()

    // Should be no-op since currentIndex === 0 and there's nothing before it
    expect(useHistoryStore.getState().currentIndex).toBe(0)
  })

  it('Test 18: redo at end of history is a no-op', () => {
    useHistoryStore.getState().captureSnapshot()

    // Try redo when at the end (currentIndex === 0, snapshots.length === 1)
    useHistoryStore.getState().redo()

    expect(useHistoryStore.getState().currentIndex).toBe(0)
  })
})
