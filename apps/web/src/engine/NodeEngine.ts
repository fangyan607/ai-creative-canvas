// ---------------------------------------------------------------------------
// NodeEngine -- DAG execution engine for node graph processing
//
// Pure functions for topological sort and dirty-path marking.
// NodeEngine class wraps these with execution lifecycle management.
//
// Per D-01: Sync-first. All execute() calls return Promise.resolve() for
// interface uniformity. Stub resolvers return placeholder data.
// ---------------------------------------------------------------------------

import type { NodeGraphNode, NodeGraphEdge } from '@ac-canvas/shared'
import type { Executor, ExecutorResolver, ExecutionResult, ExecutorInput } from './types'

// ===========================================================================
// Pure Functions
// ===========================================================================

/**
 * Kahn's algorithm: topological sort returning nodes grouped by depth.
 * Each sub-array is a batch of nodes that can execute in parallel.
 * Returns null if a cycle is detected.
 */
export function toExecutionLayers(
  nodeIds: string[],
  edges: Array<{ source: string; target: string }>,
): string[][] | null {
  // Build adjacency list and in-degree map
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()
  for (const id of nodeIds) {
    inDegree.set(id, 0)
    adjacency.set(id, [])
  }
  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target)
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1)
  }

  // Queue nodes with zero in-degree
  const queue: string[] = []
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id)
  }

  const layers: string[][] = []
  let processed = 0

  while (queue.length > 0) {
    const currentLayer = [...queue]
    queue.length = 0
    layers.push(currentLayer)

    for (const nodeId of currentLayer) {
      processed++
      const neighbors = adjacency.get(nodeId) ?? []
      for (const neighbor of neighbors) {
        const deg = (inDegree.get(neighbor) ?? 1) - 1
        inDegree.set(neighbor, deg)
        if (deg === 0) queue.push(neighbor)
      }
    }
  }

  // Cycle detection: if not all nodes were processed, there's a cycle
  return processed === nodeIds.length ? layers : null
}

/**
 * Find all nodes downstream from a changed node (BFS).
 * Returns the set of node IDs that need re-execution.
 */
export function findAffectedDownstream(
  changedNodeId: string,
  edges: Array<{ source: string; target: string }>,
): Set<string> {
  // Build forward adjacency: source -> [targets]
  const forward = new Map<string, string[]>()
  for (const edge of edges) {
    const neighbors = forward.get(edge.source) ?? []
    neighbors.push(edge.target)
    forward.set(edge.source, neighbors)
  }

  // BFS from changed node
  const affected = new Set<string>()
  const queue = [changedNodeId]
  while (queue.length > 0) {
    const current = queue.shift()!
    const neighbors = forward.get(current) ?? []
    for (const neighbor of neighbors) {
      if (!affected.has(neighbor)) {
        affected.add(neighbor)
        queue.push(neighbor)
      }
    }
  }

  return affected
}

// ===========================================================================
// NodeEngine Class
// ===========================================================================

export class NodeEngine {
  private resolvers: ExecutorResolver
  private nodeStatus: Map<string, string>  // nodeId -> status

  constructor(resolvers?: ExecutorResolver) {
    this.resolvers = resolvers ?? new Map()
    this.nodeStatus = new Map()
  }

  setResolvers(resolvers: ExecutorResolver): void {
    this.resolvers = resolvers
  }

  getNodeStatus(nodeId: string): string {
    return this.nodeStatus.get(nodeId) ?? 'idle'
  }

  /**
   * Mark a node and all its downstream as dirty (needs re-execution).
   * Per D-05: when a node's input changes, mark downstream as dirty.
   */
  markDirty(
    changedNodeId: string,
    edges: Array<{ source: string; target: string }>,
  ): Set<string> {
    const affected = findAffectedDownstream(changedNodeId, edges)
    affected.add(changedNodeId)
    for (const id of affected) {
      this.nodeStatus.set(id, 'idle')
    }
    return affected
  }

