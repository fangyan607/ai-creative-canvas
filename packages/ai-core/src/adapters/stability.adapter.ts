// ---------------------------------------------------------------------------
// StabilityAdapter — Stability.ai image generation adapter
// ---------------------------------------------------------------------------
// Supports both v1 (SDXL, JSON payload) and v2beta (SD3/SD3.5, multipart/
// form-data) API endpoints. Automatically dispatches to the correct API
// version based on the selected model id.
//
// Security note: API keys are sent via Authorization header (bearer token).
// Error responses are sanitized — sensitive patterns (e.g. "sk-...") are
// stripped before surfacing to the caller per Pitfall 4 mitigation.
// ---------------------------------------------------------------------------

import { AiAdapter } from '../interfaces/AiAdapter'
import type {
  AdapterResult,
  ConnectionResult,
  ModelDescriptor,
  ConfigField,
} from '../interfaces/types'
import { AiAdapterError } from '../interfaces/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StabilityAdapterOptions {
  apiKey?: string
  baseUrl?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = 'https://api.stability.ai'
const DEFAULT_WIDTH = 1024
const DEFAULT_HEIGHT = 1024
const DEFAULT_SEED = 0

// ---------------------------------------------------------------------------
// Model-to-endpoint dispatch map (Pitfall 2 mitigation)
// ---------------------------------------------------------------------------

const V2BETA_MODELS = new Set([
  'sd3.5-large',
  'sd3.5-medium',
  'sd3-large',
  'sd3-medium',
])

const ENGINE_IDS: Record<string, string> = {
  'stable-diffusion-xl-1024-v1-0': 'stable-diffusion-xl-1024-v1-0',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute the aspect ratio string from width and height.
 * Returns common aspect ratios like '1:1', '16:9', '9:16', '4:3', '3:2', '2:3'.
 */
function computeAspectRatio(width: number, height: number): string {
  const w = width
  const h = height
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const divisor = gcd(w, h)
  const simplifiedW = w / divisor
  const simplifiedH = h / divisor

  // Map to common aspect ratio strings
  const ratioMap: Record<string, string> = {
    '1:1': '1:1',
    '4:3': '4:3',
    '3:4': '3:4',
    '3:2': '3:2',
    '2:3': '2:3',
    '16:9': '16:9',
    '9:16': '9:16',
    '21:9': '21:9',
    '9:21': '9:21',
  }

  const key = `${simplifiedW}:${simplifiedH}`
  return ratioMap[key] || '1:1'
}

/**
 * Sanitize an error message by stripping sensitive patterns like API keys.
 * This mitigates Pitfall 4 (key leakage via error messages).
 */
function sanitizeError(message: string): string {
  return message.replace(/sk-[a-zA-Z0-9-]+/g, '[REDACTED]')
}

/**
 * Parse an error response body into a sanitized AiAdapterError.
 */
function parseErrorResponse(
  status: number,
  body: Record<string, unknown>,
): AiAdapterError {
  const rawMessage = String(body?.message || body?.error || body?.name || 'Unknown error')
  const cleanMessage = sanitizeError(rawMessage)

  switch (status) {
    case 401:
    case 403:
      return new AiAdapterError('auth_failed', cleanMessage)
    case 429:
      return new AiAdapterError('rate_limited', cleanMessage)
    case 400:
    case 415:
      return new AiAdapterError('invalid_params', cleanMessage)
    default:
      return new AiAdapterError('server_error', cleanMessage)
  }
}

/**
 * Decode a base64 string into a Uint8Array.
 */
function base64ToBytes(base64: string): Uint8Array {
  const binaryStr = atob(base64)
  const bytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i)
  }
  return bytes
}

/**
 * Try to determine image dimensions from a PNG buffer.
 * Parses the IHDR chunk for width and height.
 * Returns null if unable to parse.
 */
function parsePngDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  // PNG signature: 8 bytes
  // IHDR chunk: 4 bytes length + 4 bytes 'IHDR' + 13 bytes data + 4 bytes CRC
  // Width is at offset 16, height at offset 20
  const PNG_IHDR_OFFSET = 16

  if (bytes.length < PNG_IHDR_OFFSET + 8) return null

  const signature = bytes.slice(0, 8)
  const pngSignature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
  if (!signature.every((b, i) => b === pngSignature[i])) return null

  const width = (bytes[PNG_IHDR_OFFSET] << 24) |
    (bytes[PNG_IHDR_OFFSET + 1] << 16) |
    (bytes[PNG_IHDR_OFFSET + 2] << 8) |
    bytes[PNG_IHDR_OFFSET + 3]

  const height = (bytes[PNG_IHDR_OFFSET + 4] << 24) |
    (bytes[PNG_IHDR_OFFSET + 5] << 16) |
    (bytes[PNG_IHDR_OFFSET + 6] << 8) |
    bytes[PNG_IHDR_OFFSET + 7]

  if (width <= 0 || height <= 0) return null

  return { width, height }
}

// ---------------------------------------------------------------------------
// StabilityAdapter class
// ---------------------------------------------------------------------------

export class StabilityAdapter extends AiAdapter {
  // --- Instance metadata (D-06) ---
  readonly providerId = 'stability'
  readonly providerName = 'Stability AI'
  readonly defaultBaseUrl = DEFAULT_BASE_URL

  private readonly apiKey: string
  private readonly baseUrl: string

  constructor(options?: StabilityAdapterOptions) {
    super()
    this.apiKey = options?.apiKey ?? ''
    this.baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL
  }

  // -------------------------------------------------------------------------
  // Mandatory methods (D-02)
  // -------------------------------------------------------------------------

  async execute(
    nodeData: Record<string, unknown>,
    inputs: Record<string, unknown>,
    onStoreImage?: (blob: Blob) => Promise<string>,
  ): Promise<AdapterResult> {
    const startTime = performance.now()

    // 1. Extract parameters with defaults
    const prompt = String(nodeData.prompt ?? '')
    const width = Number(nodeData.width) || DEFAULT_WIDTH
    const height = Number(nodeData.height) || DEFAULT_HEIGHT
    const seed = nodeData.seed !== undefined ? Number(nodeData.seed) : DEFAULT_SEED
    const model = String(nodeData.model ?? 'sd3.5-large')
    const negativePrompt = nodeData.negativePrompt !== undefined ? String(nodeData.negativePrompt) : undefined
    const stylePreset = nodeData.stylePreset !== undefined ? String(nodeData.stylePreset) : undefined
    const strength = nodeData.strength !== undefined ? Number(nodeData.strength) : 0.8

    // Detect image-to-image: inputs contains an imageBlob and imageBlobId
    const inputImageBlob = inputs.imageBlob instanceof Blob ? inputs.imageBlob : undefined
    const isImageToImage = !!inputImageBlob

    // 2. Determine API version
    const isV2beta = V2BETA_MODELS.has(model)

    // 3. Emit progress
    this.emit('progress', { percent: 10, stage: 'sending_request' })

    try {
      let response: Response

      if (isV2beta) {
        // ---- v2beta path (SD3/SD3.5): FormData POST ----
        const formData = new FormData()
        formData.append('prompt', prompt)
        formData.append('model', model)
        formData.append('output_format', 'png')

        // Aspect ratio derived from width/height
        const aspectRatio = computeAspectRatio(width, height)
        formData.append('aspect_ratio', aspectRatio)

        // Seed (only if > 0, 0 = random for Stability)
        if (seed > 0) {
          formData.append('seed', String(seed))
        }

        // Negative prompt
        if (negativePrompt) {
          formData.append('negative_prompt', negativePrompt)
        }

        // Image-to-image mode
        if (isImageToImage && inputImageBlob) {
          formData.append('image', inputImageBlob, 'input.png')
          formData.append('mode', 'image-to-image')
          formData.append('strength', String(strength))
        }

        response = await fetch(`${this.baseUrl}/v2beta/stable-image/generate/sd3`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            Accept: 'application/json',
            // Do NOT set Content-Type — browser sets it with boundary for FormData
          },
          body: formData,
        })
      } else {
        // ---- v1 path (SDXL): JSON POST ----
        const engineId = ENGINE_IDS[model] || model

        const body: Record<string, unknown> = {
          text_prompts: [{ text: prompt, weight: 1 }],
          cfg_scale: 7,
          height,
          width,
          samples: 1,
          steps: 30,
        }

        // Seed (only if > 0; 0 = random)
        if (seed > 0) {
          body.seed = seed
        }

        // Style preset
        if (stylePreset) {
          body.style_preset = stylePreset
        }

        response = await fetch(`${this.baseUrl}/v1/generation/${engineId}/text-to-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(body),
        })
      }

      // 4. Handle non-OK responses
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw parseErrorResponse(response.status, errorBody)
      }

      // Parse response
      const responseData = await response.json()

      // Extract image data and seed from response
      let imageBase64: string
      let responseSeed: number

      if (isV2beta) {
        // v2beta response: { image: "<base64>", seed: <number> }
        imageBase64 = responseData.image as string
        responseSeed = responseData.seed as number
      } else {
        // v1 response: { artifacts: [{ base64: "<base64>", seed: <number> }] }
        const artifact = (responseData.artifacts as Array<Record<string, unknown>>)?.[0]
        imageBase64 = artifact?.base64 as string
        responseSeed = artifact?.seed as number
      }

      // 5. Emit progress
      this.emit('progress', { percent: 50, stage: 'processing' })

      // 6. Convert base64 image to Blob
      const imageBytes = base64ToBytes(imageBase64)
      const blob = new Blob([imageBytes], { type: 'image/png' })

      // 7. Determine actual dimensions from image data
      const dimensions = parsePngDimensions(imageBytes)
      const actualWidth = dimensions?.width ?? width
      const actualHeight = dimensions?.height ?? height

      // 8. Store blob via callback if provided
      let imageBlobId: string
      if (onStoreImage) {
        this.emit('progress', { percent: 70, stage: 'storing_image' })
        imageBlobId = await onStoreImage(blob)
      } else {
        imageBlobId = `stability-${crypto.randomUUID()}`
      }

      // 9. Emit progress
      this.emit('progress', { percent: 90, stage: 'finalizing' })

      // 10. Record timing
      const timing = performance.now() - startTime

      // 11. Build result
      const result: AdapterResult = {
        imageBlobId,
        width: actualWidth,
        height: actualHeight,
        seed: responseSeed ?? null,
        model,
        timing,
      }

      // 12. Emit done
      this.emit('done', result)

      return result

    } catch (error) {
      // Re-throw AiAdapterErrors as-is
      if (error instanceof AiAdapterError) {
        throw error
      }

      // Wrap unknown errors (network failures, JSON parse errors, etc.)
      const message = error instanceof Error ? error.message : String(error)
      throw new AiAdapterError('server_error', sanitizeError(message))
    }
  }

  async testConnection(): Promise<ConnectionResult> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/user/account`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })

