// ---------------------------------------------------------------------------
// ProviderStore — BYOK (Bring Your Own Key) Configuration CRUD
//
// Provides encrypted storage of AI provider configurations (API keys, base
// URLs, selected models). API keys are encrypted at rest using Web Crypto
// AES-256-GCM before reaching IndexedDB — never stored in plaintext.
//
// Uses dependency injection for the storage backend (ProviderConfigStorage
// interface). This enables:
//   - In-memory backend for unit tests (Plan 05 Task 3)
//   - Real Dexie backend wired at app bootstrap (Phase 5)
//   - No cross-package dependency on apps/web/src/indexedb
//
// Per D-08: Provider configs are global scope (not per-project), stored in
// a dedicated 'providerConfigs' Dexie table at schema version 2.
// Per D-10: Custom base URLs validated before storage (must be http(s)).
// Per Pitfall 6: Versioned key scheme prevents permanent data loss on rotation.
// ---------------------------------------------------------------------------

import { encryptApiKey, decryptApiKey } from './encryption'
import type { ProviderConfig } from '../interfaces/types'

// ---------------------------------------------------------------------------
// Storage Interface — enables testing with in-memory backend (DI pattern)
// ---------------------------------------------------------------------------

export interface ProviderConfigRecord {
  providerId: string
  encryptedApiKey: string
  encryptionIv: string
  keyVersion: string
  baseUrl: string
  selectedModel?: string
  isEnabled: boolean
  updatedAt: number
}

export interface ProviderConfigStorage {
  get(providerId: string): Promise<ProviderConfigRecord | undefined>
  put(record: ProviderConfigRecord): Promise<void>
  delete(providerId: string): Promise<void>
  toArray(): Promise<ProviderConfigRecord[]>
}

// ---------------------------------------------------------------------------
// Input type — plaintext API key, encrypted before storage
// ---------------------------------------------------------------------------

export interface ProviderConfigInput {
  providerId: string
  apiKey: string           // Plaintext — encrypted before storage
  baseUrl: string
  selectedModel?: string
  isEnabled?: boolean
}

// ---------------------------------------------------------------------------
// ProviderStore — CRUD over encrypted provider configs
// ---------------------------------------------------------------------------

export class ProviderStore {
  constructor(private storage: ProviderConfigStorage) {}

  /**
   * Save or update a provider configuration.
   * Encrypts the API key before writing to storage.
   * Validates baseUrl format before saving (D-10).
   */
  async saveConfig(input: ProviderConfigInput): Promise<void> {
    this.validateBaseUrl(input.baseUrl)
    const encrypted = await encryptApiKey(input.apiKey)
    const record: ProviderConfigRecord = {
      providerId: input.providerId,
      encryptedApiKey: encrypted.ciphertext,
      encryptionIv: encrypted.iv,
      keyVersion: encrypted.keyVersion,
      baseUrl: input.baseUrl,
      selectedModel: input.selectedModel,
      isEnabled: input.isEnabled ?? true,
      updatedAt: Date.now(),
    }
    await this.storage.put(record)
  }

  /**
   * Load a provider configuration, decrypting the API key.
   * Returns null if no config exists for this provider.
   *
   * On decryption failure (e.g., key rotation), returns a disabled config
   * rather than throwing (Pitfall 6 mitigation).
   */
  async loadConfig(providerId: string): Promise<ProviderConfig | null> {
    const record = await this.storage.get(providerId)
    if (!record) return null
    try {
      await decryptApiKey(
        record.encryptedApiKey,
        record.encryptionIv,
        record.keyVersion,
      )
      return {
        providerId: record.providerId,
        encryptedApiKey: record.encryptedApiKey,
        encryptionIv: record.encryptionIv,
        keyVersion: record.keyVersion,
        baseUrl: record.baseUrl,
        selectedModel: record.selectedModel,
        isEnabled: record.isEnabled,
        updatedAt: record.updatedAt,
      }
    } catch {
      // Decryption failed — likely due to key rotation (Pitfall 6)
      // Return partial config without the decrypted key
      return {
        providerId: record.providerId,
        encryptedApiKey: record.encryptedApiKey,
        encryptionIv: record.encryptionIv,
        keyVersion: record.keyVersion,
        baseUrl: record.baseUrl,
        selectedModel: record.selectedModel,
        isEnabled: false,   // Disable on decryption failure
        updatedAt: record.updatedAt,
      }
    }
  }

  /**
   * Get the decrypted API key for a provider.
   * Used by Phase 5 bridge when executing adapter calls.
   * Returns null if no config exists or decryption fails.
   */
  async getApiKey(providerId: string): Promise<string | null> {
    const record = await this.storage.get(providerId)
    if (!record) return null
    try {
      return await decryptApiKey(
        record.encryptedApiKey,
        record.encryptionIv,
        record.keyVersion,
      )
    } catch {
      return null
    }
  }

  /**
   * Get the base URL for a provider. Falls back to default if not configured.
   */
  async getBaseUrl(providerId: string, defaultBaseUrl: string): Promise<string> {
    const record = await this.storage.get(providerId)
    return record?.baseUrl || defaultBaseUrl
  }

  /** List all configured provider IDs. */
  async listProviders(): Promise<string[]> {
    const records = await this.storage.toArray()
    return records.map((r) => r.providerId)
  }

  /** Delete a provider configuration. */
  async deleteConfig(providerId: string): Promise<void> {
    await this.storage.delete(providerId)
  }

  /** Check if a provider has a stored config. */
  async hasConfig(providerId: string): Promise<boolean> {
    const record = await this.storage.get(providerId)
    return !!record
  }

  /**
   * Validate baseUrl format per D-10.
   * Must be a valid URL starting with http:// or https://.
   */
  private validateBaseUrl(url: string): void {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error(`Invalid base URL: "${url}". Must start with http:// or https://`)
    }
    try {
      new URL(url)
    } catch {
      throw new Error(`Invalid base URL format: "${url}"`)
    }
  }
}