  /**
   * Execute a graph. Returns ExecutionResult.
   *
   * Algorithm per D-01/D-03/D-04:
   * 1. Topological sort -> execution layers
   * 2. For each layer, execute nodes in parallel (all Promise.all in Phase 3 stubs, real async in Phase 5)
   * 3. On error: mark node as error, mark all downstream as skipped, stop execution
   * 4. On success: mark node as done, collect output
   */
  async execute(
    nodes: NodeGraphNode[],
    edges: NodeGraphEdge[],
  ): Promise<ExecutionResult> {
    const startedAt = Date.now()
    const executedNodes: string[] = []
    const skippedNodes: string[] = []
    const nodeOutputs = new Map<string, Record<string, unknown>>()

    // Step 1: Topological sort
    const layers = toExecutionLayers(
      nodes.map((n) => n.id),
      edges,
    )

    if (layers === null) {
      return {
        success: false,
        executedNodes: [],
        failedNodeId: undefined,
        errorMessage: 'Cycle detected in graph',
        skippedNodes: nodes.map((n) => n.id),
        startedAt,
        completedAt: Date.now(),
      }
    }

    // Reset all dirty nodes to queued
    for (const node of nodes) {
      const status = this.nodeStatus.get(node.id)
      if (status === 'idle' || status === undefined) {
        this.nodeStatus.set(node.id, 'queued')
      }
    }

    // Step 2: Execute layer by layer
    for (const layer of layers) {
      // Filter layer: only execute dirty/idle nodes. Skip already-done nodes (D-05).
      const toExecute = layer.filter((id) => {
        const status = this.nodeStatus.get(id)
        return status === 'queued' || status === 'idle' || status === undefined
      })

      if (toExecute.length === 0) continue

      // Execute layer nodes in parallel
      const results = await Promise.allSettled(
        toExecute.map(async (nodeId) => {
          const node = nodes.find((n) => n.id === nodeId)
          if (!node) throw new Error(`Node ${nodeId} not found`)

          const executor = this.resolvers.get(node.type)
          if (!executor) {
            // No executor: skip this node (group nodes, etc.)
            this.nodeStatus.set(nodeId, 'done')
            executedNodes.push(nodeId)
            return
          }

          this.nodeStatus.set(nodeId, 'executing')

          // Build inputs from upstream node outputs
          const inputs: ExecutorInput = {}
          const incomingEdges = edges.filter((e) => e.target === nodeId)
          for (const edge of incomingEdges) {
            inputs[edge.sourceHandle] = nodeOutputs.get(edge.source)
          }

          const output = await executor(node.data as unknown as Record<string, unknown>, inputs)
          nodeOutputs.set(nodeId, output)
          this.nodeStatus.set(nodeId, 'done')
          executedNodes.push(nodeId)
        }),
      )

      // Step 3: Check for errors (D-04 fail-stop)
      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        if (result.status === 'rejected') {
          const failedId = toExecute[i]
          this.nodeStatus.set(failedId, 'error')
          const errorMsg = result.reason instanceof Error
            ? result.reason.message
            : String(result.reason)

          // Mark all remaining nodes as skipped
          const remaining = new Set<string>()
          for (const id of findAffectedDownstream(failedId, edges)) {
            remaining.add(id)
            this.nodeStatus.set(id, 'skipped')
            skippedNodes.push(id)
          }
          // Also skip the rest of the current layer and all future layers
          for (const l of layers) {
            for (const id of l) {
              if (id !== failedId && !remaining.has(id) && !executedNodes.includes(id)) {
                const s = this.nodeStatus.get(id)
                if (s === 'queued' || s === 'executing' || s === undefined) {
                  this.nodeStatus.set(id, 'skipped')
                  skippedNodes.push(id)
                }
              }
            }
          }

          return {
            success: false,
            executedNodes,
            failedNodeId: failedId,
            errorMessage: errorMsg,
            skippedNodes: [...new Set(skippedNodes)],
            startedAt,
            completedAt: Date.now(),
          }
        }
      }
    }

    return {
      success: true,
      executedNodes,
      skippedNodes: [],
      startedAt,
      completedAt: Date.now(),
    }
  }
}
