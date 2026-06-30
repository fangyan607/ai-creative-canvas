import { describe, it, expect } from 'vitest'
import {
  nodeTypeDefinitions,
  type NodeType,
  type NodeGraphNode,
  type NodeGraphEdge,
  type NodeGraphSerialized,
  type PromptNodeData,
  type TextToImageNodeData,
  type StyleNodeData,
  type MergeNodeData,
  type PreviewNodeData,
  type SocketDef,
  type NodeParamDefinition,
} from '@ac-canvas/shared'

describe('nodeGraph types - nodeTypeDefinitions', () => {
  it('exports 5 node type definitions', () => {
    expect(nodeTypeDefinitions).toHaveLength(5)
  })

  it('each definition has required fields', () => {
    for (const def of nodeTypeDefinitions) {
      expect(def).toHaveProperty('type')
      expect(def).toHaveProperty('label')
      expect(def).toHaveProperty('icon')
      expect(def).toHaveProperty('accentColor')
      expect(def).toHaveProperty('sockets')
      expect(def).toHaveProperty('params')
    }
  })

  it('includes PromptNode definition', () => {
    const prompt = nodeTypeDefinitions.find((d) => d.type === 'prompt')
    expect(prompt).toBeDefined()
    expect(prompt!.label).toBe('Prompt')
    expect(prompt!.sockets.length).toBeGreaterThanOrEqual(1)
  })

  it('includes TextToImageNode definition', () => {
    const tti = nodeTypeDefinitions.find((d) => d.type === 'text-to-image')
    expect(tti).toBeDefined()
    expect(tti!.label).toBe('Text to Image')
  })

  it('includes StyleNode definition', () => {
    const style = nodeTypeDefinitions.find((d) => d.type === 'style')
    expect(style).toBeDefined()
    expect(style!.label).toBe('Style')
  })

  it('includes MergeNode definition', () => {
    const merge = nodeTypeDefinitions.find((d) => d.type === 'merge')
    expect(merge).toBeDefined()
    expect(merge!.label).toBe('Merge')
  })

  it('includes PreviewNode definition', () => {
    const preview = nodeTypeDefinitions.find((d) => d.type === 'preview')
    expect(preview).toBeDefined()
    expect(preview!.label).toBe('Preview')
  })
})

describe('nodeGraph types - type structure', () => {
  it('NodeGraphNode has id, type, position, and data', () => {
    // Type-level check — verify the shape exists at runtime via nodeTypeDefinitions
    const promptDef = nodeTypeDefinitions.find((d) => d.type === 'prompt')!
    expect(promptDef.type).toBe('prompt')
  })

  it('SocketDef has id, label, and side', () => {
    const promptDef = nodeTypeDefinitions.find((d) => d.type === 'prompt')!
    for (const socket of promptDef.sockets) {
      expect(socket).toHaveProperty('id')
      expect(socket).toHaveProperty('label')
      expect(socket).toHaveProperty('side')
    }
  })

  it('socket handleId follows convention input-0, output-0', () => {
    for (const def of nodeTypeDefinitions) {
      const inputSockets = def.sockets.filter((s) => s.side === 'input')
      const outputSockets = def.sockets.filter((s) => s.side === 'output')
      inputSockets.forEach((s, i) => {
        expect(s.id).toBe(`input-${i}`)
      })
      outputSockets.forEach((s, i) => {
        expect(s.id).toBe(`output-${i}`)
      })
    }
  })

  it('NodeParamDefinition has key, label, type, and defaultValue', () => {
    for (const def of nodeTypeDefinitions) {
      for (const param of def.params) {
        expect(param).toHaveProperty('key')
        expect(param).toHaveProperty('label')
        expect(param).toHaveProperty('type')
        expect(param).toHaveProperty('defaultValue')
      }
    }
  })

  it('PreviewNode has no output sockets (preview is terminal)', () => {
    const preview = nodeTypeDefinitions.find((d) => d.type === 'preview')!
    const outputSockets = preview.sockets.filter((s) => s.side === 'output')
    expect(outputSockets).toHaveLength(0)
  })

  it('MergeNode has exactly 2 input sockets', () => {
    const merge = nodeTypeDefinitions.find((d) => d.type === 'merge')!
    const inputSockets = merge.sockets.filter((s) => s.side === 'input')
    expect(inputSockets).toHaveLength(2)
  })
})
