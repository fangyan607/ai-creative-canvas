// ---------------------------------------------------------------------------
// useAutoExecute -- Debounced auto-execution of the node graph
//
// Subscribes to NodeGraphStore changes (nodes, edges, node data updates)
// and triggers dirty-path re-execution via the engine with 180ms debounce.
//
// Per D-02: Auto-execution for sync-phase operation. Graph changes
// (connect, disconnect, parameter update) automatically trigger dirty-path
// re-execution. The debounce window matches HistoryStore's merge window for
// consistency.
//
// Per D-10: Execution events do NOT create history snapshots. Only
// topology-changing operations (add, delete, connect, disconnect) do.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react'
import { NodeEngine } from '../engine/NodeEngine'
import { createDefaultResolvers } from '../engine/resolvers'
import { useEngineStore } from '../stores/engineStore'
import { useNodeGraphStore } from '../stores/nodeGraphStore'
import type { NodeGraphNode, NodeGraphEdge } from '@ac-canvas/shared'

/**
 * React hook that auto-executes the node graph on changes.
 * Called once at the app level (in App.tsx).
 */
export function useAutoExecute() {
  const engineRef = useRef<NodeEngine | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    // Initialize engine with default stub resolvers
    const engine = new NodeEngine(createDefaultResolvers())
    engineRef.current = engine

    return () => {
      clearTimeout(debounceRef.current)
      engineRef.current = null
    }
  }, [])

  useEffect(() => {
    const execute = async () => {
      const engine = engineRef.current
      if (!engine) return

      const state = useNodeGraphStore.getState()
      const nodes: NodeGraphNode[] = state.nodes
      const edges: NodeGraphEdge[] = state.edges

      // If no nodes, nothing to execute
      if (nodes.length === 0) return

      useEngineStore.getState().setExecuting(true)

      try {
        const result = await engine.execute(nodes, edges)

        // Write results to NodeGraphStore (node.data updates)
        // In Phase 3 stub mode, executors write outputs to nodeOutputs.
        // The engine.execute() writes status to its internal map.
        // We sync internal status to EngineStore here.
        for (const node of nodes) {
          const status = engine.getNodeStatus(node.id) as any
          if (status && status !== 'idle') {
            useEngineStore.getState().setNodeStatus(node.id, status)
            if (status === 'error') {
              useEngineStore.getState().setNodeError(
                node.id,
                result.errorMessage ?? 'Unknown error',
              )
            }
          }
        }
      } catch (err) {
        console.error('[useAutoExecute] Engine execution error:', err)
      } finally {
        useEngineStore.getState().setExecuting(false)
      }
    }

    // Debounced trigger
    const debouncedExecute = () => {
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(execute, 180) // D-02: 180ms debounce
    }

    // Subscribe to NodeGraphStore changes
    const unsub = useNodeGraphStore.subscribe(debouncedExecute)

    return () => {
      unsub()
      clearTimeout(debounceRef.current)
    }
  }, [])
}
