import { describe, it, expect, beforeEach } from 'vitest'
import { db, type ProjectRecord } from '../../indexedb/db'
import { projectService } from '../../indexedb/projectService'

describe('IndexedDB — Project persistence with nodeGraph', () => {
  beforeEach(async () => {
    // Clean the database before each test
    await db.projects.clear()
  })

  it('should save and load a project with nodeGraph data', async () => {
    const nodeGraphJson = JSON.stringify({
      nodes: [
        {
          id: 'node-1',
          type: 'prompt',
          position: { x: 100, y: 200 },
          data: { nodeType: 'prompt', prompt: 'test prompt', params: [] },
        },
      ],
      edges: [],
    })

    const projectId = await projectService.save({
      name: 'Test Node Graph Project',
      canvasState: '{"elements":[],"viewport":{"x":0,"y":0,"zoom":1}}',
      viewport: '{"x":0,"y":0,"zoom":1}',
      nodeGraph: nodeGraphJson,
    })

    expect(projectId).toBeGreaterThan(0)

    const loaded = await projectService.load(projectId)
    expect(loaded).toBeDefined()
    expect(loaded!.name).toBe('Test Node Graph Project')
    expect(loaded!.nodeGraph).toBe(nodeGraphJson)

    // Verify the nodeGraph can be parsed back
    const parsed = JSON.parse(loaded!.nodeGraph!)
    expect(parsed.nodes).toHaveLength(1)
    expect(parsed.nodes[0].type).toBe('prompt')
    expect(parsed.nodes[0].data.prompt).toBe('test prompt')
    expect(parsed.edges).toHaveLength(0)
  })

  it('should allow null nodeGraph for backward compatibility', async () => {
    const projectId = await projectService.save({
      name: 'Legacy Project',
      canvasState: '{"elements":[],"viewport":{"x":0,"y":0,"zoom":1}}',
      viewport: '{"x":0,"y":0,"zoom":1}',
      // nodeGraph intentionally omitted — simulating a project saved before Phase 2
    })

    const loaded = await projectService.load(projectId)
    expect(loaded).toBeDefined()
    expect(loaded!.nodeGraph).toBeUndefined()
  })

  it('should update nodeGraph and persist the change', async () => {
    const projectId = await projectService.save({
      name: 'Update Test',
      canvasState: '{}',
      viewport: '{"x":0,"y":0,"zoom":1}',
    })

    const updatedGraph = JSON.stringify({
      nodes: [{ id: 'n1', type: 'text-to-image', position: { x: 0, y: 0 }, data: { nodeType: 'text-to-image', prompt: '', width: 1024, height: 1024, model: 'dall-e-3', seed: -1, params: [] } }],
      edges: [],
    })

    await projectService.update(projectId, { nodeGraph: updatedGraph })

    const loaded = await projectService.load(projectId)
    expect(loaded!.nodeGraph).toBe(updatedGraph)
    expect(JSON.parse(loaded!.nodeGraph!).nodes).toHaveLength(1)
  })
})
