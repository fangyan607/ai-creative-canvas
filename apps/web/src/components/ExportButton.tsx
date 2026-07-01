// ---------------------------------------------------------------------------
// ExportButton — One-click export + advanced dropdown.
//
// D-08: Quick one-click "导出 PNG" with adjacent dropdown arrow for
// advanced options (format, resolution, background).
// D-09: No export preview — export proceeds directly to download.
//
// Uses Excalidraw's exportToBlob for canvas rendering.
// Import path: @ac-canvas/excalidraw (re-exports from /utils/export.ts)
// ---------------------------------------------------------------------------

import { useState, useCallback } from 'react'
import { ChevronDown, Download } from 'lucide-react'
import { exportToBlob } from '@ac-canvas/excalidraw'
import { useCanvasStore } from '@/stores/canvasStore'
import { useUIPreferencesStore } from '@/stores/stubs/uiPreferencesStore'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { ExportDialog } from '@/components/ExportDialog'

// ---------------------------------------------------------------------------
// Helper: trigger browser download from a blob
// ---------------------------------------------------------------------------

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExportButton() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const exportDefaults = useUIPreferencesStore((s) => s.exportDefaults)

  const doExport = useCallback(
    async (
      format: 'png' | 'jpg',
      scale: number,
      background: 'transparent' | 'white',
    ) => {
      const api = useCanvasStore.getState().excalidrawAPI
      if (!api) return

      const appState = api.getAppState()
      const elements = api.getSceneElements()

      const blob = await exportToBlob({
        elements,
        appState: {
          ...appState,
          exportWithDarkMode: false,
          exportBackground: background === 'white',
          viewBackgroundColor:
            background === 'white' ? '#ffffff' : 'transparent',
        } as any,
        files: null,
        exportPadding: 0, // viewport-only export per D-09
        exportScale: scale,
      })

      const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png'
      const finalBlob =
        format === 'jpg'
          ? new Blob([blob], { type: 'image/jpeg' })
          : blob

      downloadBlob(finalBlob, `canvas-export.${format}`)
    },
    [],
  )

  const handleQuickExport = useCallback(() => {
    doExport(
      exportDefaults.format,
      exportDefaults.scale,
      exportDefaults.background,
    )
  }, [doExport, exportDefaults])

  return (
    <>
      <div className="flex items-center gap-0">
        <Button
          onClick={handleQuickExport}
          size="sm"
          className="rounded-r-none"
        >
          <Download size={16} />
          导出 PNG
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              size="sm"
              variant="outline"
              className="rounded-l-none border-l-0 px-1.5"
            >
              <ChevronDown size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={4}>
            <DropdownMenuItem onClick={() => setDialogOpen(true)}>
              导出为...
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => doExport('png', 1, 'transparent')}>
              PNG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => doExport('jpg', 1, 'white')}>
              JPG
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ExportDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
