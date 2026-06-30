// ---------------------------------------------------------------------------
// GroupNode — React Flow custom node for sub-groups (D-06, D-07, D-08)
//
// Groups are named containers that organize child nodes.
// Collapse hides children and their edges (handled by NodeEditorOverlay).
// Single-level only per D-08 (nested groups deferred).
// ---------------------------------------------------------------------------

import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { type NodeProps } from '@xyflow/react'
import { ChevronDown, ChevronRight, GripHorizontal } from 'lucide-react'
import type { GroupNodeData } from '@ac-canvas/shared'
import { useNodeGraphStore } from '../../../../apps/web/src/stores/nodeGraphStore'

type GroupNodeProps = NodeProps & {
  data: GroupNodeData
}

function GroupNodeComponent({ id, data, selected }: GroupNodeProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(data.name || 'Group')
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const toggleCollapse = useCallback(() => {
    const store = useNodeGraphStore.getState()
    const groupNode = store.nodes.find((n) => n.id === id)
    if (!groupNode || groupNode.type !== 'group') return
    const currentlyCollapsed = (groupNode.data as any).collapsed === true
    store.setGroupCollapsed(id, !currentlyCollapsed)
  }, [id])

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true)
  }, [])

  const handleBlur = useCallback(() => {
    setIsEditing(false)
    if (editName.trim() && editName !== data.name) {
      useNodeGraphStore.getState().renameGroup(id, editName.trim())
    }
  }, [id, editName, data.name])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false)
    }
    if (e.key === 'Escape') {
      setEditName(data.name || 'Group')
      setIsEditing(false)
    }
  }, [data.name])

  const collapsed = data.collapsed === true

  return (
    <div
      className={`
        min-w-[200px] min-h-[60px] bg-[var(--color-surface-secondary)]/60
        rounded-[var(--radius-lg)] border-2 border-dashed
        ${selected
          ? 'border-[var(--color-ink)] ring-2 ring-[var(--color-ink)]/20'
          : 'border-[var(--color-hairline)]'
        }
        transition-all duration-200
      `}
      style={{
        width: collapsed ? 200 : undefined,
        height: collapsed ? 60 : undefined,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-hairline)]/50 cursor-pointer select-none"
        onDoubleClick={handleDoubleClick}
      >
        {/* Collapse/expand toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleCollapse()
          }}
          className="p-0.5 hover:bg-[var(--color-surface-hover)] rounded cursor-pointer transition-colors"
          aria-label={collapsed ? 'Expand group' : 'Collapse group'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>

        {/* Grip handle */}
        <GripHorizontal size={12} className="text-[var(--color-muted-foreground)]" />

        {/* Name */}
        {isEditing ? (
          <input
            ref={inputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="flex-1 text-sm font-semibold bg-white border border-[var(--color-hairline)] rounded px-1 py-0.5 outline-none"
          />
        ) : (
          <span className="flex-1 text-sm font-semibold text-[var(--color-foreground)] truncate">
            {data.name || 'Group'}
          </span>
        )}

        {/* Node count badge */}
        {!collapsed && (
          <span className="text-[10px] text-[var(--color-muted-foreground)] bg-[var(--color-surface-hover)] px-1.5 py-0.5 rounded-full">
            {data.params?.length ?? 0}
          </span>
        )}
      </div>

      {/* Group body (only visible when expanded) */}
      {!collapsed && (
        <div className="p-4 min-h-[80px]">
          {/* Children render inside this area via React Flow's parentId mechanism */}
        </div>
      )}
    </div>
  )
}

export const GroupNode = memo(GroupNodeComponent)
