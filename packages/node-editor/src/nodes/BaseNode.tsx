// ---------------------------------------------------------------------------
// BaseNode — shared base component for all 5 node types
// ---------------------------------------------------------------------------

import { memo, type ReactNode } from 'react'
import { Handle, Position } from '@xyflow/react'
import { type SocketDef } from '@ac-canvas/shared'
import {
  MessageSquareText,
  WandSparkles,
  Palette,
  Layers,
  Eye,
  X,
  type LucideIcon,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Icon resolver — maps icon string names from nodeTypeDefinitions to Lucide
// components
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, LucideIcon> = {
  'message-square-text': MessageSquareText,
  'wand-sparkles': WandSparkles,
  'palette': Palette,
  'layers': Layers,
  'eye': Eye,
}

export function getNodeIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || MessageSquareText
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface BaseNodeProps {
  type: string
  icon: LucideIcon
  label: string
  selected: boolean
  children: ReactNode
  sockets: SocketDef[]
  accentColor?: string
  onDelete?: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function BaseNodeComponent({
  icon: Icon,
  label,
  selected,
  children,
  sockets,
  accentColor,
  onDelete,
}: BaseNodeProps) {
  const inputSockets = sockets.filter(s => s.side === 'input')
  const outputSockets = sockets.filter(s => s.side === 'output')

  return (
    <div
      className={`group min-w-[200px] max-w-[360px] bg-white rounded-[var(--radius-md)] border border-[var(--color-hairline)] relative ${
        selected ? 'ring-2 ring-[var(--color-ink)] shadow-[0_4px_16px_rgba(0,0,0,0.06)]' : ''
      }`}
    >
      {/* Accent bar */}
      <div
        className="h-[4px] w-full rounded-t-[var(--radius-md)]"
        style={{ backgroundColor: accentColor || 'var(--color-hairline)' }}
      />

      {/* Header */}
      <div className="px-3 py-1.5 flex items-center gap-2 text-sm font-semibold">
        <Icon size={14} className="shrink-0" />
        <span>{label}</span>
        {onDelete && (
          <button
            className="ml-auto opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity hover:text-[var(--color-destructive)]"
            onClick={onDelete}
            aria-label="Delete node"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-3 pb-3">{children}</div>

      {/* Sockets */}
      <div className="relative">
        {/* Input sockets (left side) */}
        {inputSockets.map(socket => (
          <div
            key={socket.id}
            className="absolute left-0 flex items-center gap-1"
            style={{
              top: `${4 + inputSockets.indexOf(socket) * 28}px`,
              transform: 'translateX(-50%)',
            }}
          >
            <Handle
              type="target"
              position={Position.Left}
              id={socket.id}
              style={{
                background: 'var(--color-socket-input)',
                width: 12,
                height: 12,
                border: '2px solid white',
                position: 'relative',
                top: 0,
                left: 0,
              }}
            />
            <span className="ml-2 text-[11px] text-[var(--color-muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {socket.label}
            </span>
          </div>
        ))}

        {/* Output sockets (right side) */}
        {outputSockets.map(socket => (
          <div
            key={socket.id}
            className="absolute right-0 flex items-center gap-1"
            style={{
              top: `${4 + outputSockets.indexOf(socket) * 28}px`,
              transform: 'translateX(50%)',
            }}
          >
            <span className="mr-2 text-[11px] text-[var(--color-muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none order-first">
              {socket.label}
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id={socket.id}
              style={{
                background: 'var(--color-socket-output)',
                width: 12,
                height: 12,
                border: '2px solid white',
                position: 'relative',
                top: 0,
                right: 0,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export const BaseNode = memo(BaseNodeComponent)
