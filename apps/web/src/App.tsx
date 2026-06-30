import { useState, useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { CanvasWrapper } from './components/CanvasWrapper'
import { LayerPanel } from './components/LayerPanel'
import { SaveButton } from './components/SaveButton'
import { useAutoSave } from './hooks/useAutoSave'
import { useNodeGraphStore } from './stores/nodeGraphStore'
import { NodeEditorOverlay } from '@ac-canvas/node-editor'
import { PropertyPanel } from '@ac-canvas/node-editor'
import { FocusModeToggle } from '@ac-canvas/node-editor'

function App() {
  const [projectId, setProjectId] = useState<number | null>(null)

  // Node editor state (fine-grained selectors per D-24)
  const focusMode = useNodeGraphStore(useShallow((s) => s.focusMode))
  const selectedNodeId = useNodeGraphStore(useShallow((s) => s.selectedNodeId))
  const setFocusMode = useNodeGraphStore((s) => s.setFocusMode)

  const isNodeMode = focusMode === 'nodes'

  useAutoSave(projectId)

  const handleProjectIdChange = useCallback((id: number) => {
    setProjectId(id)
  }, [])

  const handleFocusModeChange = useCallback((mode: 'canvas' | 'nodes') => {
    setFocusMode(mode)
  }, [setFocusMode])

  return (
    <div className="w-screen h-screen overflow-hidden flex relative">
      {/* Left sidebar — LayerPanel always visible */}
      <LayerPanel />

      {/* Center area — contains canvas + node overlay stacked */}
      <div className="flex-1 relative">
        <SaveButton
          projectId={projectId}
          onProjectIdChange={handleProjectIdChange}
        />

        {/* Canvas — disabled when in node mode */}
        <CanvasWrapper disabled={isNodeMode} />

        {/* Node editor overlay — interactive only in node mode */}
        <NodeEditorOverlay
          focusMode={focusMode}
          onFocusModeChange={handleFocusModeChange}
        />

        {/* Focus mode toggle — top-left over both canvas and overlay */}
        <FocusModeToggle
          focusMode={focusMode}
          onChange={handleFocusModeChange}
        />
      </div>

      {/* Right sidebar — PropertyPanel visible when a node is selected */}
      <PropertyPanel selectedNodeId={selectedNodeId} />
    </div>
  )
}

export default App
