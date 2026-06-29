import { describe, it, expect, beforeEach } from 'vitest'
import { useCanvasStore } from '../../stores/canvasStore'
import type { Viewport } from '../../stores/canvasStore'

// Helper to create a minimal mock element
function createMockElement(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    type: 'rectangle',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    angle: 0,
    strokeColor: '#000',
    backgroundColor: '#fff',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    index: null,
    roundness: null,
    seed: 12345,
    version: 1,
    versionNonce: 0,
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    ...overrides,
  }
}

describe('CanvasStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useCanvasStore.setState({
      elements: {},
      viewport: { x: 0, y: 0, zoom: 1 },
      selectedElementIds: {},
      isDragging: false,
      elementOrder: [],
      excalidrawAPI: null,
    })
  })

  it('Test 1: setElements replaces all elements in store', () => {
    const el1 = createMockElement('el1')
    const el2 = createMockElement('el2')

    useCanvasStore.getState().setElements([el1, el2])

    const state = useCanvasStore.getState()
    expect(state.elements['el1']).toEqual(el1)
    expect(state.elements['el2']).toEqual(el2)
    expect(state.elementOrder).toEqual(['el1', 'el2'])
  })

  it('Test 2: updateElement patches only specified props on existing element', () => {
    const el = createMockElement('el1', { x: 10, y: 20, width: 200 })
    useCanvasStore.getState().setElements([el])

    useCanvasStore.getState().updateElement('el1', { x: 100, width: 300 })

    const updated = useCanvasStore.getState().elements['el1']
    expect(updated.x).toBe(100)
    expect(updated.width).toBe(300)
    // y and other props should remain unchanged
    expect(updated.y).toBe(20)
  })

  it('Test 3: addElement inserts new element into the elements map', () => {
    const el = createMockElement('newEl')
    useCanvasStore.getState().addElement(el)

    const state = useCanvasStore.getState()
    expect(state.elements['newEl']).toEqual(el)
    expect(state.elementOrder).toContain('newEl')
  })

  it('Test 4: removeElements deletes specified element IDs', () => {
    const el1 = createMockElement('a')
    const el2 = createMockElement('b')
    const el3 = createMockElement('c')
    useCanvasStore.getState().setElements([el1, el2, el3])

    useCanvasStore.getState().removeElements(['a', 'c'])

    const state = useCanvasStore.getState()
    expect(state.elements['a']).toBeUndefined()
    expect(state.elements['c']).toBeUndefined()
    expect(state.elements['b']).toBeDefined()
    expect(state.elementOrder).toEqual(['b'])
  })

  it('Test 5: serialize() exports clean elements without transient props', () => {
    const el = createMockElement('serializeMe', {
      isSelected: true,
      dragging: true,
      measured: { w: 100, h: 100 },
    })
    useCanvasStore.getState().setElements([el])

    const serialized = useCanvasStore.getState().serialize()

    expect(serialized.elements).toHaveLength(1)
    expect(serialized.elements[0].isSelected).toBeUndefined()
    expect(serialized.elements[0].dragging).toBeUndefined()
    expect(serialized.elements[0].measured).toBeUndefined()
    // Core props survive
    expect(serialized.elements[0].id).toBe('serializeMe')
    expect(serialized.elements[0].x).toBe(0)
    expect(serialized.viewport).toEqual({ x: 0, y: 0, zoom: 1 })
  })

  it('Test 6: loadSerialized() restores elements and viewport from serialized state', () => {
    const serializedState = {
      elements: [
        createMockElement('loaded1', { x: 50, y: 150 }),
        createMockElement('loaded2', { x: 250, y: 350 }),
      ],
      viewport: { x: 100, y: 200, zoom: 1.5 },
    }

    useCanvasStore.getState().loadSerialized(serializedState)

    const state = useCanvasStore.getState()
    expect(state.elements['loaded1']).toBeDefined()
    expect(state.elements['loaded2']).toBeDefined()
    expect(state.elements['loaded1'].x).toBe(50)
    expect(state.elements['loaded2'].x).toBe(250)
    expect(state.viewport).toEqual({ x: 100, y: 200, zoom: 1.5 })
    expect(state.elementOrder).toEqual(['loaded1', 'loaded2'])
  })

  it('Test 7: setViewport updates scroll X, scroll Y, and zoom', () => {
    const newViewport: Viewport = { x: 500, y: -200, zoom: 2.5 }
    useCanvasStore.getState().setViewport(newViewport)

    expect(useCanvasStore.getState().viewport).toEqual(newViewport)
  })

  it('Test 8: setIsDragging toggles the dragging flag', () => {
    useCanvasStore.getState().setIsDragging(true)
    expect(useCanvasStore.getState().isDragging).toBe(true)

    useCanvasStore.getState().setIsDragging(false)
    expect(useCanvasStore.getState().isDragging).toBe(false)
  })

  it('Test 9: setExcalidrawAPI stores the API reference in state (cross-plan contract)', () => {
    expect(useCanvasStore.getState().excalidrawAPI).toBeNull()

    const mockApi = { getSceneElements: () => [], updateScene: () => {} }
    useCanvasStore.getState().setExcalidrawAPI(mockApi)

    expect(useCanvasStore.getState().excalidrawAPI).toBe(mockApi)
  })
})
