import type { ExcalidrawElement } from '@ac-canvas/excalidraw/element/types'

export type GenerationStatus = 'idle' | 'queued' | 'generating' | 'done' | 'error'

export interface AIElement extends Omit<ExcalidrawElement, 'type'> {
  type: 'ai-image'
  prompt: string
  aiProvider: string
  generationParams: Record<string, unknown>
  generationStatus: GenerationStatus
  imageBlobId: string | null
}

export interface CanvasSerializedState {
  elements: Array<Record<string, unknown>>
  viewport: { x: number; y: number; zoom: number }
}

export interface Viewport {
  x: number
  y: number
  zoom: number
}
