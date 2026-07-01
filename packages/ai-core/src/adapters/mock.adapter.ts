// ---------------------------------------------------------------------------
// MockAdapter -- offline colored-rectangle PNG generator
// ---------------------------------------------------------------------------
// Per D-15: Generates a deterministic colored rectangle with text overlay
// as a PNG blob using OffscreenCanvas (with fallback to hidden <canvas>).
// No network calls are made -- fully offline for development and testing.
// ---------------------------------------------------------------------------
// Dual-mode support (D-16):
// - 'manual' (default): full canvas rendering for demo purposes
// - 'fallback': faster path that skips the storeImage callback for engine init
// ---------------------------------------------------------------------------

import { AiAdapter } from '../interfaces/AiAdapter'
import type {
  AdapterResult,
  ConnectionResult,
  ModelDescriptor,
  ConfigField,
} from '../interfaces/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MockAdapterOptions {
  mode?: 'fallback' | 'manual'
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_WIDTH = 1024
const DEFAULT_HEIGHT = 1024

const TEXT_LINE_1_Y = 0.04  // y position as fraction of height
const TEXT_LINE_SPACING = 0.04
const TEXT_COLOR = '#333333'
const BACKGROUND_SATURATION = 0.6
const BACKGROUND_LIGHTNESS = 0.7
const FONT_SIZE_FRACTION = 0.04
const PROMPT_TRUNCATE_LENGTH = 60

// ---------------------------------------------------------------------------
// Canvas rendering helpers
// ---------------------------------------------------------------------------

/**
 * Compute a deterministic hue (0-359) from a prompt string.
 * Uses simple character code summing, then reduces to 0-359 range.
 */
function promptToHue(prompt: string): number {
  const sum = [...prompt].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return sum % 360
}

/**
 * Truncate a string to maxLen chars, appending "..." if truncated.
 */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '...'
}

/**
 * Pick a deterministic color from a prompt string.
 * Returns an HSL string.
 */
export function promptToColor(prompt: string): string {
  const hue = promptToHue(prompt)
  return `hsl(${hue}, ${BACKGROUND_SATURATION * 100}%, ${BACKGROUND_LIGHTNESS * 100}%)`
}

/**
 * Result of createCanvasContext.
 * `ctx` is null when canvas is unavailable (e.g., test environments like jsdom).
 */
interface CanvasContextResult {
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
  cleanup: () => void
}

/**
 * Detect the best available canvas 2D context.
 * Prefers OffscreenCanvas, falls back to creating a hidden <canvas> element.
 * Returns a context (or null if canvas is unavailable) and a cleanup function.
 *
 * Per Pitfall 5 (04-RESEARCH.md): OffscreenCanvas detection + fallback handles
 * older browsers. In test environments (jsdom), both paths return null.
 */
function createCanvasContext(
  width: number,
  height: number,
): CanvasContextResult {
  // OffscreenCanvas is the preferred path (modern browsers, no DOM needed)
  if (typeof OffscreenCanvas !== 'undefined') {
    try {
      const canvas = new OffscreenCanvas(width, height)
      const ctx = canvas.getContext('2d')
      if (ctx) {
        return { ctx, cleanup: () => { /* nothing to clean up */ } }
      }
    } catch {
      // OffscreenCanvas constructor or getContext failed -- fall through
    }
  }

  // Fallback: create a hidden <canvas> element (Pitfall 5 mitigation)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.style.display = 'none'
    document.body.appendChild(canvas)
    const ctx = canvas.getContext('2d')
    if (ctx) {
      return {
        ctx,
        cleanup: () => {
          document.body.removeChild(canvas)
        },
      }
    }
    // getContext returned null (e.g., jsdom) -- clean up the created element
    document.body.removeChild(canvas)
  } catch {
    // document.createElement('canvas') or appendChild failed -- ignore
  }

  // Canvas unavailable -- return null context
  return { ctx: null, cleanup: () => {} }
}

/**
 * Render a colored rectangle with text overlay onto a canvas context.
 * If ctx is null (canvas unavailable), this is a no-op.
 */
