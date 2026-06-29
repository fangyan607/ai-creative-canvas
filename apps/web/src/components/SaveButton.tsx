import { useCallback, useState } from 'react'
import { useCanvasStore } from '../stores/canvasStore'
import { projectService } from '../indexedb/projectService'

interface SaveButtonProps {
  projectId: number | null
  onProjectIdChange: (id: number) => void
}

/**
 * Save / Save As buttons.
 * D-15: Save updates current project. Save As creates a new copy.
 */
export function SaveButton({ projectId, onProjectIdChange }: SaveButtonProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [showSaveAs, setShowSaveAs] = useState(false)

  const handleSave = useCallback(async () => {
    if (!projectId) {
      // No project yet — prompt for name first
      setShowSaveAs(true)
      return
    }
    setIsSaving(true)
    try {
      const serialized = useCanvasStore.getState().serialize()
      await projectService.update(projectId, {
        canvasState: JSON.stringify(serialized),
        viewport: JSON.stringify(serialized.viewport),
      })
    } finally {
      setIsSaving(false)
    }
  }, [projectId])

  const handleSaveAs = useCallback(
    async (name: string) => {
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
      } finally {
        setIsSaving(false)
      }
    },
    [onProjectIdChange],
  )

  return (
    <div className="absolute top-2 left-2 z-10 flex gap-1">
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="px-2 py-1 text-xs bg-white border border-gray-300 rounded shadow-sm
                   hover:bg-gray-50 disabled:opacity-50 text-gray-700"
      >
        {isSaving ? 'Saving...' : 'Save'}
      </button>
      <button
        onClick={() => setShowSaveAs(true)}
        className="px-2 py-1 text-xs bg-white border border-gray-300 rounded shadow-sm
                   hover:bg-gray-50 text-gray-700"
      >
        Save As
      </button>

      {/* Save As dialog */}
      {showSaveAs && (
        <SaveAsDialog
          onSubmit={handleSaveAs}
          onClose={() => setShowSaveAs(false)}
        />
      )}
    </div>
  )
}

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
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Save As</h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name"
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
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="px-3 py-1 text-xs bg-indigo-600 text-white rounded
                       hover:bg-indigo-700 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  )
}
