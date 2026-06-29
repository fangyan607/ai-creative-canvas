import {
  exportToCanvas as _exportToCanvas,
  exportToSvg as _exportToSvg,
} from "../src/scene/export"
import type { NonDeletedExcalidrawElement } from "../src/element/types"
import type { AppState, BinaryFiles } from "../src/types"
import { MIME_TYPES } from "../src/constants"

type ExportOpts = {
  elements: readonly NonDeletedExcalidrawElement[]
  appState?: Partial<Omit<AppState, "offsetTop" | "offsetLeft">>
  files: BinaryFiles | null
  maxWidthOrHeight?: number
  exportingFrame?: any | null
  getDimensions?: (
    width: number,
    height: number,
  ) => { width: number; height: number; scale?: number }
}

export async function exportToCanvas(
  opts: ExportOpts & { exportPadding?: number },
): Promise<HTMLCanvasElement> {
  return _exportToCanvas({
    elements: opts.elements as any,
    appState: opts.appState as any,
    files: opts.files ?? undefined,
    maxWidthOrHeight: opts.maxWidthOrHeight,
    getDimensions: opts.getDimensions,
    exportPadding: opts.exportPadding,
    exportingFrame: opts.exportingFrame,
  })
}

export async function exportToBlob(
  opts: ExportOpts & {
    mimeType?: string
    quality?: number
    exportPadding?: number
  },
): Promise<Blob> {
  const canvas = await exportToCanvas(opts)
  const mimeType = opts.mimeType ?? "image/png"

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error("Failed to create blob"))
      },
      mimeType,
    )
  })
}

export async function exportToSvg(
  opts: Omit<ExportOpts, "getDimensions"> & {
    exportPadding?: number
    renderEmbeddables?: boolean
    skipInliningFonts?: true
    reuseImages?: boolean
  },
): Promise<SVGSVGElement> {
  return (await _exportToSvg({
    elements: opts.elements as any,
    appState: opts.appState as any,
    files: opts.files ?? undefined,
    exportPadding: opts.exportPadding,
    renderEmbeddables: opts.renderEmbeddables,
    skipInliningFonts: opts.skipInliningFonts,
    reuseImages: opts.reuseImages,
    exportingFrame: opts.exportingFrame,
  })) as any
}

export async function exportToClipboard(
  opts: ExportOpts & {
    mimeType?: string
    quality?: number
    type: "png" | "svg" | "json"
  },
): Promise<void> {
  if (opts.type === "json") {
    throw new Error("JSON clipboard export not available in this context")
  }
  try {
    const blob = await exportToBlob(opts)
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob }),
    ])
  } catch (error) {
    console.warn("Clipboard write failed:", error)
  }
}

export { MIME_TYPES }
