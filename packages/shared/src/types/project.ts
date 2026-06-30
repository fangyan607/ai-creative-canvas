export interface Project {
  id?: number
  name: string
  canvasState: string
  viewport: string
  nodeGraph?: string  // JSON string of NodeGraphSerialized; optional for backward compatibility
  createdAt: Date
  updatedAt: Date
}
