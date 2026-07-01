// ---------------------------------------------------------------------------
// Template definitions — 2 hardcoded quick-start templates (D-45, D-47)
// Text-to-Image: PromptNode -> TextToImageNode -> PreviewNode
// Style Transfer: StyleNode -> TextToImageNode -> PreviewNode
// ---------------------------------------------------------------------------

import type { NodeGraphSerialized } from '@ac-canvas/shared'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Template {
  id: string
  name: string
  description: string
  graph: NodeGraphSerialized
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export const TEMPLATES: Template[] = [
  {
    id: 'text-to-image',
    name: 'Text-to-Image',
    description: 'PromptNode -> TextToImageNode -> PreviewNode',
    graph: {
      nodes: [
        {
          id: 'prompt-1',
          type: 'prompt',
          position: { x: -200, y: 0 },
          data: {
            nodeType: 'prompt',
            prompt: 'A beautiful landscape',
            params: [],
          },
        },
        {
          id: 'tti-1',
          type: 'text-to-image',
          position: { x: 100, y: 0 },
          data: {
            nodeType: 'text-to-image',
            prompt: 'A beautiful landscape',
            width: 1024,
            height: 1024,
            model: 'DALL-E 3',
            seed: 42,
            params: [],
          },
        },
        {
          id: 'preview-1',
          type: 'preview',
          position: { x: 400, y: 0 },
          data: {
            nodeType: 'preview',
            generatedImageId: null,
            params: [],
          },
        },
      ],
      edges: [
        { id: 'e-prompt-tti', source: 'prompt-1', target: 'tti-1', sourceHandle: 'output-0', targetHandle: 'input-0' },
        { id: 'e-tti-preview', source: 'tti-1', target: 'preview-1', sourceHandle: 'output-0', targetHandle: 'input-0' },
      ],
    },
  },
  {
    id: 'style-transfer',
    name: 'Style Transfer',
    description: 'Canvas Image -> StyleNode -> TextToImageNode -> PreviewNode',
    graph: {
      nodes: [
        {
          id: 'style-1',
          type: 'style',
          position: { x: -300, y: 0 },
          data: {
            nodeType: 'style',
            styleReferenceId: null,
            stylePreset: 'default',
            params: [],
          },
        },
        {
          id: 'tti-2',
          type: 'text-to-image',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'text-to-image',
            prompt: 'Styled output',
            width: 1024,
            height: 1024,
            model: 'DALL-E 3',
            seed: 42,
            params: [],
          },
        },
        {
          id: 'preview-2',
          type: 'preview',
          position: { x: 300, y: 0 },
          data: {
            nodeType: 'preview',
            generatedImageId: null,
            params: [],
          },
        },
      ],
      edges: [
        { id: 'e-style-tti', source: 'style-1', target: 'tti-2', sourceHandle: 'output-0', targetHandle: 'input-0' },
        { id: 'e-tti-prev', source: 'tti-2', target: 'preview-2', sourceHandle: 'output-0', targetHandle: 'input-0' },
      ],
    },
  },
]

// ---------------------------------------------------------------------------
// applyTemplate — returns a deep-cloned graph for the given template ID
// ---------------------------------------------------------------------------

export function applyTemplate(templateId: string): NodeGraphSerialized | null {
  const template = TEMPLATES.find((t) => t.id === templateId)
  return template ? structuredClone(template.graph) : null
}
