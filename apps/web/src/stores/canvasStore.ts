import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export interface Viewport {
  x: number
  y: number
  zoom: number
}

export interface CanvasStoreState {
  elements: Record<string, any>
  viewport: Viewport
  selectedElementIds: Record<string, boolean>
  isDragging: boolean
  elementOrder: string[]
  excalidrawAPI: any | null

  setElements: (elements: readonly any[]) => void
  updateElement: (id: string, props: Partial<any>) => void
  addElement: (el: any) => void
  removeElements: (ids: string[]) => void
  setViewport: (viewport: Viewport) => void
  setSelectedElementIds: (ids: Record<string, boolean>) => void
  setIsDragging: (dragging: boolean) => void
  setExcalidrawAPI: (api: any) => void
  serialize: () => { elements: any[]; viewport: Viewport }
  loadSerialized: (state: { elements: any[]; viewport: Viewport }) => void
}

export const useCanvasStore = create<CanvasStoreState>()(
  immer((set, get) => ({
    elements: {},
    viewport: { x: 0, y: 0, zoom: 1 },
    selectedElementIds: {},
    isDragging: false,
    elementOrder: [],
    excalidrawAPI: null,

    setElements: (elements) =>
      set((state) => {
        // Clear existing elements and rebuild from array
        state.elements = {}
        state.elementOrder = []
        for (const el of elements) {
          state.elements[el.id] = el
          state.elementOrder.push(el.id)
        }
      }),

    updateElement: (id, props) =>
      set((state) => {
        if (state.elements[id]) {
          Object.assign(state.elements[id], props)
        }
      }),

    addElement: (el) =>
      set((state) => {
        state.elements[el.id] = el
        state.elementOrder.push(el.id)
      }),

    removeElements: (ids) =>
      set((state) => {
        for (const id of ids) {
          delete state.elements[id]
        }
        state.elementOrder = state.elementOrder.filter((id) => !ids.includes(id))
      }),

    setViewport: (viewport) =>
      set((state) => {
        state.viewport = viewport
      }),

    setSelectedElementIds: (ids) =>
      set((state) => {
        state.selectedElementIds = ids
      }),

    setIsDragging: (dragging) =>
      set((state) => {
        state.isDragging = dragging
      }),

    setExcalidrawAPI: (api) =>
      set((state) => {
        state.excalidrawAPI = api
      }),

    serialize: () => {
      const state = get()
      return {
        elements: state.elementOrder
          .map((id) => state.elements[id])
          .filter(Boolean)
          .map((el: any) => {
            const clean = { ...el }
            delete clean.isSelected
            delete clean.dragging
            delete clean.measured
            return clean
          }),
        viewport: { ...state.viewport },
      }
    },

    loadSerialized: (serialized) =>
      set((state) => {
        state.elements = {}
        state.elementOrder = []
        for (const el of serialized.elements) {
          state.elements[el.id] = el
          state.elementOrder.push(el.id)
        }
        state.viewport = { ...serialized.viewport }
      }),
  })),
)
