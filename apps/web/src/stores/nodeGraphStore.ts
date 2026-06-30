import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type {
  NodeType,
  NodeGraphNode,
  NodeGraphEdge,
  NodeGraphSerialized,
  NodeDataUnion,
  NodeParamDefinition,
  GroupNodeData,
} from '@ac-canvas/shared'
import { nodeTypeDefinitions } from '@ac-canvas/shared'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a NodeDataUnion from a node type by filling in defaults from the
 *  nodeTypeDefinitions param list. */
function createDefaultData(type: NodeType): NodeDataUnion {
  const def = nodeTypeDefinitions.find((d) => d.type === type)
  if (!def) {
    // Fallback: minimal data (should never happen for known types)
    return { nodeType: type, prompt: '', params: [] } as NodeDataUnion
  }

  const data: Record<string, unknown> = { nodeType: type, params: def.params }

  for (const param of def.params) {
    data[param.key] = param.defaultValue
  }

  return data as NodeDataUnion
}

// ---------------------------------------------------------------------------
// Store Interface
// ---------------------------------------------------------------------------

export interface NodeGraphStoreState {
  nodes: NodeGraphNode[]
  edges: NodeGraphEdge[]
  selectedNodeId: string | null
  focusMode: 'canvas' | 'nodes'

  // CRUD
  addNode: (type: NodeType, position: { x: number; y: number }) => string
  removeNode: (id: string) => void
  updateNodeData: (id: string, data: Partial<NodeDataUnion>) => void
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

  // Group operations (Phase 3, NODE-07)
  createGroup: (name: string, position: { x: number; y: number }) => string
  addToGroup: (nodeId: string, groupId: string) => void
  removeFromGroup: (nodeId: string) => void
  renameGroup: (groupId: string, name: string) => void
  setGroupCollapsed: (groupId: string, collapsed: boolean) => void

  // Serialization
  serialize: () => NodeGraphSerialized
  loadSerialized: (state: NodeGraphSerialized) => void
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useNodeGraphStore = create<NodeGraphStoreState>()(
  immer((set, get) => ({
    nodes: [],
    edges: [],
    selectedNodeId: null,
    focusMode: 'nodes',

    // -- Node CRUD ---------------------------------------------------------

    addNode: (type, position) => {
      const id = crypto.randomUUID()
      const data = createDefaultData(type)
      const node: NodeGraphNode = { id, type, position, data }

      set((state) => {
        state.nodes.push(node)
      })

      return id
    },

    removeNode: (id) =>
      set((state) => {
        // Find children (nodes with this group's id as parentId)
        const childIds = state.nodes
          .filter((n) => n.parentId === id)
          .map((n) => n.id)

        // Remove the node + its children + their edges
        const toRemove = new Set([id, ...childIds])
        state.nodes = state.nodes.filter((n) => !toRemove.has(n.id))
        state.edges = state.edges.filter(
          (e) => !toRemove.has(e.source) && !toRemove.has(e.target),
        )
      }),

    updateNodeData: (id, data) =>
      set((state) => {
        const node = state.nodes.find((n) => n.id === id)
        if (!node) return
        // Immer allows direct mutation — merge the partial data into the node's
        // data field while preserving the discriminated union structure.
        Object.assign(node.data, data)
      }),

    setNodePosition: (id, position) =>
      set((state) => {
        const node = state.nodes.find((n) => n.id === id)
        if (!node) return
        node.position = { ...position }
      }),

    // -- Edges -------------------------------------------------------------

    addEdge: (edge) => {
      const id = crypto.randomUUID()

      set((state) => {
        state.edges.push({ id, ...edge })
      })

      return id
    },

    removeEdge: (id) =>
      set((state) => {
        state.edges = state.edges.filter((e) => e.id !== id)
      }),

    // -- Selection ---------------------------------------------------------

    selectNode: (id) =>
      set((state) => {
        state.selectedNodeId = id
      }),

    clearSelection: () =>
      set((state) => {
        state.selectedNodeId = null
      }),

    // -- Focus mode --------------------------------------------------------

    setFocusMode: (mode) =>
      set((state) => {
        state.focusMode = mode
      }),

    // -- Group operations (Phase 3, NODE-07) --------------------------------

    createGroup: (name, position) => {
      const id = crypto.randomUUID()
      const data: GroupNodeData = { nodeType: 'group', name, collapsed: false, params: [] }
      // Per D-07: group nodes are stored in the same flat nodes array
      const node: NodeGraphNode = { id, type: 'group' as NodeType, position, data, parentId: null }

      set((state) => {
        state.nodes.push(node)
      })

      return id
    },

    addToGroup: (nodeId, groupId) =>
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId)
        if (!node) return
        // Set parentId to groupId. React Flow uses this for parent-relative positioning.
        node.parentId = groupId
      }),

    removeFromGroup: (nodeId) =>
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId)
        if (!node) return
        node.parentId = null
      }),

    renameGroup: (groupId, name) =>
      set((state) => {
        const node = state.nodes.find((n) => n.id === groupId)
        if (!node || node.type !== 'group') return
        const data = node.data as GroupNodeData
        data.name = name
      }),

    setGroupCollapsed: (groupId, collapsed) =>
      set((state) => {
        const node = state.nodes.find((n) => n.id === groupId)
        if (!node || node.type !== 'group') return
        const data = node.data as GroupNodeData
        data.collapsed = collapsed
      }),

    // -- Serialization -----------------------------------------------------

    serialize: () => {
      const { nodes, edges } = get()
      return {
        nodes: nodes.map((n) => ({ ...n, data: { ...n.data } })),
        edges: edges.map((e) => ({ ...e })),
      }
    },

    loadSerialized: (serialized) =>
      set((state) => {
        state.nodes = serialized.nodes.map((n) => ({ ...n, data: { ...n.data } }))
        state.edges = serialized.edges.map((e) => ({ ...e }))
      }),
  })),
)
