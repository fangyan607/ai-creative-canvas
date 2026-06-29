import { describe, it, expect, beforeEach } from 'vitest'
import { projectService } from '../../indexedb/projectService'
import { db } from '../../indexedb/db'

const sampleCanvasState = {
  elements: [
    {
      id: 'el1',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
    },
  ],
  viewport: { x: 0, y: 0, zoom: 1 },
}

describe('projectService', () => {
  beforeEach(async () => {
    // Clear all projects before each test
    await db.projects.clear()
  })

  it('Test 3: save() creates a new project and returns its id', async () => {
    const id = await projectService.save({
      name: 'Test Project',
      canvasState: JSON.stringify(sampleCanvasState),
      viewport: JSON.stringify(sampleCanvasState.viewport),
    })
    expect(id).toBeGreaterThan(0)
  })

  it('Test 4: load(id) returns the saved project with all fields', async () => {
    const id = await projectService.save({
      name: 'Load Test',
      canvasState: JSON.stringify(sampleCanvasState),
      viewport: JSON.stringify(sampleCanvasState.viewport),
    })

    const loaded = await projectService.load(id)
    expect(loaded).toBeDefined()
    expect(loaded!.name).toBe('Load Test')
    expect(loaded!.canvasState).toBe(JSON.stringify(sampleCanvasState))
    expect(loaded!.viewport).toBe(JSON.stringify(sampleCanvasState.viewport))
    expect(loaded!.createdAt).toBeInstanceOf(Date)
    expect(loaded!.updatedAt).toBeInstanceOf(Date)
  })

  it('Test 5: update(id, data) modifies partial fields and updates updatedAt', async () => {
    const id = await projectService.save({
      name: 'Update Test',
      canvasState: JSON.stringify(sampleCanvasState),
      viewport: JSON.stringify(sampleCanvasState.viewport),
    })

    const before = await projectService.load(id)
    const beforeUpdatedAt = before!.updatedAt.getTime()

    // Wait a tick so updatedAt differs
    await new Promise((r) => setTimeout(r, 10))

    const newCanvasState = {
      elements: [{ id: 'el2', type: 'ellipse', x: 10, y: 10, width: 50, height: 50 }],
      viewport: { x: 0, y: 0, zoom: 1 },
    }
    await projectService.update(id, {
      canvasState: JSON.stringify(newCanvasState),
    })

    const after = await projectService.load(id)
    expect(after!.name).toBe('Update Test') // unchanged
    expect(after!.canvasState).toBe(JSON.stringify(newCanvasState))
    expect(after!.updatedAt.getTime()).toBeGreaterThan(beforeUpdatedAt)
  })

  it('Test 6: delete(id) removes project from database', async () => {
    const id = await projectService.save({
      name: 'Delete Test',
      canvasState: JSON.stringify(sampleCanvasState),
      viewport: JSON.stringify(sampleCanvasState.viewport),
    })

    await projectService.delete(id)
    const loaded = await projectService.load(id)
    expect(loaded).toBeUndefined()
  })

  it('Test 7: list() returns all projects ordered by updatedAt descending', async () => {
    const id1 = await projectService.save({
      name: 'First',
      canvasState: JSON.stringify(sampleCanvasState),
      viewport: JSON.stringify(sampleCanvasState.viewport),
    })

    // Wait a tick so timestamps differ
    await new Promise((r) => setTimeout(r, 10))

    const id2 = await projectService.save({
      name: 'Second',
      canvasState: JSON.stringify(sampleCanvasState),
      viewport: JSON.stringify(sampleCanvasState.viewport),
    })

    const projects = await projectService.list()
    expect(projects).toHaveLength(2)
    // Most recent first
    expect(projects[0].name).toBe('Second')
    expect(projects[1].name).toBe('First')
    expect(projects[0].updatedAt.getTime()).toBeGreaterThanOrEqual(
      projects[1].updatedAt.getTime(),
    )
  })

  it('Test 8: save/load roundtrip preserves canvas state JSON exactly', async () => {
    const complexState = {
      elements: [
        {
          id: 'rect1',
          type: 'rectangle',
          x: 100,
          y: 200,
          width: 300,
          height: 150,
          strokeColor: '#ff0000',
          backgroundColor: '#00ff00',
          fillStyle: 'solid',
          strokeWidth: 2,
          opacity: 80,
          groupIds: ['group1'],
          locked: true,
        },
        {
          id: 'text1',
          type: 'text',
          x: 50,
          y: 50,
          width: 200,
          height: 30,
          text: 'Hello World',
          fontSize: 20,
        },
      ],
      viewport: { x: -100, y: -50, zoom: 1.5 },
    }

    const id = await projectService.save({
      name: 'Roundtrip Test',
      canvasState: JSON.stringify(complexState),
      viewport: JSON.stringify(complexState.viewport),
    })

    const loaded = await projectService.load(id)
    expect(loaded).toBeDefined()

    const parsedState = JSON.parse(loaded!.canvasState)
    expect(parsedState).toEqual(complexState)

    const parsedViewport = JSON.parse(loaded!.viewport)
    expect(parsedViewport).toEqual(complexState.viewport)
  })

  it('Test 9: checkStorage() returns { usage, quota, percentUsed } without throwing', async () => {
    // This should work in both real browser and fake-indexeddb environment
    const result = await projectService.checkStorage()

    expect(result).toHaveProperty('usage')
    expect(result).toHaveProperty('quota')
    expect(result).toHaveProperty('percentUsed')
    expect(result).toHaveProperty('isPersistent')
    expect(typeof result.usage).toBe('number')
    expect(typeof result.quota).toBe('number')
    expect(typeof result.percentUsed).toBe('number')
    expect(typeof result.isPersistent).toBe('boolean')
    // percentUsed should be between 0 and 100
    expect(result.percentUsed).toBeGreaterThanOrEqual(0)
  })
})
