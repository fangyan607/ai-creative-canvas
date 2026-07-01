// ---------------------------------------------------------------------------
// OpenAiAdapter — OpenAI DALL-E 3 image generation via direct fetch()
// ---------------------------------------------------------------------------
// Uses native fetch() instead of the openai SDK, saving ~80KB bundle size.
// Handles the full DALL-E 3 API lifecycle: prompt submission, b64_json
// response parsing, revised_prompt extraction, and deterministic seed
// handling (returns null per Pitfall 1).
//
// Error messages are sanitized per Pitfall 4 — no API key leakage.
// Supports configurable base URL per D-10 for proxy/mirror scenarios.
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

export interface OpenAiAdapterOptions {
  apiKey?: string
  baseUrl?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_WIDTH = 1024
const DEFAULT_HEIGHT = 1024
const DEFAULT_QUALITY = 'standard'
const DEFAULT_STYLE = 'vivid'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Sanitize an error message by stripping patterns that look like API keys.
 * This prevents accidental key leakage in error surfaces (Pitfall 4).
 */
function sanitizeErrorMessage(message: string): string {
  // Strip "sk-..." patterns (OpenAI API keys)
  return message.replace(/sk-[A-Za-z0-9]{20,}/g, 'sk-***')
}

/**
 * Decode a base64 string to a Uint8Array.
 */
function base64ToBytes(base64: string): Uint8Array {
  // Use Buffer in Node.js or atob with TextEncoder in browser
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(base64, 'base64')
  }
  // Browser path
  const binaryStr = atob(base64)
  const bytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i)
  }
  return bytes
}

// ---------------------------------------------------------------------------
// OpenAiAdapter class
// ---------------------------------------------------------------------------

export class OpenAiAdapter extends AiAdapter {
  // --- Instance metadata (D-06) ---
  readonly providerId = 'openai'
  readonly providerName = 'OpenAI'
  readonly defaultBaseUrl = 'https://api.openai.com'

  private readonly apiKey: string
  private readonly baseUrl: string

  constructor(options?: OpenAiAdapterOptions) {
    super()
    this.apiKey = options?.apiKey ?? ''
    this.baseUrl = options?.baseUrl ?? this.defaultBaseUrl
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
    const quality = String(nodeData.quality ?? DEFAULT_QUALITY)
    const style = String(nodeData.style ?? DEFAULT_STYLE)

    // Emit progress: sending request
    this.emit('progress', { percent: 10, stage: 'sending_request' })

    let response: Response
    try {
      response = await fetch(`${this.baseUrl}/v1/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: `${width}x${height}`,
          quality,
          style,
          response_format: 'b64_json',
        }),
      })
    } catch (err) {
      throw new AiAdapterError(
        'server_error',
        'Unable to reach OpenAI API. Check your network connection.',
      )
    }

    // Emit progress: processing
    this.emit('progress', { percent: 30, stage: 'processing' })

    // Handle error responses
    if (!response.ok) {
      let errorMessage: string
      try {
        const errorBody = await response.json()
        errorMessage = errorBody?.error?.message ?? response.statusText
      } catch {
        errorMessage = response.statusText
      }

      // Sanitize the error message (Pitfall 4)
      errorMessage = sanitizeErrorMessage(errorMessage)

      switch (response.status) {
        case 401:
          throw new AiAdapterError(
            'auth_failed',
            'Invalid API key or authentication failed.',
          )
        case 429:
          throw new AiAdapterError(
            'rate_limited',
            'API rate limit exceeded. Please wait and try again.',
          )
        case 400:
          throw new AiAdapterError(
            'invalid_params',
            errorMessage,
          )
        default:
          throw new AiAdapterError(
            'server_error',
            errorMessage,
          )
      }
    }

    // Parse JSON response
    let json: any
    try {
      json = await response.json()
    } catch {
      throw new AiAdapterError(
        'server_error',
        'Invalid response from OpenAI API.',
      )
    }

    // Extract image data
    const data = json?.data?.[0]
    if (!data?.b64_json) {
      throw new AiAdapterError(
        'server_error',
        'OpenAI response missing image data.',
      )
    }

    // Emit progress: downloading
    this.emit('progress', { percent: 60, stage: 'downloading' })

    // Convert b64_json to Blob
    const imageBytes = base64ToBytes(data.b64_json)
    const blob = new Blob([imageBytes], { type: 'image/png' })

    // Store revised_prompt on nodeData (per Pitfall 3 — make it available
    // as metadata for Phase 5 bridge to consume)
    if (data.revised_prompt) {
      nodeData.revised_prompt = data.revised_prompt
    }

    // Emit progress: storing
    this.emit('progress', { percent: 80, stage: 'storing' })

    // Store the blob via callback if provided
    let imageBlobId: string
    if (onStoreImage) {
      imageBlobId = await onStoreImage(blob)
    } else {
      imageBlobId = `openai-${crypto.randomUUID()}`
    }

    const timing = performance.now() - startTime

    // Emit progress: finalizing
    this.emit('progress', { percent: 90, stage: 'finalizing' })

    // Build result
    const result: AdapterResult = {
      imageBlobId,
      width,
      height,
      seed: null, // DALL-E 3 does not support deterministic seeds (Pitfall 1)
      model: 'dall-e-3',
      timing,
    }

    // Emit done event
    this.emit('done', result)

    return result
  }

  async testConnection(): Promise<ConnectionResult> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })

      if (response.ok) {
        return {
          success: true,
          message: 'OpenAI API connection successful',
        }
      }

      if (response.status === 401) {
        return {
          success: false,
          message: 'Invalid API key',
        }
      }

      return {
        success: false,
        message: `Connection failed: ${response.statusText}`,
      }
    } catch {
      return {
        success: false,
        message: 'Network error: unable to reach OpenAI API',
      }
    }
  }

  getModels(): ModelDescriptor[] {
    return [
      {
        id: 'dall-e-3',
        name: 'DALL-E 3',
        supportedSizes: ['1024x1024', '1024x1792', '1792x1024'],
        maxDimensions: { width: 1792, height: 1792 },
        supportsImageToImage: false,
        supportsSeed: false,
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
        defaultValue: this.defaultBaseUrl,
        placeholder: 'https://api.openai.com',
      },
    ]
  }
}
