// ---------------------------------------------------------------------------
// ProviderStore Singleton — accessed by the AI bridge at execution time
//
// Initialized once at app bootstrap via initProviderStore().
// Bridge imports getProviderStore() to read API config for adapter calls.
// ---------------------------------------------------------------------------

import { ProviderStore } from '@ac-canvas/ai-core/config/providerStore'
import { DexieProviderStorage } from '../indexedb/providerStorage'

let instance: ProviderStore | null = null

/**
 * Get the global ProviderStore instance. Throws if not initialized.
 */
export function getProviderStore(): ProviderStore {
  if (!instance) {
    throw new Error(
      'ProviderStore not initialized. Call initProviderStore() at app bootstrap.',
    )
  }
  return instance
}

/**
 * Initialize the ProviderStore singleton with a Dexie-backed storage.
 * Called once from App.tsx useEffect on mount.
 */
export function initProviderStore(): void {
  if (instance) return // Already initialized
  const storage = new DexieProviderStorage()
  instance = new ProviderStore(storage)
}

/**
 * Check if ProviderStore has been initialized (for guard clauses).
 */
export function isProviderStoreReady(): boolean {
  return instance !== null
}
