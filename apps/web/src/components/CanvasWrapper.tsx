import { useCallback, useEffect, useRef, useState } from 'react'
import { Excalidraw } from '@ac-canvas/excalidraw'
import { useShallow } from 'zustand/react/shallow'
import { useCanvasStore } from '../stores/canvasStore'
import { useHistoryStore } from '../stores/historyStore'

interface CanvasWrapperProps {
  disabled?: boolean
}

export function CanvasWrapper({ disabled = false }: CanvasWrapperProps) {
  const excalidrawRef = useRef<any>(null)
  const isPointerDownRef = useRef(false)
  const [isReady, setIsReady] = useState(false)

  // D-24: Fine-grained selectors — only subscribe to what we render
  const elements = useCanvasStore(
    useShallow((s) => Object.values(s.elements)),
  )
  const viewport = useCanvasStore(
    useShallow((s) => ({ ...s.viewport })),
  )

  // Wire Excalidraw onChange to CanvasStore
  const handleChange = useCallback(
    (excalidrawElements: readonly any[], appState: any, _files: any) => {
      // D-23: During drag/resize/draw, don't commit to global store
      if (isPointerDownRef.current) return

      // Commit to CanvasStore
      useCanvasStore.getState().setElements(excalidrawElements)
      useCanvasStore.getState().setViewport({
        x: appState.scrollX ?? 0,
        y: appState.scrollY ?? 0,
        zoom: appState.zoom?.value ?? 1,
      })

      // D-09: Capture history snapshot (HistoryStore checks isPaused internally)
      useHistoryStore.getState().captureSnapshot()
    },
    [],
  )

  // D-23: Pointer event handlers for local-state-for-drag pattern
  const handlePointerDown = useCallback(() => {
    isPointerDownRef.current = true
    useCanvasStore.getState().setIsDragging(true)
    useHistoryStore.getState().setPaused(true)
  }, [])

  const handlePointerUp = useCallback(() => {
    isPointerDownRef.current = false
    useCanvasStore.getState().setIsDragging(false)
    useHistoryStore.getState().setPaused(false)

    // Commit final state after drag completes
    if (excalidrawRef.current) {
      const sceneElements = excalidrawRef.current.getSceneElements()
      const appState = excalidrawRef.current.getAppState()
      if (sceneElements) {
        useCanvasStore.getState().setElements(sceneElements)
      }
      if (appState) {
        useCanvasStore.getState().setViewport({
          x: appState.scrollX ?? 0,
          y: appState.scrollY ?? 0,
          zoom: appState.zoom?.value ?? 1,
        })
      }
    }

    // Capture one snapshot after drag completes
    useHistoryStore.getState().captureSnapshot()
  }, [])

  // D-10: Keyboard shortcut to route undo/redo through HistoryStore
  // Uses capture phase to intercept BEFORE Excalidraw's own onKeyDown
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey
      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
        useHistoryStore.getState().undo()
      }
      if ((isMod && e.key === 'z' && e.shiftKey) || (isMod && e.key === 'Z')) {
        e.preventDefault()
        e.stopPropagation()
        useHistoryStore.getState().redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () =>
      window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [])

  return (
    <div
      className={`w-full h-full relative ${disabled ? 'pointer-events-none canvas-disabled' : ''}`}
      style={{ touchAction: 'none' }}
      onPointerDown={disabled ? undefined : handlePointerDown}
      onPointerUp={disabled ? undefined : handlePointerUp}
    >
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 z-50 bg-white">
          Loading canvas...
        </div>
      )}
      {/*
        D-10: Native undo disabled
        - Excalidraw v0.18 internally uses CaptureUpdateAction.NEVER for initial
          scene load (App.tsx line 2349). All user interactions through Excalidraw
          use IMMEDIATELY, which populates Excalidraw's internal history. We
          intercept Ctrl+Z/Cmd+Z at the window level (capture phase) and route
          through our HistoryStore instead.

        D-06: Full Excalidraw toolbar/menus kept intact
        - No UIOptions overrides to hide native controls. Only the minimum needed.

        CROSS-PLAN CONTRACT: excalidrawAPI callback stores the API reference in
        CanvasStore so Plan 04's layer operations can call api.updateScene().
      */}
      <Excalidraw
        excalidrawAPI={(api: any) => {
          excalidrawRef.current = api
          // Store API in CanvasStore for Plan 04 layer operations
          useCanvasStore.getState().setExcalidrawAPI(api)
          setIsReady(true)
        }}
        onChange={handleChange}
        initialData={{
          elements: elements.length > 0 ? elements : undefined,
          appState: {
            scrollX: viewport.x,
            scrollY: viewport.y,
            zoom: { value: viewport.zoom },
          },
        }}
      />
    </div>
  )
}
