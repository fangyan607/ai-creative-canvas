// ---------------------------------------------------------------------------
// AIQueueStore Tests
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useAIQueueStore } from '../aiQueueStore'
import { useEngineStore } from '../engineStore'
import { useNodeGraphStore } from '../nodeGraphStore'
import type { ExecutorOutput } from '../../engine/types'
import * as rateLimits from '@ac-canvas/ai-core/config/rateLimits'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockExecutor(output: ExecutorOutput = { imageBlobId: 'test' }) {
  return vi.fn().mockResolvedValue(output)
}

function createFailingExecutor(errorMsg = 'Execution failed') {
  return vi.fn().mockRejectedValue(new Error(errorMsg))
}

/** Silence unhandled rejection from an enqueue promise (e.g. when cancelling). */
function silence(promise: Promise<unknown>): void {
  promise.catch(() => { /* expected */ })
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('AIQueueStore', () => {
  beforeEach(() => {
    useAIQueueStore.setState({
      queues: {},
      timestamps: {},
      processing: {},
    })
    useEngineStore.setState({
      nodeStatus: {},
      nodeErrors: {},
      lastExecutedAt: null,
      isExecuting: false,
      queuedNodeIds: [],
    })
    useNodeGraphStore.setState({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      focusMode: 'nodes',
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // -------------------------------------------------------------------------
  // Test 1: enqueue adds job to provider queue
  // -------------------------------------------------------------------------
  it('enqueue adds job to provider queue', () => {
    silence(useAIQueueStore.getState().enqueue('openai', {
      nodeId: 'node-1',
      executor: createMockExecutor(),
      nodeData: { prompt: 'test' },
      inputs: {},
    }))

    const state = useAIQueueStore.getState()
    expect(state.queues['openai']).toHaveLength(1)
    expect(state.queues['openai'][0].nodeId).toBe('node-1')
    expect(state.queues['openai'][0].providerId).toBe('openai')
  })

  // -------------------------------------------------------------------------
  // Test 2: enqueue creates new queue for unknown provider
  // -------------------------------------------------------------------------
  it('enqueue creates new queue for unknown provider', () => {
    silence(useAIQueueStore.getState().enqueue('unknown-provider', {
      nodeId: 'node-1',
      executor: createMockExecutor(),
      nodeData: {},
      inputs: {},
    }))

    const state = useAIQueueStore.getState()
    expect(state.queues['unknown-provider']).toBeDefined()
    expect(state.queues['unknown-provider']).toHaveLength(1)
  })

  // -------------------------------------------------------------------------
  // Test 3: enqueue generates unique job IDs
  // -------------------------------------------------------------------------
  it('enqueue generates unique job IDs', () => {
    silence(useAIQueueStore.getState().enqueue('openai', {
      nodeId: 'node-1', executor: createMockExecutor(), nodeData: {}, inputs: {},
    }))
    silence(useAIQueueStore.getState().enqueue('openai', {
      nodeId: 'node-2', executor: createMockExecutor(), nodeData: {}, inputs: {},
    }))

    const state = useAIQueueStore.getState()
    expect(state.queues['openai']).toHaveLength(2)
    expect(state.queues['openai'][0].id).not.toBe(state.queues['openai'][1].id)
  })

  // -------------------------------------------------------------------------
  // Test 4: processQueue executes jobs in FIFO order
  // -------------------------------------------------------------------------
  it('processQueue executes jobs in FIFO order', async () => {
    const executor1 = createMockExecutor({ result: 'first' })
    const executor2 = createMockExecutor({ result: 'second' })

    // Add nodes to graph so existence check passes
    useNodeGraphStore.getState().addNode('textToImage', { x: 0, y: 0 })
    useNodeGraphStore.getState().addNode('textToImage', { x: 100, y: 0 })
    const nodeId1 = useNodeGraphStore.getState().nodes[0].id
    const nodeId2 = useNodeGraphStore.getState().nodes[1].id

    useAIQueueStore.getState().enqueue('mock', {
      nodeId: nodeId1, executor: executor1, nodeData: {}, inputs: {},
    })
    useAIQueueStore.getState().enqueue('mock', {
      nodeId: nodeId2, executor: executor2, nodeData: {}, inputs: {},
    })

    await useAIQueueStore.getState().processQueue('mock')

    expect(executor1).toHaveBeenCalledTimes(1)
    expect(executor2).toHaveBeenCalledTimes(1)

    // Executor 1 should be called before executor 2 (FIFO order)
    expect(executor1.mock.invocationCallOrder[0]).toBeLessThan(
      executor2.mock.invocationCallOrder[0],
    )

    const state = useAIQueueStore.getState()
    expect(state.timestamps['mock']).toBeDefined()
    expect(state.timestamps['mock'].length).toBe(2)
    expect(state.queues['mock']).toHaveLength(0)
  })

  // -------------------------------------------------------------------------
  // Test 5: processQueue respects rate limits
  // -------------------------------------------------------------------------
  it('processQueue respects rate limits', async () => {
    // Mock checkRateLimit to deny on first call, allow on second
    const spy = vi.spyOn(rateLimits, 'checkRateLimit')
    spy
      .mockReturnValueOnce({ allowed: false, waitMs: 100 })
      .mockReturnValue({ allowed: true, waitMs: 0 })

    // Add node to graph so existence check passes
    useNodeGraphStore.getState().addNode('textToImage', { x: 0, y: 0 })
    const nodeId = useNodeGraphStore.getState().nodes[0].id

    vi.useFakeTimers()
    const executor = createMockExecutor()
    silence(useAIQueueStore.getState().enqueue('openai', {
      nodeId,
      executor,
      nodeData: {},
      inputs: {},
    }))

    // Process — first call to checkRateLimit returns denied, awaits 100ms
    const processPromise = useAIQueueStore.getState().processQueue('openai')

    // Advance fake timers past the waitMs
    await vi.advanceTimersByTimeAsync(101)

    await processPromise

    expect(executor).toHaveBeenCalledTimes(1)
    expect(useAIQueueStore.getState().queues['openai']).toHaveLength(0)
    expect(spy).toHaveBeenCalledTimes(2) // first denied, second allowed

    vi.useRealTimers()
  })

  // -------------------------------------------------------------------------
  // Test 6: cancelAll clears all queues and timestamps
  // -------------------------------------------------------------------------
  it('cancelAll clears all queues and timestamps', () => {
    silence(useAIQueueStore.getState().enqueue('openai', {
      nodeId: 'node-1', executor: createMockExecutor(), nodeData: {}, inputs: {},
    }))
    silence(useAIQueueStore.getState().enqueue('stability', {
      nodeId: 'node-2', executor: createMockExecutor(), nodeData: {}, inputs: {},
    }))

    expect(Object.keys(useAIQueueStore.getState().queues).length).toBe(2)

    useAIQueueStore.getState().cancelAll()

    expect(useAIQueueStore.getState().queues).toEqual({})
    expect(useAIQueueStore.getState().timestamps).toEqual({})
  })

  // -------------------------------------------------------------------------
  // Test 7: enqueue returns a Promise that resolves with ExecutorOutput
  // -------------------------------------------------------------------------
  it('enqueue returns a Promise that resolves with ExecutorOutput', async () => {
    const executor = createMockExecutor({ imageBlobId: 'blob-123' })
    useNodeGraphStore.getState().addNode('textToImage', { x: 0, y: 0 })
    const nodeId = useNodeGraphStore.getState().nodes[0].id

    const promise = useAIQueueStore.getState().enqueue('mock', {
      nodeId, executor, nodeData: { prompt: 'test' }, inputs: {},
    })

    await useAIQueueStore.getState().processQueue('mock')

    const result = await promise
    expect(result).toEqual({ imageBlobId: 'blob-123' })
  })

  // -------------------------------------------------------------------------
  // Test 8: Failed executor rejects the enqueue Promise
  // -------------------------------------------------------------------------
  it('Failed executor rejects the enqueue Promise', async () => {
    const executor = createFailingExecutor('API error: rate limited')
    useNodeGraphStore.getState().addNode('textToImage', { x: 0, y: 0 })
    const nodeId = useNodeGraphStore.getState().nodes[0].id

    const promise = useAIQueueStore.getState().enqueue('mock', {
      nodeId, executor, nodeData: {}, inputs: {},
    })

    await useAIQueueStore.getState().processQueue('mock')

    await expect(promise).rejects.toThrow('API error: rate limited')

    const engineState = useEngineStore.getState()
    expect(engineState.nodeStatus[nodeId]).toBe('error')
    expect(engineState.nodeErrors[nodeId]).toBe('API error: rate limited')
  })

  // -------------------------------------------------------------------------
  // Test 9: Concurrent processQueue for different providers does not interfere
  // -------------------------------------------------------------------------
  it('Concurrent processQueue for different providers does not interfere', async () => {
    const executorOpenAI = createMockExecutor({ provider: 'openai-result' })
    const executorStability = createMockExecutor({ provider: 'stability-result' })

    useNodeGraphStore.getState().addNode('textToImage', { x: 0, y: 0 })
    useNodeGraphStore.getState().addNode('textToImage', { x: 100, y: 0 })
    const nodeId1 = useNodeGraphStore.getState().nodes[0].id
    const nodeId2 = useNodeGraphStore.getState().nodes[1].id

    const promise1 = useAIQueueStore.getState().enqueue('openai', {
      nodeId: nodeId1, executor: executorOpenAI, nodeData: {}, inputs: {},
    })
    const promise2 = useAIQueueStore.getState().enqueue('stability', {
      nodeId: nodeId2, executor: executorStability, nodeData: {}, inputs: {},
    })

    await Promise.all([
      useAIQueueStore.getState().processQueue('openai'),
      useAIQueueStore.getState().processQueue('stability'),
    ])

    const results = await Promise.all([promise1, promise2])
    expect(results[0]).toEqual({ provider: 'openai-result' })
    expect(results[1]).toEqual({ provider: 'stability-result' })

    expect(executorOpenAI).toHaveBeenCalledTimes(1)
    expect(executorStability).toHaveBeenCalledTimes(1)

    const state = useAIQueueStore.getState()
    expect(state.timestamps['openai']).toHaveLength(1)
    expect(state.timestamps['stability']).toHaveLength(1)
  })
})
