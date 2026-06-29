import { create } from 'zustand'
import { useCanvasStore } from './canvasStore'

interface HistorySnapshot {
  timestamp: number
  canvas: { elements: any[]; viewport: { x: number; y: number; zoom: number } }
}

export interface HistoryStoreState {
  snapshots: HistorySnapshot[]
  currentIndex: number
  maxSnapshots: number
  mergeWindow: number
  isPaused: boolean

  captureSnapshot: () => void
  undo: () => void
  redo: () => void
  setPaused: (paused: boolean) => void
  clear: () => void
}

export const useHistoryStore = create<HistoryStoreState>()((set, get) => ({
  snapshots: [],
  currentIndex: -1,
  maxSnapshots: 50,
  mergeWindow: 180,
  isPaused: false,

  captureSnapshot: () => {
    const state = get()
    if (state.isPaused) return

    const now = Date.now()
    const lastSnapshot = state.snapshots[state.currentIndex]

    // Debounce: within mergeWindow, replace (don't append)
    if (lastSnapshot && now - lastSnapshot.timestamp < state.mergeWindow) {
      const canvas = useCanvasStore.getState().serialize()
      set({
        snapshots: state.snapshots.map((s, i) =>
          i === state.currentIndex ? { timestamp: now, canvas } : s,
        ),
      })
      return
    }

    // Append new snapshot
    const snapshot: HistorySnapshot = {
      timestamp: now,
      canvas: structuredClone(useCanvasStore.getState().serialize()),
    }

    const nextSnapshots = [
      ...state.snapshots.slice(0, state.currentIndex + 1),
      snapshot,
    ].slice(-state.maxSnapshots)

    set({
      snapshots: nextSnapshots,
      currentIndex: Math.min(state.currentIndex + 1, nextSnapshots.length - 1),
    })
  },

  undo: () => {
    const state = get()
    if (state.currentIndex <= 0) return

    const newIndex = state.currentIndex - 1
    const snapshot = state.snapshots[newIndex]
    if (snapshot) {
      useCanvasStore.getState().loadSerialized(snapshot.canvas)
      set({ currentIndex: newIndex })
    }
  },

  redo: () => {
    const state = get()
    if (state.currentIndex >= state.snapshots.length - 1) return

    const newIndex = state.currentIndex + 1
    const snapshot = state.snapshots[newIndex]
    if (snapshot) {
      useCanvasStore.getState().loadSerialized(snapshot.canvas)
      set({ currentIndex: newIndex })
    }
  },

  setPaused: (paused) => set({ isPaused: paused }),
  clear: () => set({ snapshots: [], currentIndex: -1 }),
}))
