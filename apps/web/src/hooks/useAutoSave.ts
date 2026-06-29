import { useEffect, useRef } from 'react'
import { useCanvasStore } from '../stores/canvasStore'
import { projectService } from '../indexedb/projectService'

/**
 * Auto-saves canvas state to IndexedDB when elements change.
 * D-15: 180ms debounce matches history merge window.
 * Triggered only when projectId is set (an existing project is active).
 */
export function useAutoSave({ projectId }: { projectId: number | null }) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const lastSavedRef = useRef<string>('')

  useEffect(() => {
    if (!projectId) return

    // Subscribe to CanvasStore element changes
    const unsubscribe = useCanvasStore.subscribe(
      (state) => state.elementOrder,
      () => {
        // D-15: 180ms debounce
        clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(async () => {
          const serialized = useCanvasStore.getState().serialize()
          const serializedStr = JSON.stringify(serialized)

          // Skip save if state hasn't changed since last save
          if (serializedStr === lastSavedRef.current) return
          lastSavedRef.current = serializedStr

          // D-17: Check storage before saving
          const storage = await projectService.checkStorage()
          if (storage.percentUsed > 80) {
            console.warn(
              `Storage at ${storage.percentUsed.toFixed(1)}% — consider clearing old projects`,
            )
            // Request persistent storage if not already
            if (!storage.isPersistent) {
              await projectService.requestPersistentStorage()
            }
          }

          await projectService.update(projectId, {
            canvasState: serializedStr,
            viewport: JSON.stringify(serialized.viewport),
          })
        }, 180)
      },
      { equalityFunction: Object.is },
    )

    return () => {
      unsubscribe()
      clearTimeout(debounceRef.current)
    }
  }, [projectId])
}
