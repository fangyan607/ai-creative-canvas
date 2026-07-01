// ---------------------------------------------------------------------------
// AdapterRegistry — Singleton registry for AI adapter constructors
// ---------------------------------------------------------------------------
// Adapters self-register at bootstrap via register(). Phase 5 queries the
// registry to find the right adapter for a node's selected provider.
// ---------------------------------------------------------------------------

import type { AiAdapter } from './interfaces/AiAdapter'

type AdapterConstructor = new (...args: unknown[]) => AiAdapter

export class AdapterRegistry {
  private static instance: AdapterRegistry
  private adapters = new Map<string, AdapterConstructor>()

  static getInstance(): AdapterRegistry {
    if (!AdapterRegistry.instance) {
      AdapterRegistry.instance = new AdapterRegistry()
    }
    return AdapterRegistry.instance
  }

  register(adapterClass: AdapterConstructor): void {
    // Create temporary instance to read providerId
    const instance = new (adapterClass as any)() as AiAdapter
    const id = instance.providerId
    if (!id) {
      throw new Error('Adapter must have a providerId')
    }
    if (this.adapters.has(id)) {
      console.warn(`Adapter already registered for provider: ${id}. Overwriting.`)
    }
    this.adapters.set(id, adapterClass)
  }

  get(providerId: string): AdapterConstructor | undefined {
    return this.adapters.get(providerId)
  }

  getAllProviders(): Array<{ providerId: string; providerName: string }> {
    return Array.from(this.adapters.entries()).map(([id, Ctor]) => {
      const inst = new (Ctor as any)() as AiAdapter
      return { providerId: id, providerName: inst.providerName }
    })
  }

  clear(): void {
    this.adapters.clear()
  }
}
