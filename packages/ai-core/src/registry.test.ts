// ---------------------------------------------------------------------------
// AdapterRegistry Tests
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AdapterRegistry } from './registry'
import { AiAdapter } from './interfaces/AiAdapter'
import type { AdapterResult, ConnectionResult, ModelDescriptor, ConfigField } from './interfaces/types'

class MockRegistryAdapter extends AiAdapter {
  readonly providerId = 'mock-registry'
  readonly providerName = 'Mock Registry'
  readonly defaultBaseUrl = 'https://mock.example.com'

  async execute(): Promise<AdapterResult> {
    return { imageBlobId: '', width: 0, height: 0, seed: null, model: '', timing: 0 }
  }

  async testConnection(): Promise<ConnectionResult> {
    return { success: true, message: '' }
  }

  getModels(): ModelDescriptor[] {
    return [{ id: '', name: '', supportedSizes: [], maxDimensions: { width: 0, height: 0 }, supportsImageToImage: false, supportsSeed: false }]
  }

  getConfigSchema(): ConfigField[] {
    return []
  }
}

class MockRegistryAdapter2 extends AiAdapter {
  readonly providerId = 'mock-registry-2'
  readonly providerName = 'Mock Registry 2'
  readonly defaultBaseUrl = 'https://mock2.example.com'

  async execute(): Promise<AdapterResult> {
    return { imageBlobId: '', width: 0, height: 0, seed: null, model: '', timing: 0 }
  }

  async testConnection(): Promise<ConnectionResult> {
    return { success: true, message: '' }
  }

  getModels(): ModelDescriptor[] {
    return [{ id: '', name: '', supportedSizes: [], maxDimensions: { width: 0, height: 0 }, supportsImageToImage: false, supportsSeed: false }]
  }

  getConfigSchema(): ConfigField[] {
    return []
  }
}

describe('AdapterRegistry', () => {
  let registry: AdapterRegistry

  beforeEach(() => {
    registry = AdapterRegistry.getInstance()
    registry.clear()
  })

  it('is a singleton', () => {
    const instance1 = AdapterRegistry.getInstance()
    const instance2 = AdapterRegistry.getInstance()
    expect(instance1).toBe(instance2)
  })

  it('registers an adapter and retrieves it by providerId', () => {
    registry.register(MockRegistryAdapter)
    const Constructor = registry.get('mock-registry')
    expect(Constructor).toBeDefined()
  })

  it('throws when registering an adapter with empty providerId', () => {
    // An adapter with empty providerId should trigger the error
    class EmptyIdAdapter extends AiAdapter {
      readonly providerId = ''
      readonly providerName = 'Empty'
      readonly defaultBaseUrl = 'https://empty.example.com'
      async execute() { return { imageBlobId: '', width: 0, height: 0, seed: null, model: '', timing: 0 } }
      async testConnection() { return { success: true, message: '' } }
      getModels() { return [] }
      getConfigSchema() { return [] }
    }
    expect(() => registry.register(EmptyIdAdapter)).toThrow('Adapter must have a providerId')
  })

  it('returns undefined for unregistered providerId', () => {
    const Constructor = registry.get('non-existent')
    expect(Constructor).toBeUndefined()
  })

  it('lists all registered providers with id and name', () => {
    registry.register(MockRegistryAdapter)
    registry.register(MockRegistryAdapter2)
    const providers = registry.getAllProviders()
    expect(providers).toHaveLength(2)
    expect(providers).toContainEqual({ providerId: 'mock-registry', providerName: 'Mock Registry' })
    expect(providers).toContainEqual({ providerId: 'mock-registry-2', providerName: 'Mock Registry 2' })
  })

  it('warns when overwriting an existing adapter', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    registry.register(MockRegistryAdapter)
    registry.register(MockRegistryAdapter)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Adapter already registered for provider: mock-registry'),
    )
    warnSpy.mockRestore()
  })

  it('clears all registered adapters', () => {
    registry.register(MockRegistryAdapter)
    registry.clear()
    expect(registry.get('mock-registry')).toBeUndefined()
  })
})
