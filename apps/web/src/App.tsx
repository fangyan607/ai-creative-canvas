import { useState, useCallback, useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { CanvasWrapper } from './components/CanvasWrapper'
import { LayerPanel } from './components/LayerPanel'
import { SaveButton } from './components/SaveButton'
import { useAutoSave } from './hooks/useAutoSave'
import { useAutoExecute } from './hooks/useAutoExecute'
import { useEngineStore } from './stores/engineStore'
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
  useAutoExecute()

  const handleProjectIdChange = useCallback((id: number) => {
    setProjectId(id)
  }, [])

  const handleFocusModeChange = useCallback((mode: 'canvas' | 'nodes') => {
    setFocusMode(mode)
  }, [setFocusMode])

  // Execution state (for status indicator)
  const isExecuting = useEngineStore((s) => s.isExecuting)
  const nodeErrors = useEngineStore(useShallow((s) => Object.keys(s.nodeErrors).length > 0 ? s.nodeErrors : {}))
  const errorCount = Object.keys(nodeErrors).length

  // Reserve Ctrl+Enter for future execution trigger (Phase 5)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        // Phase 5 will wire this to explicit execution trigger
        // Phase 3: auto-execute is already active, so this is a no-op
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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

        {/* Execution status indicator — bottom-right */}
        <div className="absolute bottom-4 right-4 z-50 flex items-center gap-2">
          {isExecuting && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-[var(--color-hairline)] rounded-full text-[11px] text-[var(--color-muted-foreground)] shadow-sm">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Executing...</span>
            </div>
          )}
          {errorCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 border border-red-200 rounded-full text-[11px] text-red-600 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>{errorCount} error{errorCount > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right sidebar — PropertyPanel visible when a node is selected */}
      <PropertyPanel selectedNodeId={selectedNodeId} />
    </div>
  )
}

export default App
