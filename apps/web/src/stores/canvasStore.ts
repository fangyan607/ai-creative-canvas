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

  // Layer management actions (added in Plan 04)
  moveElementUp: (id: string) => void
  moveElementDown: (id: string) => void
  moveElementToTop: (id: string) => void
  moveElementToBottom: (id: string) => void
  toggleElementLock: (id: string) => void
  toggleElementHide: (id: string) => void
  groupElements: (ids: string[]) => void
  ungroupElement: (id: string) => void
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

    // Layer management actions (Plan 04)
    moveElementUp: (id) =>
      set((state) => {
        const idx = state.elementOrder.indexOf(id)
        if (idx < state.elementOrder.length - 1) {
          const next = state.elementOrder[idx + 1]
          state.elementOrder[idx + 1] = id
          state.elementOrder[idx] = next
          _updateExcalidrawScene(state)
        }
      }),

    moveElementDown: (id) =>
      set((state) => {
        const idx = state.elementOrder.indexOf(id)
        if (idx > 0) {
          const prev = state.elementOrder[idx - 1]
          state.elementOrder[idx - 1] = id
          state.elementOrder[idx] = prev
          _updateExcalidrawScene(state)
        }
      }),

    moveElementToTop: (id) =>
      set((state) => {
        const idx = state.elementOrder.indexOf(id)
        if (idx >= 0) {
          state.elementOrder.splice(idx, 1)
          state.elementOrder.push(id)
          _updateExcalidrawScene(state)
        }
      }),

    moveElementToBottom: (id) =>
      set((state) => {
        const idx = state.elementOrder.indexOf(id)
        if (idx >= 0) {
          state.elementOrder.splice(idx, 1)
          state.elementOrder.unshift(id)
          _updateExcalidrawScene(state)
        }
      }),

    toggleElementLock: (id) =>
      set((state) => {
        if (state.elements[id]) {
          state.elements[id].locked = !state.elements[id].locked
          _updateExcalidrawScene(state)
        }
      }),

    toggleElementHide: (id) =>
      set((state) => {
        if (state.elements[id]) {
          const el = state.elements[id]
          const currentlyHidden = el.customData?.hidden === true
          if (currentlyHidden) {
            // Show: restore opacity and remove hidden flag
            el.opacity = 100
            el.customData = { ...el.customData, hidden: false }
          } else {
            // Hide: set opacity to near-invisible and set hidden flag
            el.opacity = 5
            el.customData = { ...el.customData, hidden: true }
          }
          _updateExcalidrawScene(state)
        }
      }),

    groupElements: (ids) =>
      set((state) => {
        const groupId = crypto.randomUUID()
        for (const id of ids) {
          if (state.elements[id]) {
            state.elements[id].groupIds = [
              ...(state.elements[id].groupIds || []),
              groupId,
            ]
          }
        }
        _updateExcalidrawScene(state)
      }),

    ungroupElement: (id) =>
      set((state) => {
        if (state.elements[id]) {
          state.elements[id].groupIds = []
        }
        _updateExcalidrawScene(state)
      }),
  })),
)

// Helper: propagate CanvasStore element order/locks/groups/visibility to Excalidraw's internal scene
// Uses the excalidrawAPI ref stored via setExcalidrawAPI (Plan 03 cross-plan contract)
function _updateExcalidrawScene(state: CanvasStoreState) {
  const api = state.excalidrawAPI
  if (!api) return
  const reorderedElements = state.elementOrder
    .map((id) => state.elements[id])
    .filter(Boolean)
  api.updateScene({
    elements: reorderedElements,
    captureUpdate: 'never', // Don't add programmatic reorders to undo stack
  })
}
