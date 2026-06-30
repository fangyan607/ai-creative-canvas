import { describe, it, expect } from 'vitest'
import { toExecutionLayers, findAffectedDownstream, NodeEngine } from '../NodeEngine'
import type { NodeGraphNode, NodeGraphEdge } from '@ac-canvas/shared'

describe('toExecutionLayers', () => {
  it('sorts linear graph A->B->C into [[A], [B], [C]]', () => {
    const ids = ['a', 'b', 'c']
    const edges = [{ source: 'a', target: 'b' }, { source: 'b', target: 'c' }]
    const layers = toExecutionLayers(ids, edges)
    expect(layers).toEqual([['a'], ['b'], ['c']])
  })

  it('sorts branched graph (A->B, A->C) into [[A], [B, C]]', () => {
    const ids = ['a', 'b', 'c']
    const edges = [{ source: 'a', target: 'b' }, { source: 'a', target: 'c' }]
    const layers = toExecutionLayers(ids, edges)
    expect(layers).toEqual([['a'], expect.arrayContaining(['b', 'c'])])
  })

  it('returns null for cyclic graph A->B->A', () => {
    const ids = ['a', 'b']
    const edges = [{ source: 'a', target: 'b' }, { source: 'b', target: 'a' }]
    const layers = toExecutionLayers(ids, edges)
    expect(layers).toBeNull()
  })

  it('handles diamond graph (A->B, A->C, B->D, C->D) producing 3 layers', () => {
    const ids = ['a', 'b', 'c', 'd']
    const edges = [
      { source: 'a', target: 'b' },
      { source: 'a', target: 'c' },
      { source: 'b', target: 'd' },
      { source: 'c', target: 'd' },
    ]
    const layers = toExecutionLayers(ids, edges)
    expect(layers).not.toBeNull()
    expect(layers![0]).toEqual(['a'])
    expect(layers![1].sort()).toEqual(['b', 'c'])
    expect(layers![2]).toEqual(['d'])
  })

  it('handles single node graph', () => {
    const layers = toExecutionLayers(['a'], [])
    expect(layers).toEqual([['a']])
  })

  it('handles disconnected subgraphs', () => {
    const ids = ['a', 'b', 'c', 'd']
    const edges = [{ source: 'a', target: 'b' }, { source: 'c', target: 'd' }]
    const layers = toExecutionLayers(ids, edges)
    expect(layers).not.toBeNull()
    // Both roots are in layer 0
    expect(layers![0].sort()).toEqual(['a', 'c'])
  })
})

describe('findAffectedDownstream', () => {
  it('finds immediate downstream for a single edge', () => {
    const edges = [{ source: 'a', target: 'b' }]
    const affected = findAffectedDownstream('a', edges)
    expect([...affected]).toEqual(['b'])
  })

  it('finds transitive downstream (A->B->C), changing A affects B and C', () => {
    const edges = [{ source: 'a', target: 'b' }, { source: 'b', target: 'c' }]
    const affected = findAffectedDownstream('a', edges)
    expect([...affected].sort()).toEqual(['b', 'c'])
  })

  it('finds all affected in branched graph', () => {
    const edges = [
      { source: 'a', target: 'b' },
      { source: 'a', target: 'c' },
      { source: 'b', target: 'd' },
    ]
    const affected = findAffectedDownstream('a', edges)
    expect([...affected].sort()).toEqual(['b', 'c', 'd'])
  })

  it('changing leaf node (no downstream) returns empty set', () => {
    const edges = [{ source: 'a', target: 'b' }]
    const affected = findAffectedDownstream('b', edges)
    expect(affected.size).toBe(0)
  })

  it('changing a node with no edges returns empty set', () => {
    const affected = findAffectedDownstream('a', [])
    expect(affected.size).toBe(0)
  })
})

describe('NodeEngine', () => {
  it('executes linear graph and marks nodes done', async () => {
    const engine = new NodeEngine()
    const nodes: NodeGraphNode[] = [
      { id: 'a', type: 'prompt' as any, position: { x: 0, y: 0 }, data: { nodeType: 'prompt', prompt: 'hello', params: [] } as any },
      { id: 'b', type: 'preview' as any, position: { x: 100, y: 0 }, data: { nodeType: 'preview', generatedImageId: null, params: [] } as any },
    ]
    const edges = [{ id: 'e1', source: 'a', target: 'b', sourceHandle: 'output-0', targetHandle: 'input-0' }]

    const result = await engine.execute(nodes, edges)
    expect(result.success).toBe(true)
    expect(result.executedNodes).toEqual(['a', 'b'])
    expect(engine.getNodeStatus('a')).toBe('done')
    expect(engine.getNodeStatus('b')).toBe('done')
  })

  it('marks downstream nodes as skipped when a node errors', async () => {
    const resolvers = new Map()
    resolvers.set('prompt', () => { throw new Error('Execution failed') })

    const engine = new NodeEngine(resolvers)
    const nodes: NodeGraphNode[] = [
      { id: 'a', type: 'prompt' as any, position: { x: 0, y: 0 }, data: { nodeType: 'prompt', prompt: 'hello', params: [] } as any },
      { id: 'b', type: 'preview' as any, position: { x: 100, y: 0 }, data: { nodeType: 'preview', generatedImageId: null, params: [] } as any },
    ]
    const edges = [{ id: 'e1', source: 'a', target: 'b', sourceHandle: 'output-0', targetHandle: 'input-0' }]

    const result = await engine.execute(nodes, edges)
    expect(result.success).toBe(false)
    expect(result.failedNodeId).toBe('a')
    expect(result.skippedNodes).toContain('b')
  })

  it('marks dirty path when a node changes', () => {
    const engine = new NodeEngine()
    const edges = [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
      { source: 'x', target: 'y' },
    ]
    const affected = engine.markDirty('b', edges)
    expect([...affected].sort()).toEqual(['b', 'c'])
    // x and y should NOT be affected
    expect(affected.has('x')).toBe(false)
    expect(affected.has('y')).toBe(false)
  })

  it('detects cycles and returns error', async () => {
    const engine = new NodeEngine()
    const nodes: NodeGraphNode[] = [
      { id: 'a', type: 'prompt' as any, position: { x: 0, y: 0 }, data: {} as any },
      { id: 'b', type: 'preview' as any, position: { x: 100, y: 0 }, data: {} as any },
    ]
    const edges = [
      { id: 'e1', source: 'a', target: 'b', sourceHandle: 'o', targetHandle: 'i' },
      { id: 'e2', source: 'b', target: 'a', sourceHandle: 'o', targetHandle: 'i' },
    ]
    const result = await engine.execute(nodes, edges)
    expect(result.success).toBe(false)
    expect(result.errorMessage).toContain('Cycle')
  })
})
