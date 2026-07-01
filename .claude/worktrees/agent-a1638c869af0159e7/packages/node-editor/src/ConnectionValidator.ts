// ---------------------------------------------------------------------------
// ConnectionValidator — 5-step validation pipeline for React Flow connections
//
// Validates: self-connections, null handles, direction enforcement,
// duplicate connections, and DAG cycle detection via BFS.
// ---------------------------------------------------------------------------

export interface ConnectionValidationResult {
  valid: boolean
  reason?: string
}

/**
 * Full validation pipeline. Returns a result with `valid: true` or
 * `valid: false` plus a human-readable reason.
 */
export function validateConnection(
  source: string,
  target: string,
  sourceHandle: string | null,
  targetHandle: string | null,
  existingEdges: {
    source: string
    target: string
    sourceHandle?: string
    targetHandle?: string
  }[]
): ConnectionValidationResult {
  // Step 1: No self-connections
  if (source === target) {
    return { valid: false, reason: 'Self-connections are not allowed' }
  }

  // Step 2: No null handles
  if (!sourceHandle || !targetHandle) {
    return { valid: false, reason: 'Missing handle' }
  }

  // Step 3: Direction enforcement
  // Convention: output handles start with "output-", input handles start with "input-"
  if (!sourceHandle.startsWith('output-')) {
    return { valid: false, reason: 'Connection must start from an output handle' }
  }
  if (!targetHandle.startsWith('input-')) {
    return { valid: false, reason: 'Connection must end at an input handle' }
  }

  // Step 4: No duplicate connections
  const duplicate = existingEdges.some(
    e =>
      e.source === source &&
      e.target === target &&
      e.sourceHandle === sourceHandle &&
      e.targetHandle === targetHandle
  )
  if (duplicate) {
    return { valid: false, reason: 'Duplicate connection' }
  }

  // Step 5: No cycles (DAG enforcement)
  if (wouldCreateCycle(source, target, existingEdges)) {
    return { valid: false, reason: 'Connection would create a cycle' }
  }

  return { valid: true }
}

/**
 * BFS-based cycle detection.
 * Checks if adding an edge `source -> target` would create a cycle by
 * traversing from `target` backwards to see if we can reach `source`.
 */
export function wouldCreateCycle(
  source: string,
  target: string,
  existingEdges: { source: string; target: string }[]
): boolean {
  // Build forward adjacency list (source -> targets it connects to)
  const adjacency = new Map<string, string[]>()
  for (const edge of existingEdges) {
    const neighbors = adjacency.get(edge.source) || []
    neighbors.push(edge.target)
    adjacency.set(edge.source, neighbors)
  }

  // BFS from the proposed edge's target to see if we can reach the source
  // If there's already a path from target -> ... -> source, adding
  // source -> target would create a cycle (source -> target -> ... -> source)
  const queue = [target]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const current = queue.shift()!
    if (current === source) return true // cycle found
    if (visited.has(current)) continue
    visited.add(current)
    const neighbors = adjacency.get(current) || []
    queue.push(...neighbors)
  }

  return false
}

/**
 * Convenience wrapper that checks basic validity of a single connection
 * without considering existing edges (no cycle or duplicate checking).
 */
export function isConnectionValid(params: {
  source: string
  target: string
  sourceHandle: string | null
  targetHandle: string | null
}): boolean {
  return validateConnection(
    params.source,
    params.target,
    params.sourceHandle,
    params.targetHandle,
    []
  ).valid
}
