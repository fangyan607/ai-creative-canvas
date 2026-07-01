// ---------------------------------------------------------------------------
// AI Core Types — Shared type definitions for the AI adapter system
// ---------------------------------------------------------------------------

// === Adapter Result Shape (D-04) ===
export interface AdapterResult {
  imageBlobId: string
  width: number
  height: number
  seed: number | null
  model: string
  timing: number // wall clock execution time in ms
}

// === Connection Test Result (D-02) ===
export interface ConnectionResult {
  success: boolean
  message: string
}

// === Provider Configuration Schema (D-02) ===
export interface ConfigField {
  key: string
  label: string
  type: 'text' | 'password' | 'number' | 'select'
  required: boolean
  defaultValue?: unknown
  placeholder?: string
  validationRegex?: string
  options?: string[]
}

// === Model Descriptor (D-02) ===
export interface ModelDescriptor {
  id: string
  name: string
  supportedSizes: string[]
  maxDimensions: { width: number; height: number }
  supportsImageToImage: boolean
  supportsSeed: boolean
}

// === Provider Config Storage Shape (consumed by ProviderStore in Plan 05) ===
export interface ProviderConfig {
  providerId: string
  encryptedApiKey: string // AES-256-GCM encrypted + base64 encoded
  encryptionIv: string // Initialization vector for decryption
  keyVersion: string // For key rotation support (Pitfall 6 mitigation)
  baseUrl: string
  selectedModel?: string
  isEnabled: boolean
  updatedAt: number
}

// === Custom Error (D-04) ===
// ---------------------------------------------------------------------------
// Shared Error Sanitization (Pitfall 4 — prevent API key leakage)
// ---------------------------------------------------------------------------

const API_KEY_PATTERN = /sk-[A-Za-z0-9-]+/g
const SANITIZED_REPLACEMENT = 'sk-***'

/**
 * Sanitize an error message by stripping patterns that look like API keys.
 * Uses a unified regex pattern and replacement across all adapters (WR-04).
 */
export function sanitizeErrorMessage(message: string): string {
  return message.replace(API_KEY_PATTERN, SANITIZED_REPLACEMENT)
}

export class AiAdapterError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = 'AiAdapterError'
  }
}

// === Prompt Template Shape (consumed by Plan 06, defined here for type sharing) ===
export interface PromptTemplate {
  id: string
  providerId: string
  purpose: string
  label: string
  template: string
  defaultVariables: Record<string, unknown>
  description?: string
}
