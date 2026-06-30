// ---------------------------------------------------------------------------
// Node Graph Shared Types — consumed by NodeGraphStore (Plan 02-02),
// custom React Flow node components (Plan 02-03), and PropertyPanel
// (Plan 02-04).
// ---------------------------------------------------------------------------

/** The 5 core workflow node types plus 'group' for visual grouping (Phase 3). */
export type NodeType =
  | 'prompt'
  | 'text-to-image'
  | 'style'
  | 'merge'
  | 'preview'
  | 'group'

/** Whether a socket is an input (left side) or output (right side). */
export type SocketSide = 'input' | 'output'

/**
 * A socket definition describes a connection point on a node.
 * `id` follows the handleId convention: "input-0", "input-1", "output-0", etc.
 */
export interface SocketDef {
  id: string
  label: string
  side: SocketSide
}

/**
 * A parameter definition consumed by PropertyPanel to render a form field.
 * `defaultValue` is used when creating a fresh node instance.
 */
export interface NodeParamDefinition {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'file'
  defaultValue: unknown
  options?: string[]
}

// ---------------------------------------------------------------------------
// Node Data Types (discriminated union on nodeType)
// ---------------------------------------------------------------------------

export interface PromptNodeData {
  nodeType: 'prompt'
  prompt: string
  params: NodeParamDefinition[]
}

export interface TextToImageNodeData {
  nodeType: 'text-to-image'
  prompt: string
  width: number
  height: number
  model: string
  seed: number
  params: NodeParamDefinition[]
}

export interface StyleNodeData {
  nodeType: 'style'
  styleReferenceId: string | null
  stylePreset: string
  params: NodeParamDefinition[]
}

export interface MergeNodeData {
  nodeType: 'merge'
  blendMode: string
  params: NodeParamDefinition[]
}

export interface PreviewNodeData {
  nodeType: 'preview'
  generatedImageId: string | null
  params: NodeParamDefinition[]
}

export interface GroupNodeData {
  nodeType: 'group'
  name: string
  collapsed: boolean
  params: []
}

/** Union of all 5 workflow node data types plus GroupNodeData for discriminated type narrowing. */
export type NodeDataUnion =
  | PromptNodeData
  | TextToImageNodeData
  | StyleNodeData
  | MergeNodeData
  | PreviewNodeData
  | GroupNodeData

// ---------------------------------------------------------------------------
// Graph Structure Types
// ---------------------------------------------------------------------------

export interface NodeGraphNode {
  id: string
  type: NodeType
  position: { x: number; y: number }
  data: NodeDataUnion
  /** Optional parent group node ID for visual grouping (Phase 3). */
  parentId?: string | null
}

export interface NodeGraphEdge {
  id: string
  source: string
  target: string
  sourceHandle: string
  targetHandle: string
}

export interface NodeGraphSerialized {
  nodes: NodeGraphNode[]
  edges: NodeGraphEdge[]
}

// ---------------------------------------------------------------------------
// Execution Status (Phase 3: Node Engine)
// ---------------------------------------------------------------------------

/** Execution state of a node during DAG execution. Per D-03. */
export type ExecutionStatus =
  | 'idle'      // default — not executed or stale after graph change
  | 'queued'    // in the topological execution queue
  | 'executing' // currently running its executor
  | 'done'      // completed successfully
  | 'error'     // execution failed
  | 'skipped'   // skipped due to upstream error (D-04 fail-stop)

// ---------------------------------------------------------------------------
// Node Type Metadata (consumed by Plan 03 node components and Plan 04
// PropertyPanel)
// ---------------------------------------------------------------------------

export interface NodeTypeDefinition {
  type: NodeType
  label: string
  icon: string
  accentColor: string
  sockets: SocketDef[]
  params: NodeParamDefinition[]
}

export const nodeTypeDefinitions: NodeTypeDefinition[] = [
  {
    type: 'prompt',
    label: 'Prompt',
    icon: 'message-square-text',
    accentColor: 'var(--color-node-prompt)',
    sockets: [
      { id: 'output-0', label: 'Prompt', side: 'output' },
    ],
    params: [
      {
        key: 'prompt',
        label: 'Prompt',
        type: 'text',
        defaultValue: '',
      },
    ],
  },
  {
    type: 'text-to-image',
    label: 'Text to Image',
    icon: 'wand-sparkles',
    accentColor: 'var(--color-node-text-to-image)',
    sockets: [
      { id: 'input-0', label: 'Prompt', side: 'input' },
      { id: 'output-0', label: 'Image', side: 'output' },
    ],
    params: [
      {
        key: 'prompt',
        label: 'Prompt',
        type: 'text',
        defaultValue: '',
      },
      {
        key: 'width',
        label: 'Width',
        type: 'number',
        defaultValue: 1024,
      },
      {
        key: 'height',
        label: 'Height',
        type: 'number',
        defaultValue: 1024,
      },
      {
        key: 'model',
        label: 'Model',
        type: 'select',
        defaultValue: 'dall-e-3',
        options: ['dall-e-3', 'stable-diffusion-xl', 'stable-diffusion-3'],
      },
      {
        key: 'seed',
        label: 'Seed',
        type: 'number',
        defaultValue: -1,
      },
    ],
  },
  {
    type: 'style',
    label: 'Style',
    icon: 'palette',
    accentColor: 'var(--color-node-style)',
    sockets: [
      { id: 'input-0', label: 'Image', side: 'input' },
      { id: 'output-0', label: 'Styled Image', side: 'output' },
    ],
    params: [
      {
        key: 'stylePreset',
        label: 'Style Preset',
        type: 'select',
        defaultValue: 'none',
        options: [
          'none',
          'anime',
          'oil-painting',
          'watercolor',
          'pencil-sketch',
          'pixel-art',
          'cyberpunk',
          'vintage',
        ],
      },
      {
        key: 'styleReferenceId',
        label: 'Style Reference',
        type: 'file',
        defaultValue: null,
      },
    ],
  },
  {
    type: 'merge',
    label: 'Merge',
    icon: 'layers',
    accentColor: 'var(--color-node-merge)',
    sockets: [
      { id: 'input-0', label: 'Image A', side: 'input' },
      { id: 'input-1', label: 'Image B', side: 'input' },
      { id: 'output-0', label: 'Merged', side: 'output' },
    ],
    params: [
      {
        key: 'blendMode',
        label: 'Blend Mode',
        type: 'select',
        defaultValue: 'normal',
        options: [
          'normal',
          'multiply',
          'screen',
          'overlay',
          'darken',
          'lighten',
          'difference',
        ],
      },
    ],
  },
  {
    type: 'preview',
    label: 'Preview',
    icon: 'eye',
    accentColor: 'var(--color-node-preview)',
    sockets: [
      { id: 'input-0', label: 'Image', side: 'input' },
    ],
    params: [
      {
        key: 'generatedImageId',
        label: 'Generated Image',
        type: 'file',
        defaultValue: null,
      },
    ],
  },
]
