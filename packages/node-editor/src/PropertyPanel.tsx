// ---------------------------------------------------------------------------
// PropertyPanel -- Dynamic parameter panel that shows when a node is
// selected. Empty state shows "妙手即成" (per UI-SPEC copy contract).
// Loaded state shows per-node-type parameter fields with debounced commit.
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef, useCallback, type ChangeEvent } from 'react'
import {
  MessageSquareText,
  WandSparkles,
  Palette,
  Layers,
  Eye,
  type LucideIcon,
} from 'lucide-react'
import { type NodeDataUnion, type NodeParamDefinition, type NodeType, nodeTypeDefinitions } from '@ac-canvas/shared'
import { useNodeGraphStore } from '../../../apps/web/src/stores/nodeGraphStore'
import { Slider } from '../../../apps/web/src/components/ui/slider'
import { Input } from '../../../apps/web/src/components/ui/input'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PropertyPanelProps {
  selectedNodeId: string | null
}

// ---------------------------------------------------------------------------
// Icon resolver (same pattern as BaseNode)
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, LucideIcon> = {
  'message-square-text': MessageSquareText,
  'wand-sparkles': WandSparkles,
  palette: Palette,
  layers: Layers,
  eye: Eye,
}

function getNodeTypeIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || MessageSquareText
}

// ---------------------------------------------------------------------------
// Helper: get node type definition and default data
// ---------------------------------------------------------------------------

function getNodeTypeDef(type: string) {
  return nodeTypeDefinitions.find((d) => d.type === type as NodeType)
}

function getDefaultData(type: string): Record<string, unknown> {
  const def = getNodeTypeDef(type)
  if (!def) return {}
  const data: Record<string, unknown> = { nodeType: type }
  for (const param of def.params) {
    data[param.key] = param.defaultValue
  }
  return data
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function PropertyPanel({ selectedNodeId }: PropertyPanelProps) {
  const node = useNodeGraphStore((s) =>
    selectedNodeId ? s.nodes.find((n) => n.id === selectedNodeId) ?? null : null,
  )
  const updateNodeData = useNodeGraphStore((s) => s.updateNodeData)

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  if (!node) {
    return (
      <div className="w-72 h-full bg-white border-l border-[var(--color-hairline)] flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-[var(--color-muted-foreground)]/40 select-none">
          妙手即成
        </span>
        <span className="text-xs text-[var(--color-muted-foreground)] mt-1">
          Select a node to edit properties
        </span>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Loaded state
  // ---------------------------------------------------------------------------

  const nodeDef = getNodeTypeDef(node.type)
  if (!nodeDef) return null

  const Icon = getNodeTypeIcon(nodeDef.icon)
  const nodeData = node.data as unknown as Record<string, unknown>

  return (
    <div className="w-72 h-full bg-white border-l border-[var(--color-hairline)] flex flex-col">
      {/* Header */}
      <div className="border-b border-[var(--color-hairline)] px-3 py-2">
        <div className="flex items-center gap-2">
          <Icon size={14} />
          <span className="text-sm font-semibold">{nodeDef.label}</span>
        </div>
      </div>

      {/* Body -- parameter fields */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {nodeDef.params.map((param) => (
          <PropertyField
            key={param.key}
            param={param}
            value={nodeData[param.key]}
            onChange={(value: unknown) => {
              updateNodeData(node.id, { [param.key]: value } as Partial<NodeDataUnion>)
            }}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--color-hairline)] px-3 py-2">
        {node.type === 'preview' ? (
          <button
            disabled
            className="w-full px-4 py-1.5 bg-[var(--color-ink)] text-white text-xs font-medium rounded-[var(--radius-pill)] opacity-50 cursor-not-allowed"
            title="Coming soon -- Phase 4/5"
          >
            Apply to Canvas
          </button>
        ) : (
          <button
            onClick={() => {
              const defaults = getDefaultData(node.type)
              updateNodeData(node.id, defaults as Partial<NodeDataUnion>)
            }}
            className="w-full px-4 py-1.5 border border-[var(--color-hairline)] text-[var(--color-ink)] text-xs font-medium rounded-[var(--radius-pill)] hover:bg-[var(--color-surface-secondary)] transition-colors cursor-pointer"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  )
}

export default PropertyPanel
export { PropertyPanel }

// ---------------------------------------------------------------------------
// PropertyField -- renders the appropriate input for each param type
// ---------------------------------------------------------------------------

interface PropertyFieldProps {
  param: NodeParamDefinition
  value: unknown
  onChange: (value: unknown) => void
}

function PropertyField({ param, value, onChange }: PropertyFieldProps) {
  switch (param.type) {
    case 'text':
      return <TextField param={param} value={value as string} onChange={onChange} />
    case 'number':
      return <NumberField param={param} value={value as number} onChange={onChange} />
    case 'select':
      return <SelectField param={param} value={value as string} onChange={onChange} />
    case 'file':
      return <FileField param={param} />
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// TextField -- textarea with label and 300ms debounce
// ---------------------------------------------------------------------------

function TextField({ param, value, onChange }: PropertyFieldProps) {
  const [localValue, setLocalValue] = useState<string>((value as string) ?? '')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync from external when value prop changes
  useEffect(() => {
    setLocalValue((value as string) ?? '')
  }, [value])

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      setLocalValue(newValue)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        onChange(newValue)
      }, 300)
    },
    [onChange],
  )

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-[var(--color-muted-foreground)]">
        {param.label}
      </label>
      <textarea
        className="w-full text-sm p-2 border border-[var(--color-hairline)] rounded-[var(--radius-md)] min-h-[60px] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
        value={localValue}
        onChange={handleChange}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// NumberField -- number input with label
// ---------------------------------------------------------------------------

function NumberField({ param, value, onChange }: PropertyFieldProps) {
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value === '' ? 0 : Number(e.target.value)
      onChange(newValue)
    },
    [onChange],
  )

  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-[var(--color-muted-foreground)]">
        {param.label}
      </label>
      <div className="flex items-center gap-2">
        <Slider
          value={[(value as number) ?? 0]}
          onValueChange={([v]) => onChange(v)}
          min={param.min ?? 0}
          max={param.max ?? 100}
          step={param.step ?? 1}
          className="flex-1"
        />
        <Input
          type="number"
          value={(value as number) ?? 0}
          onChange={handleChange}
          className="w-16 h-7 text-xs"
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SelectField -- select dropdown with label
// ---------------------------------------------------------------------------

function SelectField({ param, value, onChange }: PropertyFieldProps) {
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      onChange(e.target.value)
    },
    [onChange],
  )

  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-[var(--color-muted-foreground)]">
        {param.label}
      </label>
      <select
        className="w-full text-sm p-2 border border-[var(--color-hairline)] rounded-[var(--radius-md)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)] bg-white"
        value={(value as string) ?? ''}
        onChange={handleChange}
      >
        {(param.options ?? []).map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FileField -- placeholder file upload button (disabled for MVP)
// ---------------------------------------------------------------------------

function FileField({ param }: { param: NodeParamDefinition }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-[var(--color-muted-foreground)]">
        {param.label}
      </label>
      <button
        disabled
        className="w-full px-3 py-2 text-sm border border-dashed border-[var(--color-hairline)] rounded-[var(--radius-md)] text-[var(--color-muted-foreground)] opacity-50 cursor-not-allowed"
        title="Coming soon"
      >
        Upload...
      </button>
    </div>
  )
}
