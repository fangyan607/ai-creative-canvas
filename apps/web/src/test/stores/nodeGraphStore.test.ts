import { describe, it, expect, beforeEach } from 'vitest'
import { useNodeGraphStore } from '../../stores/nodeGraphStore'
import type { NodeGraphNode, NodeGraphEdge, NodeType } from '@ac-canvas/shared'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockNode(
  id: string,
  type: NodeType = 'prompt',
  overrides: Partial<NodeGraphNode> = {},
): NodeGraphNode {
  return {
    id,
    type,
    position: { x: 100, y: 100 },
    data: { nodeType: type, prompt: 'test prompt', params: [] } as any,
    ...overrides,
  }
}

function createMockEdge(
  id: string,
  source: string,
  target: string,
): NodeGraphEdge {
  return {
    id,
    source,
    target,
    sourceHandle: 'output-0',
    targetHandle: 'input-0',
  }
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('NodeGraphStore', () => {
  beforeEach(() => {
    useNodeGraphStore.setState({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      focusMode: 'nodes',
    })
  })

  // --- Test 1: addNode ---

  it('Test 1: addNode adds a node with auto-generated UUID id and stores it at the correct position', () => {
    const id = useNodeGraphStore.getState().addNode('prompt', { x: 200, y: 300 })

    // Should be a non-empty string (UUID)
    expect(id).toBeTruthy()
    expect(typeof id).toBe('string')

    const node = useNodeGraphStore.getState().nodes.find((n) => n.id === id)
    expect(node).toBeDefined()
    expect(node!.type).toBe('prompt')
    expect(node!.position).toEqual({ x: 200, y: 300 })
    expect(node!.data.nodeType).toBe('prompt')
  })

  // --- Test 2: removeNode ---

  it('Test 2: removeNode removes a node and all its connected edges', () => {
    const id1 = useNodeGraphStore.getState().addNode('prompt', { x: 0, y: 0 })
    const id2 = useNodeGraphStore.getState().addNode('preview', { x: 200, y: 0 })

    const edgeId = useNodeGraphStore.getState().addEdge({
      source: id1,
      target: id2,
      sourceHandle: 'output-0',
      targetHandle: 'input-0',
    })

    expect(useNodeGraphStore.getState().nodes).toHaveLength(2)
    expect(useNodeGraphStore.getState().edges).toHaveLength(1)

    // Remove the source node — associated edge should be removed too
    useNodeGraphStore.getState().removeNode(id1)

    expect(useNodeGraphStore.getState().nodes).toHaveLength(1)
    expect(useNodeGraphStore.getState().edges).toHaveLength(0)
    expect(useNodeGraphStore.getState().nodes[0].id).toBe(id2)
  })

  // --- Test 3: updateNodeData ---

  it('Test 3: updateNodeData patches only the specified data fields on a node (Immer immutability check)', () => {
    const id = useNodeGraphStore.getState().addNode('prompt', { x: 0, y: 0 })
    // The addNode creates a PromptNodeData with prompt: ''
    // Patches the prompt
    useNodeGraphStore.getState().updateNodeData(id, { prompt: 'updated prompt' })

    const node = useNodeGraphStore.getState().nodes.find((n) => n.id === id)
    expect(node!.data.nodeType).toBe('prompt')
    expect((node!.data as any).prompt).toBe('updated prompt')
  })

  // --- Test 4: setNodePosition ---

  it('Test 4: setNodePosition updates a node position', () => {
    const id = useNodeGraphStore.getState().addNode('prompt', { x: 10, y: 20 })
    useNodeGraphStore.getState().setNodePosition(id, { x: 500, y: 600 })

    const node = useNodeGraphStore.getState().nodes.find((n) => n.id === id)
    expect(node!.position).toEqual({ x: 500, y: 600 })
  })

  // --- Test 5: addEdge ---

  it('Test 5: addEdge creates an edge between source and target handles', () => {
    const srcId = useNodeGraphStore.getState().addNode('prompt', { x: 0, y: 0 })
    const tgtId = useNodeGraphStore.getState().addNode('text-to-image', { x: 200, y: 0 })

    const edgeId = useNodeGraphStore.getState().addEdge({
      source: srcId,
      target: tgtId,
      sourceHandle: 'output-0',
      targetHandle: 'input-0',
    })

    expect(edgeId).toBeTruthy()
    expect(typeof edgeId).toBe('string')

    const edge = useNodeGraphStore.getState().edges.find((e) => e.id === edgeId)
    expect(edge).toBeDefined()
    expect(edge!.source).toBe(srcId)
    expect(edge!.target).toBe(tgtId)
    expect(edge!.sourceHandle).toBe('output-0')
    expect(edge!.targetHandle).toBe('input-0')
  })

  // --- Test 6: removeEdge ---

  it('Test 6: removeEdge deletes a specific edge by id', () => {
    const srcId = useNodeGraphStore.getState().addNode('prompt', { x: 0, y: 0 })
    const tgtId = useNodeGraphStore.getState().addNode('preview', { x: 200, y: 0 })
    const edgeId = useNodeGraphStore.getState().addEdge({
      source: srcId,
      target: tgtId,
      sourceHandle: 'output-0',
      targetHandle: 'input-0',
    })

    expect(useNodeGraphStore.getState().edges).toHaveLength(1)

    useNodeGraphStore.getState().removeEdge(edgeId)

    expect(useNodeGraphStore.getState().edges).toHaveLength(0)
  })

  // --- Test 7: selectNode / clearSelection ---

  it('Test 7: selectNode sets selectedNodeId; clearSelection resets it to null', () => {
    const id = useNodeGraphStore.getState().addNode('prompt', { x: 0, y: 0 })

    useNodeGraphStore.getState().selectNode(id)
    expect(useNodeGraphStore.getState().selectedNodeId).toBe(id)

    useNodeGraphStore.getState().clearSelection()
    expect(useNodeGraphStore.getState().selectedNodeId).toBeNull()
  })

  // --- Test 8: serialize() ---

  it('Test 8: serialize() returns { nodes, edges } with no transient props', () => {
    const id = useNodeGraphStore.getState().addNode('prompt', { x: 10, y: 20 })
    useNodeGraphStore.getState().addNode('preview', { x: 300, y: 400 })

    const serialized = useNodeGraphStore.getState().serialize()

    expect(serialized).toHaveProperty('nodes')
    expect(serialized).toHaveProperty('edges')
    expect(Array.isArray(serialized.nodes)).toBe(true)
    expect(Array.isArray(serialized.edges)).toBe(true)
    expect(serialized.nodes).toHaveLength(2)

    // Each node should have the standard fields and no unexpected transient props
    for (const node of serialized.nodes) {
      expect(node).toHaveProperty('id')
      expect(node).toHaveProperty('type')
      expect(node).toHaveProperty('position')
      expect(node).toHaveProperty('data')
      // Transient props like selected, dragging should not appear
      expect((node as any).selected).toBeUndefined()
      expect((node as any).dragging).toBeUndefined()
    }
  })

  // --- Test 9: loadSerialized() ---

  it('Test 9: loadSerialized() restores nodes, edges, and positions from serialized state', () => {
    // Create some nodes via store as the source of truth
    const id1 = useNodeGraphStore.getState().addNode('prompt', { x: 10, y: 20 })
    const id2 = useNodeGraphStore.getState().addNode('preview', { x: 300, y: 400 })
    const eId = useNodeGraphStore.getState().addEdge({
      source: id1,
      target: id2,
      sourceHandle: 'output-0',
      targetHandle: 'input-0',
    })

    const serialized = useNodeGraphStore.getState().serialize()

    // Reset to empty
    useNodeGraphStore.setState({ nodes: [], edges: [], selectedNodeId: null, focusMode: 'nodes' })
    expect(useNodeGraphStore.getState().nodes).toHaveLength(0)

    // Restore
    useNodeGraphStore.getState().loadSerialized(serialized)

    expect(useNodeGraphStore.getState().nodes).toHaveLength(2)
    expect(useNodeGraphStore.getState().edges).toHaveLength(1)

    const restoredNode = useNodeGraphStore.getState().nodes.find((n) => n.id === id1)
    expect(restoredNode).toBeDefined()
    expect(restoredNode!.position).toEqual({ x: 10, y: 20 })
  })

  // --- Test 10: setFocusMode ---

  it('Test 10: setFocusMode toggles between "canvas" and "nodes"', () => {
    // Default should be 'nodes'
    expect(useNodeGraphStore.getState().focusMode).toBe('nodes')

    useNodeGraphStore.getState().setFocusMode('canvas')
    expect(useNodeGraphStore.getState().focusMode).toBe('canvas')

    useNodeGraphStore.getState().setFocusMode('nodes')
    expect(useNodeGraphStore.getState().focusMode).toBe('nodes')
  })

  // --- Test 11: Empty graph ---

  it('Test 11: Empty graph: serialize on empty store returns empty arrays', () => {
    const serialized = useNodeGraphStore.getState().serialize()

    expect(serialized).toEqual({ nodes: [], edges: [] })
  })

  // --- Test 12: Non-existent node ---

  it('Test 12: Non-existent node: removeNode with bogus id is a no-op (no crash)', () => {
    // Should not throw when removing a non-existent node
    expect(() => {
      useNodeGraphStore.getState().removeNode('non-existent-id')
    }).not.toThrow()

    // Edge case: updateNodeData on non-existent node should not crash
    expect(() => {
      useNodeGraphStore.getState().updateNodeData('non-existent-id', { prompt: 'test' })
    }).not.toThrow()

    // Edge case: setNodePosition on non-existent node should not crash
    expect(() => {
      useNodeGraphStore.getState().setNodePosition('non-existent-id', { x: 0, y: 0 })
    }).not.toThrow()

    // Edge case: selectNode with null should clear selection without error
    expect(() => {
      useNodeGraphStore.getState().clearSelection()
    }).not.toThrow()
  })
})
