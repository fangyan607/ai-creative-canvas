// ---------------------------------------------------------------------------
// TopBar — Minimal top bar with global operations.
//
// D-02: Top bar contains only: editable project name, save status indicator,
// and view-switching icons (canvas / projects / settings).
// Height: 40px. Background: bg-secondary.
// ---------------------------------------------------------------------------

import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Image, FolderKanban, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TopBarProps {
  /** Current project name displayed in the top bar. */
  projectName: string
  /** Whether there are unsaved changes or save is in progress. */
  saving: boolean
  /** Called when the user edits the project name inline. */
  onProjectNameChange: (name: string) => void
}

// ---------------------------------------------------------------------------
// Save status text mapping (UI-SPEC copywriting contract)
// ---------------------------------------------------------------------------

const SAVE_STATUS: Record<string, string> = {
  false: '已保存',   // saved
  true: '保存中...',  // saving... (we use saving as boolean, not unsaved)
}

// ---------------------------------------------------------------------------
// View switcher items
// ---------------------------------------------------------------------------

interface ViewItem {
  path: string
  label: string
  icon: typeof Image
}

const VIEWS: ViewItem[] = [
  { path: '/', label: '画布', icon: Image },
  { path: '/projects', label: '项目', icon: FolderKanban },
  { path: '/settings', label: '设置', icon: Settings },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TopBar({ projectName, saving, onProjectNameChange }: TopBarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(projectName)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync external projectName changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(projectName)
    }
  }, [projectName, isEditing])

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleStartEdit = useCallback(() => {
    setIsEditing(true)
  }, [])

  const handleFinishEdit = useCallback(() => {
    setIsEditing(false)
    if (editValue.trim() && editValue !== projectName) {
      onProjectNameChange(editValue.trim())
    } else {
      setEditValue(projectName)
    }
  }, [editValue, projectName, onProjectNameChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleFinishEdit()
      } else if (e.key === 'Escape') {
        setEditValue(projectName)
        setIsEditing(false)
      }
    },
    [handleFinishEdit, projectName],
  )

  return (
    <div className="h-10 flex items-center gap-3 px-4 bg-secondary text-secondary-foreground border-b border-border select-none shrink-0">
      {/* App logo */}
      <span className="text-xs font-semibold tracking-wide text-muted-foreground">
        AI创意画布
      </span>

      <div className="w-px h-4 bg-border" />

      {/* Editable project name */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleFinishEdit}
          onKeyDown={handleKeyDown}
          className="text-sm bg-transparent border-b border-foreground/30 outline-none px-0.5 py-0 min-w-[120px]"
        />
      ) : (
        <span
          onClick={handleStartEdit}
          className="text-sm cursor-text hover:bg-accent/30 px-1 -ml-1 rounded transition-colors"
          title="Click to rename"
        >
          {projectName}
        </span>
      )}

      {/* Save status indicator */}
      <span className="text-xs text-muted-foreground">
        {saving ? SAVE_STATUS['true'] : SAVE_STATUS['false']}
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* View switcher */}
      <div className="flex items-center gap-1">
        {VIEWS.map((view) => {
          const isActive =
            view.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(view.path)
          const Icon = view.icon
          return (
            <button
              key={view.path}
              onClick={() => navigate(view.path)}
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-md transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground',
              )}
              title={view.label}
            >
              <Icon size={18} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
