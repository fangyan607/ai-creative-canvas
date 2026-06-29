// Stub — Phase 2 will implement full NodeEditor store
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface NodeGraphStoreState {
  nodes: Record<string, unknown>
  edges: Record<string, unknown>
}

export const useNodeGraphStore = create<NodeGraphStoreState>()(
  immer(() => ({
    nodes: {},
    edges: {},
  })),
)
