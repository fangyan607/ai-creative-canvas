// ---------------------------------------------------------------------------
// LayerPanel / LayerListContent — Element layer management.
//
// LayerListContent (inner) renders the element list from canvasStore — used
// inside TabbedSidebar as the "图层" (Layers) tab content.
// LayerPanel (outer wrapper) is a backward-compat export for the standalone
// right-side panel used before Phase 7 introduced the tabbed sidebar.
// ---------------------------------------------------------------------------

import { useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useCanvasStore } from '../stores/canvasStore'

// ---------------------------------------------------------------------------
// Icon mapping for element types
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<string, string> = {
  rectangle: 'Rectangle',
  ellipse: 'Ellipse',
  diamond: 'Diamond',
  arrow: 'Arrow',
  line: 'Line',
  freedraw: 'Free Draw',
  text: 'Text',
  image: 'Image',
  frame: 'Frame',
  'ai-image': 'AI Image',
  embeddable: 'Embeddable',
  iframe: 'IFrame',
}

const TYPE_ICONS: Record<string, string> = {
  rectangle: '▭',
  ellipse: '○',
  diamond: '◇',
  arrow: '→',
  line: '╱',
  freedraw: '✎',
  text: 'T',
  image: '🖼',
  frame: '▢',
  'ai-image': '✨',
}

// ---------------------------------------------------------------------------
// LayerListContent — renders the element list (used inside TabbedSidebar)
// ---------------------------------------------------------------------------

