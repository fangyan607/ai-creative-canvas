import { useEffect, useRef } from 'react'
import { useCanvasStore } from '../stores/canvasStore'
import { useNodeGraphStore } from '../stores/nodeGraphStore'
import { projectService } from '../indexedb/projectService'

/**
 * Auto-saves canvas and node graph state to IndexedDB when either changes.
 * D-15: 180ms debounce matches history merge window.
 * Triggered only when projectId is set (an existing project is active).
 */
export function useAutoSave(projectId: number | null) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const lastSavedCanvasRef = useRef('')
  const lastSavedGraphRef = useRef('')
  const projectIdRef = useRef(projectId)
  projectIdRef.current = projectId

  const save = async () => {
    const pid = projectIdRef.current
    if (pid === null) return

    const canvasStr = JSON.stringify(useCanvasStore.getState().serialize())
    const graphStr = JSON.stringify(useNodeGraphStore.getState().serialize())

    if (canvasStr === lastSavedCanvasRef.current && graphStr === lastSavedGraphRef.current) return

    lastSavedCanvasRef.current = canvasStr
    lastSavedGraphRef.current = graphStr

    const canvasParsed = JSON.parse(canvasStr)
    await projectService.update(pid, {
      canvasState: canvasStr,
      viewport: JSON.stringify(canvasParsed.viewport),
      nodeGraph: graphStr,
    })
  }

  useEffect(() => {
    if (projectId === null) return

    const debounced = () => {
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(save, 180)
    }

    const u1 = useCanvasStore.subscribe(() => debounced())
    const u2 = useNodeGraphStore.subscribe(() => debounced())

    return () => {
      u1()
      u2()
      clearTimeout(debounceRef.current)
    }
  }, [projectId])
}
