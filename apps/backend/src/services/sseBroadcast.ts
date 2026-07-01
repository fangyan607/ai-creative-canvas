// ---------------------------------------------------------------------------
// SSE Broadcast Manager — Singleton that tracks clients and broadcasts events
// ---------------------------------------------------------------------------
// Each client registers a callback function (not a stream reference directly).
// The broadcast() method iterates all callbacks with try/catch for safety.
// ---------------------------------------------------------------------------

export type SseClientCallback = (event: SseEvent) => void

export interface SseEvent {
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

export class SseBroadcastManager {
  private clients = new Map<string, SseClientCallback>()
  private static instance: SseBroadcastManager

  static getInstance(): SseBroadcastManager {
    if (!SseBroadcastManager.instance) {
      SseBroadcastManager.instance = new SseBroadcastManager()
    }
    return SseBroadcastManager.instance
  }

  addClient(id: string, callback: SseClientCallback): void {
    this.clients.set(id, callback)
  }

  removeClient(id: string): void {
    this.clients.delete(id)
  }

  broadcast(event: SseEvent): void {
    for (const [id, callback] of this.clients) {
      try {
        callback(event)
      } catch {
        // Callback threw — client likely disconnected, clean up
        this.clients.delete(id)
      }
    }
  }

  get clientCount(): number {
    return this.clients.size
  }

  /** Clear all clients — used in tests for isolation */
  clear(): void {
    this.clients.clear()
  }
}