export function LayerListContent() {
  // Fine-grained selectors per D-24
  const elements = useCanvasStore(
    useShallow((s) => s.elementOrder.map((id) => s.elements[id]).filter(Boolean)),
  )
  const selectedIds = useCanvasStore(
    useShallow((s) =>
      Object.keys(s.selectedElementIds).filter(
        (id) => s.selectedElementIds[id],
      ),
    ),
  )

  // Derive actions from store — never subscribe to entire store
  const moveElementUp = useCanvasStore((s) => s.moveElementUp)
  const moveElementDown = useCanvasStore((s) => s.moveElementDown)
  const moveElementToTop = useCanvasStore((s) => s.moveElementToTop)
  const moveElementToBottom = useCanvasStore((s) => s.moveElementToBottom)
  const toggleElementLock = useCanvasStore((s) => s.toggleElementLock)
  const toggleElementHide = useCanvasStore((s) => s.toggleElementHide)
  const groupElements = useCanvasStore((s) => s.groupElements)
  const removeElements = useCanvasStore((s) => s.removeElements)

  const handleDelete = useCallback(
    (id: string) => {
      removeElements([id])
    },
    [removeElements],
  )

  const handleGroupSelection = useCallback(() => {
    if (selectedIds.length >= 2) {
      groupElements(selectedIds)
    }
  }, [selectedIds, groupElements])

  if (elements.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-4 text-center">
        请绘制一些内容
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Batch actions */}
      {selectedIds.length >= 2 && (
        <div className="px-3 py-1.5 border-b border-sidebar-border flex gap-1 shrink-0">
          <button
            onClick={handleGroupSelection}
            className="text-xs px-2 py-1 bg-accent/30 text-accent-foreground rounded hover:bg-accent/50 transition-colors"
            title="Group selected"
          >
            Group {selectedIds.length}
          </button>
        </div>
      )}

      {/* Element list */}
      <div className="flex-1 overflow-y-auto">
        {elements.map((el: any) => {
          if (!el) return null
          const isSelected = selectedIds.includes(el.id)
          const typeLabel = TYPE_LABELS[el.type] || el.type
          const icon = TYPE_ICONS[el.type] || '?'
          const isHidden = el.customData?.hidden === true

          return (
            <div
              key={el.id}
              className={[
                'flex items-center gap-1 px-3 py-1.5 text-sm border-b border-sidebar-border/50',
                'hover:bg-sidebar-accent cursor-pointer group',
                isSelected
                  ? 'bg-accent/20 border-l-2 border-l-accent'
                  : '',
                isHidden ? 'opacity-40' : '',
              ].join(' ')}
            >
              {/* Type icon */}
              <span
                className="text-xs w-5 text-center text-sidebar-foreground/50"
                title={typeLabel}
              >
                {icon}
              </span>

              {/* Element name/label */}
              <span className="flex-1 truncate text-sidebar-foreground text-xs">
                {el.customData?.name || typeLabel}
                {isHidden && (
                  <span className="text-sidebar-foreground/40 ml-1">(hidden)</span>
                )}
              </span>

              {/* Layer controls (appear on hover) */}
              <div className="hidden group-hover:flex items-center gap-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    moveElementUp(el.id)
                  }}
                  className="p-0.5 hover:bg-sidebar-accent rounded text-sidebar-foreground/50"
                  title="Move up"
                >
                  {'↑'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    moveElementDown(el.id)
                  }}
                  className="p-0.5 hover:bg-sidebar-accent rounded text-sidebar-foreground/50"
                  title="Move down"
                >
                  {'↓'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleElementLock(el.id)
                  }}
                  className={[
                    'p-0.5 rounded',
                    el.locked
                      ? 'text-amber-500'
                      : 'text-sidebar-foreground/40 hover:bg-sidebar-accent',
                  ].join(' ')}
                  title={el.locked ? 'Unlock' : 'Lock'}
                >
                  {'🔒'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleElementHide(el.id)
                  }}
                  className={[
                    'p-0.5 rounded',
                    isHidden
                      ? 'text-sidebar-foreground/30'
                      : 'text-sidebar-foreground/40 hover:bg-sidebar-accent',
                  ].join(' ')}
                  title={isHidden ? 'Show' : 'Hide'}
                >
                  {'👁'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(el.id)
                  }}
                  className="p-0.5 hover:bg-destructive/10 rounded text-sidebar-foreground/40 hover:text-destructive"
                  title="Delete"
                >
                  {'✕'}
                </button>
              </div>

              {/* Always-visible state indicators */}
              <div className="flex items-center gap-0.5">
                {el.locked && (
                  <span className="text-[10px] text-amber-500" title="Locked">
                    {'🔒'}
                  </span>
                )}
                {isHidden && (
                  <span className="text-[10px] text-sidebar-foreground/30" title="Hidden">
                    {'👁'}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// LayerPanel — backward-compat export with outer container and save buttons
// (kept for reference, no longer used in Phase 7+ shell)
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { projectService } from '../indexedb/projectService'

interface LayerPanelProps {
  projectId: number | null
  onProjectIdChange: (id: number) => void
}

export function LayerPanel({ projectId, onProjectIdChange }: LayerPanelProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [showSaveAs, setShowSaveAs] = useState(false)

  const handleSave = useCallback(async () => {
    if (!projectId) { setShowSaveAs(true); return }
    setIsSaving(true)
    try {
      const serialized = useCanvasStore.getState().serialize()
      await projectService.update(projectId, {
        canvasState: JSON.stringify(serialized),
        viewport: JSON.stringify(serialized.viewport),
      })
    } finally { setIsSaving(false) }
  }, [projectId])

  const handleSaveAs = useCallback(async (name: string) => {
    if (!name.trim()) return
    setIsSaving(true)
    try {
      const serialized = useCanvasStore.getState().serialize()
      const newId = await projectService.save({
        name: name.trim(),
        canvasState: JSON.stringify(serialized),
        viewport: JSON.stringify(serialized.viewport),
      })
      onProjectIdChange(newId)
      setShowSaveAs(false)
    } finally { setIsSaving(false) }
  }, [onProjectIdChange])

  return (
    <div className="w-64 h-full bg-white border-l border-gray-200 flex flex-col">
      <div className="flex-1 overflow-hidden">
        <LayerListContent />
      </div>
      <div className="flex justify-center gap-2 px-3 py-3 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50 text-gray-700 font-medium"
        >
          {isSaving ? '保存中...' : '保存'}
        </button>
        <button
          onClick={() => setShowSaveAs(true)}
          className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 text-gray-700 font-medium"
        >
          另存
        </button>
      </div>
      {showSaveAs && (
        <SaveAsDialog
          onSubmit={handleSaveAs}
          onClose={() => setShowSaveAs(false)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SaveAsDialog — inline modal for saving a new project
// ---------------------------------------------------------------------------

function SaveAsDialog({
  onSubmit,
  onClose,
}: {
  onSubmit: (name: string) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(name)
  }

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-xl p-4 w-72"
      >
        <h3 className="text-sm font-semibold text-gray-700 mb-2">保存项目</h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="项目名称"
          autoFocus
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded
                     focus:outline-none focus:border-indigo-500 mb-3"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="px-3 py-1 text-xs bg-indigo-600 text-white rounded
                       hover:bg-indigo-700 disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </form>
    </div>
  )
}
