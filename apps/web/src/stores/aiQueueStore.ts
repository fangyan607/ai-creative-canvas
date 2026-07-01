// ---------------------------------------------------------------------------
// AIQueueStore — Per-provider FIFO queues with rate limiter integration
// and serial execution loop (D-02, D-03, D-04)
//
// Per D-02: Each provider gets its own FIFO queue. Enqueuing for a provider
// that has no queue creates one automatically.
//
// Per D-03: The processQueue loop calls checkRateLimit() before every
// dequeue. If rate-limited, it waits via setTimeout and retries.
//
// Per D-04 (fail-stop): If a job's executor throws, the node is marked
// 'error' in EngineStore, the enqueue promise is rejected, and the queue
// continues to the next job.
//
// enqueue returns a Promise<ExecutorOutput> — the caller awaits the result
// of the job's execution. Internally, a pending map links job IDs to
// resolve/reject callbacks that fire when processQueue completes the job.
//
// The store calls useEngineStore.setNodeStatus() directly to reflect the
// 'executing' -> 'done'/'error' lifecycle in the node status indicator.
// ---------------------------------------------------------------------------

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { checkRateLimit } from '@ac-canvas/ai-core/config/rateLimits'
import { useNodeGraphStore } from './nodeGraphStore'
import { useEngineStore } from './engineStore'
import type { ExecutorOutput } from '../engine/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AIJob {
  id: string
  nodeId: string
  providerId: string
  executor: (
    nodeData: Record<string, unknown>,
    inputs: Record<string, unknown>,
  ) => Promise<ExecutorOutput>
  nodeData: Record<string, unknown>
  inputs: Record<string, unknown>
}

/** Internal pending promise tracking. */
interface JobPromise {
  resolve: (value: ExecutorOutput) => void
  reject: (reason: unknown) => void
}

export interface AIQueueStoreState {
  /** Per-provider FIFO queues. Keyed by provider ID (e.g. 'openai', 'stability'). */
  queues: Record<string, AIJob[]>
  /** Per-provider execution timestamps for sliding-window rate limiting. */
  timestamps: Record<string, number[]>
  /** True while processQueue is actively processing a provider's queue. */
  processing: Record<string, boolean>

  // Actions

  /**
   * Enqueue a job for a given provider.
   * Returns a Promise that resolves with the ExecutorOutput when the job
   * completes, or rejects if the executor throws or the queue is cancelled.
   */
  enqueue: (
    providerId: string,
    job: Omit<AIJob, 'id'>,
  ) => Promise<ExecutorOutput>

  /**
   * Process the next job(s) in a provider's queue.
   * Runs a serial loop: while queue not empty, check rate limit, dequeue,
   * execute, record timestamp. If rate-limited, waits via setTimeout.
   */
  processQueue: (providerId: string) => Promise<void>

  /** Cancel all pending jobs across all providers. Rejects all pending promises. */
  cancelAll: () => void

  /** Cancel all pending jobs for a specific provider. */
  cancelProvider: (providerId: string) => void
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAIQueueStore = create<AIQueueStoreState>()(
  immer((set, get) => {
    // Internal: map jobId -> { resolve, reject } for promise-based enqueue
    const pending = new Map<string, JobPromise>()

    return {
      queues: {},
      timestamps: {},
      processing: {},

      enqueue: (providerId, job) => {
        return new Promise<ExecutorOutput>((resolve, reject) => {
          const fullJob: AIJob = {
            ...job,
            providerId,
            id: crypto.randomUUID(),
          }
          pending.set(fullJob.id, { resolve, reject })

          set((state) => {
            if (!state.queues[providerId]) {
              state.queues[providerId] = []
            }
            state.queues[providerId].push(fullJob)
          })

          // Note: processQueue is NOT auto-started here. The caller (e.g. AI Bridge
          // or NodeEngine) calls processQueue(providerId) after enqueueing.
          // This keeps the queue state observable for testing and avoids
          // race conditions between enqueue and processing.
        })
      },

      processQueue: async (providerId) => {
        set((state) => {
          state.processing[providerId] = true
        })

        try {
          while (true) {
            const currentState = get()
            const queue = currentState.queues[providerId] ?? []
            if (queue.length === 0) break

            // Check rate limit
            const { allowed, waitMs } = checkRateLimit(
              providerId,
              currentState.timestamps[providerId] ?? [],
            )

            if (!allowed) {
              // Wait for rate limit window to reset, then recheck
              await new Promise((resolve) => setTimeout(resolve, waitMs))
              continue
            }

            // Dequeue next job
            const job = queue[0]
            set((s) => {
              s.queues[providerId] = queue.slice(1)
            })

            // Node existence verification (Pitfall 3 mitigation — prevent stale
            // status updates on nodes deleted while queued). If the node no longer
            // exists in the graph, reject the pending promise silently and skip.
            const nodeExists = useNodeGraphStore.getState().nodes.some(
              (n) => n.id === job.nodeId,
            )
            if (!nodeExists) {
              const p = pending.get(job.id)
              if (p) {
                p.reject(new Error('Node deleted'))
                pending.delete(job.id)
              }
              continue
            }

            // Set node status to executing
            useEngineStore.getState().setNodeStatus(job.nodeId, 'executing')

            try {
              const result = await job.executor(job.nodeData, job.inputs)

              // Record timestamp after successful execution
              const execTime = Date.now()
              set((s) => {
                if (!s.timestamps[providerId]) {
                  s.timestamps[providerId] = []
                }
                s.timestamps[providerId].push(execTime)
              })

              // Set node status to done
              useEngineStore.getState().setNodeStatus(job.nodeId, 'done')

              // Resolve the enqueue promise
              const p = pending.get(job.id)
              if (p) {
                p.resolve(result)
                pending.delete(job.id)
              }
            } catch (err) {
              // D-04: fail-stop — node marked error, promise rejected
              useEngineStore.getState().setNodeStatus(job.nodeId, 'error')
              useEngineStore.getState().setNodeError(
                job.nodeId,
                err instanceof Error ? err.message : String(err),
              )

              const p = pending.get(job.id)
              if (p) {
                p.reject(err)
                pending.delete(job.id)
              }
            }
          }
        } finally {
          set((state) => {
            state.processing[providerId] = false
          })
        }
      },

      cancelAll: () => {
        // Reject all pending promises outside immer to avoid unhandled
        // rejection inside the set callback.
        const snapshot = new Map(pending)
        pending.clear()
        for (const [, p] of snapshot) {
          p.reject(new Error('Queue cancelled'))
        }
        set((state) => {
          state.queues = {}
          state.timestamps = {}
        })
      },

      cancelProvider: (providerId) => {
        // Reject pending promises for this provider outside immer
        const jobs = get().queues[providerId] ?? []
        for (const job of jobs) {
          const p = pending.get(job.id)
          if (p) {
            pending.delete(job.id)
            p.reject(new Error('Queue cancelled'))
          }
        }
        set((state) => {
          delete state.queues[providerId]
          delete state.timestamps[providerId]
        })
      },
    }
  }),
)
