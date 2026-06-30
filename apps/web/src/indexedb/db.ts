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

// D-14: Single-table design with auto-increment id
// Schema: ++id = auto-increment primary key
//         &name = unique index on name
//         createdAt, updatedAt = indexed for sorting
export class AICreativeCanvasDB extends Dexie {
  projects!: EntityTable<ProjectRecord, 'id'>

  constructor() {
    super('AICreativeCanvas')
    this.version(1).stores({
      projects: '++id, &name, createdAt, updatedAt',
    })
  }
}

export const db = new AICreativeCanvasDB()
