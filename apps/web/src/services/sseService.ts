// ---------------------------------------------------------------------------
// SSEService — typed EventSource wrapper for AI progress SSE streaming
//
// Provides a connection management layer over the native EventSource API with
// typed event dispatch. Designed for the global SSE endpoint /api/sse/progress.
//
// Per D-02: Single SSE connection carries all AI progress events, differentiated
// by taskId/nodeId in the payload. Per D-04: Independently testable via mocked
// EventSource.
// ---------------------------------------------------------------------------

/** Payload shape for incoming SSE events (matching D-03 format). */
export interface SseEventPayload {
  type: 'progress' | 'error' | 'done'
  taskId: string
  nodeId: string
  providerId: string
  percent?: number
  stage?: string
  code?: string
  message?: string
  result?: Record<string, unknown>
  timestamp: number
}

/** Handler function called when an SSE event of a matching type is received. */
export type SseEventHandler = (payload: SseEventPayload) => void

/**
 * SSEService wraps a native EventSource connection to the backend SSE endpoint.
 *
 * Features:
 * - Typed event dispatch by event type ('progress', 'error', 'done', etc.)
 * - Connection lifecycle management (connect/disconnect)
 * - Reconnect attempt capping (prevents infinite reconnect loops)
 * - Per-event-type handler registration with unsubscribe support
 */
export class SSEService {
  private eventSource: EventSource | null = null
  private handlers = new Map<string, Set<SseEventHandler>>()
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 10
  private url: string

  constructor(url: string = '/api/sse/progress') {
    this.url = url
  }

  /**
   * Opens the SSE connection to the configured URL.
   * Wires event listeners for all known event types.
   */
  connect(): void {
    if (this.eventSource) return

    this.eventSource = new EventSource(this.url)

    // Reset reconnect counter on successful open
    this.eventSource.onopen = () => {
      this.reconnectAttempts = 0
    }

    // Wire standard event types
    this.eventSource.addEventListener('connected', (event: Event) => {
      const messageEvent = event as MessageEvent
      try {
        const data = JSON.parse(messageEvent.data)
        this.reconnectAttempts = 0
      } catch {
        // Malformed connected event — non-fatal
      }
    })

    this.eventSource.addEventListener('progress', (event: Event) => {
      const messageEvent = event as MessageEvent
      try {
        this.dispatch('progress', JSON.parse(messageEvent.data))
      } catch {
        // Malformed payload — skip
      }
    })

    this.eventSource.addEventListener('error', (event: Event) => {
      const messageEvent = event as MessageEvent
      if (messageEvent.data) {
        try {
          this.dispatch('error', JSON.parse(messageEvent.data))
        } catch {
          // Malformed payload — skip
        }
      }
    })

    this.eventSource.addEventListener('done', (event: Event) => {
      const messageEvent = event as MessageEvent
      try {
        this.dispatch('done', JSON.parse(messageEvent.data))
      } catch {
        // Malformed payload — skip
      }
    })

    // Heartbeat keepalive — reset reconnect counter on any heartbeat
    this.eventSource.addEventListener('heartbeat', () => {
      this.reconnectAttempts = 0
    })

    // EventSource auto-reconnects on connection loss, but we cap retries
    // to prevent infinite reconnect loops on permanent failures.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    this.eventSource.onerror = (_event: Event | string) => {
      this.reconnectAttempts++
      if (this.reconnectAttempts > this.maxReconnectAttempts) {
        this.disconnect()
      }
    }
  }

  /**
   * Closes the SSE connection.
   * Safe to call even if no connection is active.
   */
  disconnect(): void {
    this.eventSource?.close()
    this.eventSource = null
  }

  /**
   * Registers a handler for a specific SSE event type.
   *
   * @param eventType - The SSE event type (e.g., 'progress', 'error', 'done')
   * @param handler - Callback to invoke when the event type is received
   * @returns An unsubscribe function that removes the handler when called
   */
  on(eventType: string, handler: SseEventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set())
    }
    this.handlers.get(eventType)!.add(handler)

    return () => {
      this.handlers.get(eventType)?.delete(handler)
    }
  }

  /**
   * Returns whether the SSE connection is currently open.
   */
  isConnected(): boolean {
    return this.eventSource !== null
  }

  /**
   * Dispatches a parsed payload to all registered handlers for the event type.
   */
  private dispatch(eventType: string, payload: SseEventPayload): void {
    const handlers = this.handlers.get(eventType)
    if (handlers) {
      for (const handler of handlers) {
        handler(payload)
      }
    }
  }
}
