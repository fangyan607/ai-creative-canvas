// ---------------------------------------------------------------------------
// DexieProviderStorage — Dexie.js-backed ProviderConfigStorage
//
// Implements the ProviderConfigStorage interface from @ac-canvas/ai-core
// using the existing Dexie database (Phase 1). Provider configs stored in the
// 'providerConfigs' table defined at schema version 2 in db.ts.
// ---------------------------------------------------------------------------

import type { ProviderConfigStorage, ProviderConfigRecord } from '@ac-canvas/ai-core/config/providerStore'
import { db } from './db'

/**
 * Dexie-backed storage for encrypted provider configurations.
 * Uses the existing Dexie database singleton.
 */
export class DexieProviderStorage implements ProviderConfigStorage {
  private getTable() {
    return db.providerConfigs
  }

  async get(providerId: string): Promise<ProviderConfigRecord | undefined> {
    return this.getTable().get(providerId) as Promise<ProviderConfigRecord | undefined>
  }

  async put(record: ProviderConfigRecord): Promise<void> {
    await this.getTable().put(record)
  }

  async delete(providerId: string): Promise<void> {
    await this.getTable().delete(providerId)
  }

  async toArray(): Promise<ProviderConfigRecord[]> {
    return this.getTable().toArray() as Promise<ProviderConfigRecord[]>
  }
}