      if (response.ok) {
        return {
          success: true,
          message: 'Successfully connected to Stability AI API',
        }
      }

      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          message: 'auth_failed: Invalid API key or authentication failed',
        }
      }

      return {
        success: false,
        message: `Connection failed with status ${response.status}`,
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        message: `Network error: ${message}`,
      }
    }
  }

  getModels(): ModelDescriptor[] {
    return [
      {
        id: 'sd3.5-large',
        name: 'Stable Diffusion 3.5 Large',
        supportedSizes: [
          '1024x1024',
          '1024x1792',
          '1792x1024',
          '1152x1152',
          '1152x896',
          '896x1152',
          '1344x768',
          '768x1344',
          '1536x640',
          '640x1536',
        ],
        maxDimensions: { width: 2048, height: 2048 },
        supportsImageToImage: true,
        supportsSeed: true,
      },
      {
        id: 'sd3.5-medium',
        name: 'Stable Diffusion 3.5 Medium',
        supportedSizes: [
          '1024x1024',
          '1024x1792',
          '1792x1024',
        ],
        maxDimensions: { width: 2048, height: 2048 },
        supportsImageToImage: true,
        supportsSeed: true,
      },
      {
        id: 'stable-diffusion-xl-1024-v1-0',
        name: 'SDXL 1.0',
        supportedSizes: [
          '1024x1024',
        ],
        maxDimensions: { width: 1024, height: 1024 },
        supportsImageToImage: true,
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
        required: true,
        placeholder: 'sk-...',
      },
      {
        key: 'baseUrl',
        label: 'Base URL',
        type: 'text',
        required: false,
        defaultValue: DEFAULT_BASE_URL,
        placeholder: DEFAULT_BASE_URL,
      },
    ]
  }
}
