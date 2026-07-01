// ---------------------------------------------------------------------------
// ExportDialog — Export configuration modal with format, scale, and
// background options.
//
// D-08: Format (PNG/JPG), resolution scale (1x/2x/3x), background
// (transparent/white) selectors.
// D-09: No preview — export proceeds directly to download.
//
// Reads default values from useUIPreferencesStore.exportDefaults.
// ---------------------------------------------------------------------------

import { useState, useCallback } from 'react'
import { exportToBlob } from '@ac-canvas/excalidraw'
import { useCanvasStore } from '@/stores/canvasStore'
import { useUIPreferencesStore } from '@/stores/stubs/uiPreferencesStore'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

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

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const defaults = useUIPreferencesStore((s) => s.exportDefaults)
  const setExportDefaults = useUIPreferencesStore((s) => s.setExportDefaults)

  const [format, setFormat] = useState<'png' | 'jpg'>(defaults.format)
  const [scale, setScale] = useState<1 | 2 | 3>(defaults.scale)
  const [background, setBackground] = useState<'transparent' | 'white'>(
    defaults.background,
  )

  const handleExport = useCallback(async () => {
    // Save to defaults
    setExportDefaults({ format, scale, background })

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
      exportPadding: 0,
      exportScale: scale,
    })

    const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png'
    const finalBlob =
      format === 'jpg' ? new Blob([blob], { type: 'image/jpeg' }) : blob

    downloadBlob(finalBlob, `canvas-export.${format}`)
    onOpenChange(false)
  }, [format, scale, background, setExportDefaults, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>导出画布</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Format selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              格式
            </label>
            <Select
              value={format}
              onValueChange={(v: string | null) => {
                if (v === 'png' || v === 'jpg') setFormat(v)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="jpg">JPG</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Resolution scale */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              缩放
            </label>
            <Select
              value={String(scale)}
              onValueChange={(v: string | null) => {
                if (v) setScale(Number(v) as 1 | 2 | 3)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1x</SelectItem>
                <SelectItem value="2">2x</SelectItem>
                <SelectItem value="3">3x</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Background */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              背景
            </label>
            <Select
              value={background}
              onValueChange={(v: string | null) => {
                if (v === 'transparent' || v === 'white') setBackground(v)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transparent">透明</SelectItem>
                <SelectItem value="white">白色</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleExport}>导出</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