function renderMockImage(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null,
  width: number,
  height: number,
  prompt: string,
  seed: number,
): void {
  if (!ctx) return

  const hue = promptToHue(prompt)
  const bgColor = `hsl(${hue}, ${BACKGROUND_SATURATION * 100}%, ${BACKGROUND_LIGHTNESS * 100}%)`
  const fontSize = Math.min(width, height) * FONT_SIZE_FRACTION

  // Background
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, width, height)

  // Text styling
  ctx.fillStyle = TEXT_COLOR
  ctx.font = `${fontSize}px sans-serif`
  ctx.textBaseline = 'top'

  // Line 1: Prompt text (truncated)
  const line1 = truncate(prompt || '(no prompt)', PROMPT_TRUNCATE_LENGTH)
  ctx.fillText(line1, fontSize, height * TEXT_LINE_1_Y)

  // Line 2: Provider + seed
  const line2 = `MockAdapter | seed: ${seed}`
  ctx.fillText(line2, fontSize, height * (TEXT_LINE_1_Y + TEXT_LINE_SPACING))

  // Line 3: Dimensions
  const line3 = `${width} x ${height}`
  ctx.fillText(line3, fontSize, height * (TEXT_LINE_1_Y + TEXT_LINE_SPACING * 2))

  // Line 4: MOCK watermark
  const line4 = '--- MOCK ---'
  ctx.fillText(line4, fontSize, height * (TEXT_LINE_1_Y + TEXT_LINE_SPACING * 3))
}

/**
 * Generate a mock PNG Blob when no real canvas is available.
 * Creates a minimal valid PNG (1x1 pixel transparent) as placeholder.
 */
function generateMockPngBlob(): Promise<Blob> {
  // Create a minimal valid PNG in a Uint8Array
  // PNG spec: signature + IHDR + IDAT (raw unfiltered scanline) + IEND
  const width = 1
  const height = 1

  // Build raw pixel data: filter byte (0=none) + RGBA (0,0,0,0)
  const rawData = new Uint8Array([0, 0, 0, 0, 0]) // filter + RGBA

  // We'll use a DataView to construct a valid PNG
  const pngSignature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR chunk
  const ihdrData = new ArrayBuffer(13)
  const ihdrView = new DataView(ihdrData)
  ihdrView.setUint32(0, width, false) // width
  ihdrView.setUint32(4, height, false) // height
  ihdrView.setUint8(8, 8) // bit depth
  ihdrView.setUint8(9, 6) // color type: RGBA
  ihdrView.setUint8(10, 0) // compression
  ihdrView.setUint8(11, 0) // filter
  ihdrView.setUint8(12, 0) // interlace

  const ihdrChunk = createPngChunk('IHDR', new Uint8Array(ihdrData))

  // IDAT chunk: zlib-compressed raw data
  const deflated = deflateRaw(rawData)
  const idatChunk = createPngChunk('IDAT', deflated)

  // IEND chunk
  const iendChunk = createPngChunk('IEND', new Uint8Array(0))

  // Concatenate all parts
  const blobParts = [pngSignature, ihdrChunk, idatChunk, iendChunk]
  const totalLength = blobParts.reduce((sum, b) => sum + b.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const part of blobParts) {
    result.set(part, offset)
    offset += part.length
  }

  return Promise.resolve(new Blob([result], { type: 'image/png' }))
}

/** Create a PNG chunk: length + type + data + CRC. */
function createPngChunk(type: string, data: Uint8Array): Uint8Array {
  const length = data.length
  const chunk = new Uint8Array(4 + 4 + length + 4) // length + type + data + crc
  const view = new DataView(chunk.buffer)

  view.setUint32(0, length, false) // data length
  for (let i = 0; i < 4; i++) {
    view.setUint8(4 + i, type.charCodeAt(i)) // chunk type
  }
  chunk.set(data, 8) // chunk data

  // CRC32 over type + data
  const crcData = new Uint8Array(4 + length)
  crcData.set(chunk.slice(4, 8 + length), 0)
  const crc = crc32(crcData)
  view.setUint32(8 + length, crc, false) // CRC

  return chunk
}

/** Minimal deflate implementation (raw, no header) for PNG IDAT chunk. */
function deflateRaw(data: Uint8Array): Uint8Array {
  // Simple approach: store uncompressed using deflate format (BTYPE=00)
  // This is a valid deflate stream with no compression
  const bfinal = 1
  const btype = 0 // stored (no compression)
  const header = bfinal | (btype << 1)

  // Re-compute for 16-bit little-endian length
  const len = data.length
  const nlen = (~len) & 0xFFFF

  const result = new Uint8Array(1 + 4 + data.length)
  result[0] = header
  result[1] = len & 0xFF
  result[2] = (len >> 8) & 0xFF
  result[3] = nlen & 0xFF
  result[4] = (nlen >> 8) & 0xFF
  result.set(data, 5)

  return result
}

/** CRC32 lookup table. */
const crc32Table = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
  }
  crc32Table[i] = c
}

