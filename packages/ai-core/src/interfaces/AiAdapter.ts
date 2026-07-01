// ---------------------------------------------------------------------------
// AiAdapter — Abstract base class for all AI provider adapters
// ---------------------------------------------------------------------------
// Every AI provider (OpenAI, Stability, Mock) must extend this class and
// implement the four mandatory abstract methods. The EventEmitter base
// provides progress reporting that Phase 5 will wire into SSE streaming.
// ---------------------------------------------------------------------------

import { EventEmitter } from 'eventemitter3'
import type { AdapterResult, ConnectionResult, ModelDescriptor, ConfigField } from './types'

export abstract class AiAdapter extends EventEmitter {
  // --- Instance metadata (D-06) ---
  abstract readonly providerId: string
  abstract readonly providerName: string
  abstract readonly defaultBaseUrl: string

  // --- Mandatory methods (D-02) ---
  abstract execute(
    nodeData: Record<string, unknown>,
    inputs: Record<string, unknown>,
    onStoreImage?: (blob: Blob) => Promise<string>,
  ): Promise<AdapterResult>

  abstract testConnection(): Promise<ConnectionResult>

  abstract getModels(): ModelDescriptor[]

  abstract getConfigSchema(): ConfigField[]
}
