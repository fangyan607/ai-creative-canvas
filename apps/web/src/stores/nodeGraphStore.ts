import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { NodeType, NodeGraphNode, NodeGraphEdge, NodeGraphSerialized } from '@ac-canvas/shared'

interface NodeGraphStoreState {
  nodes: NodeGraphNode[]
  edges: NodeGraphEdge[]
  selectedNodeId: string | null
  focusMode: 'canvas' | 'nodes'

  // CRUD
  addNode: (type: NodeType, position: { x: number; y: number }) => string
  removeNode: (id: string) => void
  updateNodeData: (id: string, data: Partial<any>) => void
  setNodePosition: (id: string, position: { x: number; y: number }) => void

  // Edges
  addEdge: (edge: {
    source: string
    target: string
    sourceHandle: string
    targetHandle: string
  }) => string
  removeEdge: (id: string) => void

  // Selection
  selectNode: (id: string | null) => void
  clearSelection: () => void

  // Focus mode
  setFocusMode: (mode: 'canvas' | 'nodes') => void

  // Serialization
  serialize: () => NodeGraphSerialized
  loadSerialized: (state: NodeGraphSerialized) => void
}

export const useNodeGraphStore = create<NodeGraphStoreState>()(
  immer((set, get) => ({
    nodes: [],
    edges: [],
    selectedNodeId: null,
    focusMode: 'nodes',

    addNode: (type, position) => '',
    removeNode: (id) => {},
    updateNodeData: (id, data) => {},
    setNodePosition: (id, position) => {},

    addEdge: (edge) => '',
    removeEdge: (id) => {},

    selectNode: (id) => {},
    clearSelection: () => {},

    setFocusMode: (mode) => {},

    serialize: () => ({ nodes: [], edges: [] }),
    loadSerialized: (state) => {},
  })),
)
