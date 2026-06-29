import { useState, useCallback } from 'react'
import { CanvasWrapper } from './components/CanvasWrapper'
import { LayerPanel } from './components/LayerPanel'
import { SaveButton } from './components/SaveButton'
import { useAutoSave } from './hooks/useAutoSave'

function App() {
  const [projectId, setProjectId] = useState<number | null>(null)

  // D-15: Auto-save on canvas changes with 180ms debounce
  useAutoSave({ projectId })

  const handleProjectIdChange = useCallback((id: number) => {
    setProjectId(id)
  }, [])

  return (
    <div className="w-screen h-screen overflow-hidden flex relative">
      <LayerPanel />
      <div className="flex-1">
        <SaveButton
          projectId={projectId}
          onProjectIdChange={handleProjectIdChange}
        />
        <CanvasWrapper />
      </div>
    </div>
  )
}

export default App
