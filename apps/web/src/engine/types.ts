// ---------------------------------------------------------------------------
// Engine Types — TypeScript contracts for the DAG execution engine.
// These types are the bridge between Phase 3 (NodeEngine) and Phase 5
// (AI Execution Infrastructure).
// ---------------------------------------------------------------------------

import type { NodeType, ExecutionStatus } from '@ac-canvas/shared'

// ---------------------------------------------------------------------------
// Executor Interface
// ---------------------------------------------------------------------------

/** Input to an executor: upstream node outputs keyed by input socket ID. */
export type ExecutorInput = Record<string, unknown>

/** Output from an executor: data merged into node.data. */
export type ExecutorOutput = Record<string, unknown>

/**
 * An executor function that processes a node.
 * - `nodeData`: the current node's data field (read-only for params)
 * - `inputs`: outputs from upstream nodes, keyed by the input socket ID
 * Returns data to merge into the node's data field on success.
 * Throws an Error to signal execution failure (triggers D-04 fail-stop).
 *
 * Per D-01: Phase 3 executors are synchronous stubs. Phase 5 replaces
 * these with async AI provider executors.
 */
export type Executor = (
  nodeData: Record<string, unknown>,
  inputs: ExecutorInput,
) => ExecutorOutput | Promise<ExecutorOutput>

/** A map from node type name to its executor function. */
export type ExecutorResolver = Map<NodeType | 'group', Executor>

// ---------------------------------------------------------------------------
// Execution Context
// ---------------------------------------------------------------------------

/** Result of a single execution cycle. */
export interface ExecutionResult {
  /** Whether the entire execution completed without errors. */
  success: boolean
  /** IDs of nodes that executed successfully in this cycle. */
  executedNodes: string[]
  /** ID of the first node that errored, if any. */
  failedNodeId?: string
  /** Error message from the failed node. */
  errorMessage?: string
  /** IDs of nodes skipped due to the error (D-04 fail-stop). */
  skippedNodes: string[]
  /** Timestamp when this execution cycle started. */
  startedAt: number
  /** Timestamp when this execution cycle completed. */
  completedAt: number
}

// ---------------------------------------------------------------------------
// Pure Function Signatures (implemented in NodeEngine.ts)
// ---------------------------------------------------------------------------

/**
 * Kahn's algorithm: topological sort returning nodes grouped by depth.
 * Each sub-array is a batch of nodes that can execute in parallel.
 * Returns null if a cycle is detected.
 */
export declare function toExecutionLayers(
  nodeIds: string[],
  edges: Array<{ source: string; target: string }>,
): string[][] | null

/**
 * BFS traversal to find all nodes downstream from a changed node.
 * Returns the set of node IDs that need re-execution.
 */
export declare function findAffectedDownstream(
  changedNodeId: string,
  edges: Array<{ source: string; target: string }>,
): Set<string>
