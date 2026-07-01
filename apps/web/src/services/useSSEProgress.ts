// ---------------------------------------------------------------------------
// useSSEProgress — React Hook mapping SSE events to EngineStore
//
// Provides a singleton SSEService instance (initialized via initSSE()) and a
// React hook that registers handlers for progress/error/done events, mapping
// them to EngineStore actions (setNodeStatus, setNodeError).
//
// Per D-07: Only activates when VITE_AI_PROXY_MODE === 'proxy'.
// In direct mode (default), initSSE() and useSSEProgress() are no-ops.
// Per D-01: The SSE path replaces direct adapter EventEmitter in proxy mode.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react'
import { SSEService } from './sseService'
import { useEngineStore } from '../stores/engineStore'

/** Singleton SSEService instance. Created once by initSSE(). */
let sseServiceInstance: SSEService | null = null

/**
 * Internal proxy mode check.
 * Looks at multiple sources:
 * 1. Module-level test override (for Vitest tests)
 * 2. import.meta.env (for Vite browser builds)
 * Any source returning 'proxy' activates proxy mode.
 * Returns false if all sources are absent or not 'proxy'.
 */
let _testProxyMode: string | undefined

/**
 * For testing: override the proxy mode check.
 * Calling with undefined clears the override.
 */
export function __setProxyMode(value: string | undefined): void {
  _testProxyMode = value
}

function isProxyMode(): boolean {
  // 1. Test override (set via __setProxyMode in tests)
  if (_testProxyMode === 'proxy') return true
  if (_testProxyMode === 'direct') return false

  // 2. Vite build-time env var (compile-time constant)
  try {
    if (
      typeof import.meta !== 'undefined' &&
      typeof (import.meta as any).env !== 'undefined' &&
      (import.meta as any).env.VITE_AI_PROXY_MODE === 'proxy'
    ) {
      return true
    }
  } catch {
    // import.meta not available
  }

  return false
}

/**
 * Initializes the singleton SSEService connection.
 * Only creates a connection when VITE_AI_PROXY_MODE === 'proxy'.
 * Safe to call multiple times — only one SSEService instance is created.
 */
export function initSSE(): void {
  if (!isProxyMode()) return
  if (!sseServiceInstance) {
    sseServiceInstance = new SSEService()
    sseServiceInstance.connect()
  }
}

/**
 * Destroys the singleton SSEService connection.
 * Safe to call even if no connection is active.
 */
export function destroySSE(): void {
  sseServiceInstance?.disconnect()
  sseServiceInstance = null
}

/**
 * React hook that maps SSE progress/error/done events to EngineStore.
 *
 * Registers handlers on mount:
 * - 'progress' -> setNodeStatus(nodeId, 'executing')
 * - 'error'    -> setNodeStatus(nodeId, 'error') + setNodeError(nodeId, message)
 * - 'done'     -> setNodeStatus(nodeId, 'done')
 *
 * Unsubscribes all handlers on unmount.
 * No-op when VITE_AI_PROXY_MODE !== 'proxy' or before initSSE() is called.
 */
export function useSSEProgress(): void {
  const setNodeStatus = useEngineStore((s) => s.setNodeStatus)
  const setNodeError = useEngineStore((s) => s.setNodeError)
  const initialized = useRef(false)

  useEffect(() => {
    if (!isProxyMode()) return
    if (!sseServiceInstance || initialized.current) return

    initialized.current = true

    const unsubProgress = sseServiceInstance.on('progress', (payload) => {
      setNodeStatus(payload.nodeId, 'executing')
    })

    const unsubError = sseServiceInstance.on('error', (payload) => {
      setNodeStatus(payload.nodeId, 'error')
      if (payload.message) {
        setNodeError(payload.nodeId, payload.message)
      }
    })

    const unsubDone = sseServiceInstance.on('done', (payload) => {
      setNodeStatus(payload.nodeId, 'done')
    })

    return () => {
      unsubProgress()
      unsubError()
      unsubDone()
      initialized.current = false
    }
  }, [setNodeStatus, setNodeError])
}

/** For testing: reset the singleton (only used in tests). */
export function __resetSSESingleton(): void {
  sseServiceInstance = null
}
