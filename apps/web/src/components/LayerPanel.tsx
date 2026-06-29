import { useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useCanvasStore } from '../stores/canvasStore'

// Icon mapping for element types
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

export function LayerPanel() {
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
  const ungroupElement = useCanvasStore((s) => s.ungroupElement)
  const removeElements = useCanvasStore((s) => s.removeElements)

  const handleDelete = useCallback(
    (id: string) => {
      removeElements([id])
      // Canvas scene update for deletes is handled by CanvasWrapper's onChange cycle
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
      <div className="w-64 h-full bg-white border-l border-gray-200 flex flex-col">
        <div className="p-3 border-b border-gray-200 font-semibold text-sm text-gray-500">
          Layers
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-4 text-center">
          No elements yet. Draw something on the canvas.
        </div>
      </div>
    )
  }

  return (
    <div className="w-64 h-full bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
        <span className="font-semibold text-sm text-gray-700">Layers</span>
        <span className="text-xs text-gray-400">{elements.length}</span>
      </div>

      {/* Batch actions */}
      {selectedIds.length >= 2 && (
        <div className="px-3 py-1.5 border-b border-gray-100 flex gap-1">
          <button
            onClick={handleGroupSelection}
            className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100"
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
          // Read hide state from customData.hidden (NOT isDeleted)
          const isHidden = el.customData?.hidden === true

          return (
            <div
              key={el.id}
              className={[
                'flex items-center gap-1 px-3 py-1.5 text-sm border-b border-gray-50',
                'hover:bg-gray-50 cursor-pointer group',
                isSelected
                  ? 'bg-indigo-50 border-l-2 border-l-indigo-500'
                  : '',
                isHidden ? 'opacity-40' : '',
              ].join(' ')}
            >
              {/* Type icon */}
              <span
                className="text-xs w-5 text-center text-gray-500"
                title={typeLabel}
              >
                {icon}
              </span>

              {/* Element name/label */}
              <span className="flex-1 truncate text-gray-700 text-xs">
                {el.customData?.name || typeLabel}
                {isHidden && (
                  <span className="text-gray-400 ml-1">(hidden)</span>
                )}
              </span>

              {/* Layer controls (appear on hover) */}
              <div className="hidden group-hover:flex items-center gap-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    moveElementUp(el.id)
                  }}
                  className="p-0.5 hover:bg-gray-200 rounded text-gray-500"
                  title="Move up"
                >
                  {'↑'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    moveElementDown(el.id)
                  }}
                  className="p-0.5 hover:bg-gray-200 rounded text-gray-500"
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
                      : 'text-gray-400 hover:bg-gray-200',
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
                      ? 'text-gray-300'
                      : 'text-gray-400 hover:bg-gray-200',
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
                  className="p-0.5 hover:bg-red-100 rounded text-gray-400 hover:text-red-500"
                  title="Delete"
                >
                  {'✕'}
                </button>
              </div>

              {/* Always-visible state indicators */}
              <div className="flex items-center gap-0.5">
                {el.locked && (
                  <span
                    className="text-[10px] text-amber-500"
                    title="Locked"
                  >
                    {'🔒'}
                  </span>
                )}
                {isHidden && (
                  <span className="text-[10px] text-gray-300" title="Hidden">
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
