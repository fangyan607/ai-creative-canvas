// ---------------------------------------------------------------------------
// ProviderStore Tests
//
// Tests all CRUD operations and baseUrl validation for ProviderStore.
// Encryption is mocked to avoid Web Crypto API dependency (not available
// in jsdom/vitest environment).
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProviderStore, type ProviderConfigRecord } from './providerStore'
import type { EncryptedData } from './encryption'
import type { ProviderConfigStorage } from './providerStore'

// --- Mock encryption module ---
vi.mock('./encryption', () => ({
  encryptApiKey: vi.fn(async (key: string): Promise<EncryptedData> => ({
    ciphertext: btoa(key),  // "encrypt" by base64 encoding for test
    iv: 'dGVzdC1pdi0tLQ==',
    keyVersion: 'v0.1',
  })),
  decryptApiKey: vi.fn(async (ct: string): Promise<string> => {
    // "decrypt" by base64 decoding
    return atob(ct)
  }),
}))

// --- In-memory storage backend ---
class InMemoryStorage implements ProviderConfigStorage {
  private store = new Map<string, ProviderConfigRecord>()

  async get(providerId: string): Promise<ProviderConfigRecord | undefined> {
    return this.store.get(providerId)
  }

  async put(record: ProviderConfigRecord): Promise<void> {
    this.store.set(record.providerId, { ...record })
  }

  async delete(providerId: string): Promise<void> {
    this.store.delete(providerId)
  }

  async toArray(): Promise<ProviderConfigRecord[]> {
    return Array.from(this.store.values())
  }
}

describe('ProviderStore', () => {
  let store: ProviderStore
  let storage: InMemoryStorage

  beforeEach(() => {
    storage = new InMemoryStorage()
    store = new ProviderStore(storage)
  })

  // --- saveConfig ---

  describe('saveConfig', () => {
    it('encrypts and stores a provider config', async () => {
      await store.saveConfig({
        providerId: 'openai',
        apiKey: 'sk-test-key-123',
        baseUrl: 'https://api.openai.com',
      })
      const record = await storage.get('openai')
      expect(record).toBeDefined()
      expect(record!.providerId).toBe('openai')
      expect(record!.encryptedApiKey).toBeTruthy()  // Should not be plaintext
      expect(record!.isEnabled).toBe(true)
    })

    it('validates baseUrl format — rejects non-http(s) URLs', async () => {
      await expect(store.saveConfig({
        providerId: 'openai',
        apiKey: 'sk-test',
        baseUrl: 'not-a-url',
      })).rejects.toThrow('base URL')
    })

    it('accepts valid http:// baseUrl (for local proxy)', async () => {
      await expect(store.saveConfig({
        providerId: 'openai',
        apiKey: 'sk-test',
        baseUrl: 'http://localhost:3000',
      })).resolves.not.toThrow()
    })

    it('rejects ftp:// baseUrl', async () => {
      await expect(store.saveConfig({
        providerId: 'openai',
        apiKey: 'sk-test',
        baseUrl: 'ftp://api.openai.com',
      })).rejects.toThrow('base URL')
    })
  })

  // --- loadConfig ---

  describe('loadConfig', () => {
    it('loads a stored config', async () => {
      await store.saveConfig({
        providerId: 'openai',
        apiKey: 'sk-test-key-123',
        baseUrl: 'https://api.openai.com',
      })
      const config = await store.loadConfig('openai')
      expect(config).not.toBeNull()
      expect(config!.providerId).toBe('openai')
      expect(config!.isEnabled).toBe(true)
    })

    it('returns null for non-existent provider', async () => {
      const config = await store.loadConfig('nonexistent')
      expect(config).toBeNull()
    })
  })

  // --- getApiKey ---

  describe('getApiKey', () => {
    it('returns decrypted API key', async () => {
      await store.saveConfig({
        providerId: 'openai',
        apiKey: 'sk-secret-456',
        baseUrl: 'https://api.openai.com',
      })
      const key = await store.getApiKey('openai')
      expect(key).toBe('sk-secret-456')
    })

    it('returns null for non-existent provider', async () => {
      const key = await store.getApiKey('nonexistent')
      expect(key).toBeNull()
    })
  })

  // --- getBaseUrl ---

  describe('getBaseUrl', () => {
    it('returns configured baseUrl', async () => {
      await store.saveConfig({
        providerId: 'stability',
        apiKey: 'sk-test',
        baseUrl: 'https://api.stability.ai',
      })
      const url = await store.getBaseUrl('stability', 'https://default.com')
      expect(url).toBe('https://api.stability.ai')
    })

    it('returns default when not configured', async () => {
      const url = await store.getBaseUrl('openai', 'https://default.com')
      expect(url).toBe('https://default.com')
    })
  })

  // --- listProviders ---

  describe('listProviders', () => {
    it('returns empty array when no configs stored', async () => {
      const list = await store.listProviders()
      expect(list).toEqual([])
    })

    it('returns configured provider IDs', async () => {
      await store.saveConfig({ providerId: 'openai', apiKey: 'k1', baseUrl: 'https://a.com' })
      await store.saveConfig({ providerId: 'stability', apiKey: 'k2', baseUrl: 'https://b.com' })
      const list = await store.listProviders()
      expect(list).toContain('openai')
      expect(list).toContain('stability')
      expect(list.length).toBe(2)
    })
  })

  // --- deleteConfig ---

  describe('deleteConfig', () => {
    it('removes a provider config', async () => {
      await store.saveConfig({ providerId: 'openai', apiKey: 'k1', baseUrl: 'https://a.com' })
      await store.deleteConfig('openai')
      const config = await store.loadConfig('openai')
      expect(config).toBeNull()
    })

    it('is idempotent — deleting non-existent config does not throw', async () => {
      await expect(store.deleteConfig('nonexistent')).resolves.not.toThrow()
    })
  })

  // --- hasConfig ---

  describe('hasConfig', () => {
    it('returns true when config exists', async () => {
      await store.saveConfig({ providerId: 'openai', apiKey: 'k1', baseUrl: 'https://a.com' })
      expect(await store.hasConfig('openai')).toBe(true)
    })

    it('returns false when config does not exist', async () => {
      expect(await store.hasConfig('nonexistent')).toBe(false)
    })
  })
})
