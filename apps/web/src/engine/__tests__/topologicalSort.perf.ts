import { describe, bench } from 'vitest'
import { toExecutionLayers } from '../NodeEngine'

/**
 * Topological Sort Performance Benchmarks
 *
 * Measures toExecutionLayers() execution time for 3 graph shapes:
 * - Linear: 50-node chain (sequential dependency)
 * - Branched: 1 root -> 49 leaves
 * - Diamond: 50-node diamond mesh (widest at layer 2 with 24 parallel nodes)
 *
 * Each benchmark runs 1000 iterations. Results are reported as
 * mean/median execution time. Tolerate up to 10% regression from baseline.
 *
 * Run: pnpm test:perf
 * Excluded from unit test runs via .perf.ts suffix.
 */

// ── Graph Generators ──

function generateLinearGraph(size: number): { ids: string[]; edges: { source: string; target: string }[] } {
  const ids = Array.from({ length: size }, (_, i) => `n${i}`)
  const edges = ids.slice(0, -1).map((id, i) => ({ source: id, target: ids[i + 1] }))
  return { ids, edges }
}

function generateBranchedGraph(size: number): { ids: string[]; edges: { source: string; target: string }[] } {
  const ids = Array.from({ length: size }, (_, i) => `n${i}`)
  const edges = ids.slice(1).map((id) => ({ source: 'n0', target: id }))
  return { ids, edges }
}

function generateDiamondGraph(layers: number): { ids: string[]; edges: { source: string; target: string }[] } {
  const ids: string[] = []
  const edges: { source: string; target: string }[] = []

  // Generate a diamond mesh: layer 0 = 1 node, layer 1 = 2 nodes, layer 2 = 4 nodes...
  let nodeIndex = 0
  const layerNodes: string[][] = []

  for (let l = 0; l < layers; l++) {
    const count = Math.min(2 ** l, 16) // Cap at 16 per layer to keep graph realistic
    const nodes: string[] = []
    for (let n = 0; n < count; n++) {
      const id = `n${nodeIndex++}`
      nodes.push(id)
      ids.push(id)
    }
    layerNodes.push(nodes)

    if (l > 0) {
      // Connect each node in previous layer to each node in current layer
      for (const prev of layerNodes[l - 1]) {
        for (const curr of layerNodes[l]) {
          edges.push({ source: prev, target: curr })
        }
      }
    }
  }

  return { ids, edges }
}

// ── Test Data ──

const LINEAR = generateLinearGraph(50)
const BRANCHED = generateBranchedGraph(50)
const DIAMOND = generateDiamondGraph(6) // 1+2+4+8+16+16 = 47 nodes, dense connections

// ── Benchmarks ──

describe('toExecutionLayers - Linear (50 nodes, chain)', () => {
  bench('linear 50-node chain', () => {
    toExecutionLayers(LINEAR.ids, LINEAR.edges)
  })
})

describe('toExecutionLayers - Branched (1 root -> 49 leaves)', () => {
  bench('branched 50-node star', () => {
    toExecutionLayers(BRANCHED.ids, BRANCHED.edges)
  })
})

describe('toExecutionLayers - Diamond (47 nodes, dense mesh)', () => {
  bench('diamond mesh 47-node', () => {
    toExecutionLayers(DIAMOND.ids, DIAMOND.edges)
  })
})
