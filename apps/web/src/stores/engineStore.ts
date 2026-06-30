// ---------------------------------------------------------------------------
// EngineStore -- Zustand store for transient execution state
//
// Per D-09: Execution state (nodeStatus, nodeErrors) is stored separately
// from graph topology. Node execution results (output data) go into
// NodeGraphNode.data, not here.
//
// Per D-10: serialize() and loadSerialized() are the interface for
// HistoryStore integration. HistoryStore calls useEngineStore.getState()
// .serialize() when creating snapshots, and loadSerialized() when
// restoring.
// ---------------------------------------------------------------------------

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { ExecutionStatus } from '@ac-canvas/shared'

// ---------------------------------------------------------------------------
// Serialized state for HistoryStore integration (D-10)
// ---------------------------------------------------------------------------

export interface EngineSerializedState {
  nodeStatus: Record<string, ExecutionStatus>
  nodeErrors: Record<string, string>
}

// ---------------------------------------------------------------------------
// Store Interface (D-09)
// ---------------------------------------------------------------------------

export interface EngineStoreState {
  /** Maps node ID to current execution status. */
  nodeStatus: Record<string, ExecutionStatus>
  /** Maps node ID to error message (only for 'error' status nodes). */
  nodeErrors: Record<string, string>
  /** Timestamp of the last full execution cycle. */
  lastExecutedAt: number | null
  /** Whether an execution cycle is currently in progress. */
  isExecuting: boolean

  // Actions
  setNodeStatus: (id: string, status: ExecutionStatus) => void
  setNodeError: (id: string, message: string) => void
  clearNodeError: (id: string) => void
  setExecuting: (executing: boolean) => void
  /** Mark all nodes as idle (needs re-execution). Used after project load. */
  markAllDirty: () => void
  /** Reset all execution state. */
  clearAll: () => void

  // Serialization (D-10: HistoryStore integration)
  serialize: () => EngineSerializedState
  loadSerialized: (state: EngineSerializedState) => void
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useEngineStore = create<EngineStoreState>()(
  immer((set, get) => ({
    nodeStatus: {},
    nodeErrors: {},
    lastExecutedAt: null,
    isExecuting: false,

    setNodeStatus: (id, status) =>
      set((state) => {
        state.nodeStatus[id] = status
      }),

    setNodeError: (id, message) =>
      set((state) => {
        state.nodeErrors[id] = message
      }),

    clearNodeError: (id) =>
      set((state) => {
        delete state.nodeErrors[id]
      }),

    setExecuting: (executing) =>
      set((state) => {
        state.isExecuting = executing
      }),

    markAllDirty: () =>
      set((state) => {
        for (const id of Object.keys(state.nodeStatus)) {
          state.nodeStatus[id] = 'idle'
        }
      }),

    clearAll: () =>
      set((state) => {
        state.nodeStatus = {}
        state.nodeErrors = {}
        state.lastExecutedAt = null
        state.isExecuting = false
      }),

    serialize: () => {
      const { nodeStatus, nodeErrors } = get()
      return {
        nodeStatus: { ...nodeStatus },
        nodeErrors: { ...nodeErrors },
      }
    },

    loadSerialized: (serialized) =>
      set((state) => {
        state.nodeStatus = { ...serialized.nodeStatus }
        state.nodeErrors = { ...serialized.nodeErrors }
      }),
  })),
)
