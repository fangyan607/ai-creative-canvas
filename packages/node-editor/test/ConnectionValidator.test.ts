// ---------------------------------------------------------------------------
// ConnectionValidator — Test suite
// Tests for 4-step validation pipeline: self-connection, duplicate, direction,
// and cycle detection.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest'
import {
  validateConnection,
  wouldCreateCycle,
  isConnectionValid,
} from '../src/ConnectionValidator'

// Helper: create a mock edge with standard handle IDs
function mockEdge(
  source: string,
  target: string,
  overrides: Partial<{ sourceHandle: string; targetHandle: string }> = {}
) {
  return {
    source,
    target,
    sourceHandle: overrides.sourceHandle ?? 'output-0',
    targetHandle: overrides.targetHandle ?? 'input-0',
  }
}

describe('ConnectionValidator', () => {
  describe('Step 1: Self-connections', () => {
    it('should reject a connection where source === target', () => {
      const result = validateConnection('node-1', 'node-1', 'output-0', 'input-0', [])
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('Self-connection')
    })
  })

  describe('Step 2: Null handles', () => {
    it('should reject if sourceHandle is null', () => {
      const result = validateConnection('node-1', 'node-2', null, 'input-0', [])
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('Missing handle')
    })

    it('should reject if targetHandle is null', () => {
      const result = validateConnection('node-1', 'node-2', 'output-0', null, [])
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('Missing handle')
    })
  })

  describe('Step 3: Direction enforcement', () => {
    it('should reject output-to-output connections', () => {
      const result = validateConnection('node-1', 'node-2', 'output-0', 'output-0', [])
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('must end at')
    })

    it('should reject input-to-input connections', () => {
      const result = validateConnection('node-1', 'node-2', 'input-0', 'input-0', [])
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('must start from')
    })
  })

  describe('Step 4: Duplicate connections', () => {
    it('should reject duplicate source-target-handle pairs', () => {
      const existing = [mockEdge('node-1', 'node-2')]
      const result = validateConnection(
        'node-1', 'node-2', 'output-0', 'input-0', existing
      )
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('Duplicate')
    })
  })

  describe('Cycle detection (wouldCreateCycle)', () => {
    it('should detect a cycle: A->B->C->A', () => {
      const edges = [
        mockEdge('A', 'B'),
        mockEdge('B', 'C'),
      ]
      // Adding C->A would create A->B->C->A
      expect(wouldCreateCycle('C', 'A', edges)).toBe(true)
    })

    it('should pass when no cycle exists', () => {
      const edges = [
        mockEdge('A', 'B'),
        mockEdge('A', 'C'),
        mockEdge('B', 'D'),
      ]
      // Adding C->D does not create a cycle
      expect(wouldCreateCycle('C', 'D', edges)).toBe(false)
    })

    it('should not flag a simple linear chain as cyclic', () => {
      const edges = [
        mockEdge('A', 'B'),
        mockEdge('B', 'C'),
      ]
      expect(wouldCreateCycle('C', 'D', edges)).toBe(false)
    })
  })

  describe('Valid connections', () => {
    it('should pass a valid connection between two different nodes', () => {
      const result = validateConnection('node-1', 'node-2', 'output-0', 'input-0', [])
      expect(result.valid).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('should pass a valid connection in a DAG without cycles', () => {
      const edges = [mockEdge('A', 'B')]
      const result = validateConnection('A', 'C', 'output-0', 'input-0', edges)
      expect(result.valid).toBe(true)
    })
  })

  describe('isConnectionValid (convenience wrapper)', () => {
    it('should return true for a simple valid connection', () => {
      expect(isConnectionValid({
        source: 'a', target: 'b',
        sourceHandle: 'output-0', targetHandle: 'input-0',
      })).toBe(true)
    })

    it('should return false for a self-connection', () => {
      expect(isConnectionValid({
        source: 'a', target: 'a',
        sourceHandle: 'output-0', targetHandle: 'input-0',
      })).toBe(false)
    })
  })
})