/** Compute CRC-32 checksum. */
function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < data.length; i++) {
    crc = crc32Table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

/**
 * Convert a canvas rendering context to a PNG Blob.
 * Supports both OffscreenCanvas and regular Canvas2D contexts.
 * If ctx is null, generates a minimal mock PNG blob.
 */
async function contextToBlob(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null,
  width: number,
  height: number,
): Promise<Blob> {
  if (!ctx) {
    return generateMockPngBlob()
  }

  // Safely check for OffscreenCanvas support
  const hasOffscreenCanvas =
    typeof OffscreenCanvasRenderingContext2D !== 'undefined'

  // Try OffscreenCanvas path first
  if (hasOffscreenCanvas && ctx instanceof OffscreenCanvasRenderingContext2D) {
    const canvas = ctx.canvas as OffscreenCanvas
    const blob = await canvas.convertToBlob({ type: 'image/png' })
    if (blob) return blob
  }

  // Fallback for regular Canvas2D (or unknown OffscreenCanvas impl)
  const canvas = ctx.canvas as HTMLCanvasElement
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Failed to convert canvas to PNG blob'))
      }
    }, 'image/png')
  })
}

// ---------------------------------------------------------------------------
// MockAdapter class
// ---------------------------------------------------------------------------

export class MockAdapter extends AiAdapter {
  // --- Instance metadata (D-06) ---
  readonly providerId = 'mock'
  readonly providerName = 'MockAdapter'
  readonly defaultBaseUrl = 'http://localhost/mock'

  private readonly mode: 'fallback' | 'manual'

  constructor(options?: MockAdapterOptions) {
    super()
    this.mode = options?.mode ?? 'manual'
  }

  // --- Static factory (D-16) ---

  /**
   * Create a MockAdapter configured as an offline fallback.
   * Use during engine initialization when no real API keys are configured.
   */
  static createOfflineFallback(): MockAdapter {
    return new MockAdapter({ mode: 'fallback' })
  }

  // --- Mandatory methods (D-02) ---

  async execute(
    nodeData: Record<string, unknown>,
    _inputs: Record<string, unknown>,
    onStoreImage?: (blob: Blob) => Promise<string>,
  ): Promise<AdapterResult> {
    const startTime = performance.now()

    // Extract parameters with defaults
    const prompt = String(nodeData.prompt ?? '')
    const width = Number(nodeData.width) || DEFAULT_WIDTH
    const height = Number(nodeData.height) || DEFAULT_HEIGHT
    const seed = nodeData.seed !== undefined ? Number(nodeData.seed) : Math.floor(Math.random() * 2147483647)

    // Emit progress: generating
    this.emit('progress', { percent: 0, stage: 'generating' })

    let imageBlobId: string

    if (this.mode === 'fallback') {
      // Fallback mode: skip canvas rendering and blob storage
      imageBlobId = `mock-${crypto.randomUUID()}`
    } else {
      // Manual mode: full canvas rendering
      this.emit('progress', { percent: 30, stage: 'rendering' })

      // Create canvas context (OffscreenCanvas with fallback)
      const { ctx, cleanup } = createCanvasContext(width, height)

      try {
        // Render the colored rectangle with text overlay
        renderMockImage(ctx, width, height, prompt, seed)

        this.emit('progress', { percent: 60, stage: 'encoding' })

        // Convert to PNG blob
        const blob = await contextToBlob(ctx, width, height)

        this.emit('progress', { percent: 80, stage: 'storing' })

        // Store the blob via callback if provided
        if (onStoreImage) {
          imageBlobId = await onStoreImage(blob)
        } else {
          imageBlobId = `mock-${crypto.randomUUID()}`
        }
      } finally {
        cleanup()
      }
    }

    const timing = performance.now() - startTime

    // Build result
    const result: AdapterResult = {
      imageBlobId,
      width,
      height,
      seed,
      model: 'mock-default',
      timing,
    }

    // Emit done event
    this.emit('done', result)

    return result
  }

  async testConnection(): Promise<ConnectionResult> {
    return {
      success: true,
      message: 'MockAdapter is always available (offline mode)',
    }
  }

  getModels(): ModelDescriptor[] {
    return [
      {
        id: 'mock-default',
        name: 'Mock Default',
        supportedSizes: [
          '512x512',
          '768x768',
          '1024x1024',
          '1024x1792',
          '1792x1024',
        ],
        maxDimensions: { width: 2048, height: 2048 },
        supportsImageToImage: false,
        supportsSeed: true,
      },
    ]
  }

  getConfigSchema(): ConfigField[] {
    return [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: false,
        placeholder: 'MockAdapter does not require an API key',
      },
      {
        key: 'baseUrl',
        label: 'Base URL',
        type: 'text',
        required: false,
        placeholder: this.defaultBaseUrl,
        defaultValue: this.defaultBaseUrl,
      },
    ]
  }
}

