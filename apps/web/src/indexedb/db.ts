import Dexie, { type EntityTable } from 'dexie'

export interface ProjectRecord {
  id?: number
  name: string
  canvasState: string  // JSON string of CanvasSerializedState
  viewport: string     // JSON string of viewport
  nodeGraph?: string   // JSON string of NodeGraphSerialized; optional for backward compatibility
  createdAt: Date
  updatedAt: Date
}

// D-08: New table for provider configurations (global scope, not per-project)
export interface ProviderConfigRecord {
  providerId: string    // 'openai', 'stability', 'mock'
  encryptedApiKey: string  // AES-256-GCM encrypted + base64 encoded
  encryptionIv: string     // base64-encoded IV
  keyVersion: string       // 'v0.1' — versioned key scheme per Pitfall 6
  baseUrl: string
  selectedModel?: string
  isEnabled: boolean
  updatedAt: number
}

// D-14: Single-table design with auto-increment id
// Schema: ++id = auto-increment primary key
//         &name = unique index on name
//         createdAt, updatedAt = indexed for sorting
export class AICreativeCanvasDB extends Dexie {
  projects!: EntityTable<ProjectRecord, 'id'>
  providerConfigs!: EntityTable<ProviderConfigRecord, 'providerId'>

  constructor() {
    super('AICreativeCanvas')
    this.version(1).stores({
      projects: '++id, &name, createdAt, updatedAt',
    })
    // D-08: Version 2 adds providerConfig table (global scope, not per-project)
    this.version(2).stores({
      projects: '++id, &name, createdAt, updatedAt',
      providerConfigs: '&providerId, updatedAt',  // &providerId = unique primary key
    })
  }
}

export const db = new AICreativeCanvasDB()
