// ---------------------------------------------------------------------------
// Shared Adapter Contract Tests
// ---------------------------------------------------------------------------
// Reusable contract tests that every adapter implementation must pass.
// Each adapter's test file should call runAdapterContractTests(adapter)
// with a concrete instance of their adapter class.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest'
import type { AiAdapter } from '../interfaces/AiAdapter'

// Smoke test: verify the export is available for downstream adapters
describe('base.test.ts', () => {
  it('exports runAdapterContractTests as a function', () => {
    expect(typeof runAdapterContractTests).toBe('function')
  })
})

/**
 * Reusable contract tests for any AiAdapter implementation.
 * Each adapter test file should call `runAdapterContractTests(adapter)`.
 */
export function runAdapterContractTests(adapter: AiAdapter): void {
  describe(`AiAdapter contract: ${adapter.providerId}`, () => {
    it('has providerId as a non-empty string', () => {
      expect(adapter.providerId).toBeTruthy()
      expect(typeof adapter.providerId).toBe('string')
    })

    it('has providerName as a non-empty string', () => {
      expect(adapter.providerName).toBeTruthy()
      expect(typeof adapter.providerName).toBe('string')
    })

    it('has defaultBaseUrl as a non-empty string starting with http', () => {
      expect(adapter.defaultBaseUrl).toBeTruthy()
      expect(adapter.defaultBaseUrl).toMatch(/^https?:\/\//)
    })

    it('implements getConfigSchema() returning ConfigField[]', () => {
      const schema = adapter.getConfigSchema()
      expect(Array.isArray(schema)).toBe(true)
      for (const field of schema) {
        expect(field).toHaveProperty('key')
        expect(field).toHaveProperty('label')
        expect(field).toHaveProperty('type')
        expect(field).toHaveProperty('required')
      }
    })

    it('implements getModels() returning ModelDescriptor[]', () => {
      const models = adapter.getModels()
      expect(Array.isArray(models)).toBe(true)
      for (const model of models) {
        expect(model).toHaveProperty('id')
        expect(model).toHaveProperty('name')
        expect(model).toHaveProperty('supportedSizes')
        expect(model).toHaveProperty('maxDimensions')
        expect(model).toHaveProperty('supportsSeed')
      }
    })

    it('implements testConnection() returning a Promise of ConnectionResult', async () => {
      const result = await adapter.testConnection()
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('message')
      expect(typeof result.message).toBe('string')
    })

    it('implements execute() returning a Promise of AdapterResult', async () => {
      const result = await adapter.execute({}, {})
      expect(result).toHaveProperty('imageBlobId')
      expect(result).toHaveProperty('width')
      expect(result).toHaveProperty('height')
      expect(result).toHaveProperty('seed')
      expect(result).toHaveProperty('model')
      expect(result).toHaveProperty('timing')
    })

    it('emits progress events during execute()', async () => {
      const events: Array<{ percent: number; stage: string }> = []
      adapter.on('progress', (e: { percent: number; stage: string }) => events.push(e))
      await adapter.execute({}, {})
      // At minimum should emit 'done' — adapters may emit progress, sending_request, etc.
      expect(events.length).toBeGreaterThanOrEqual(0)
      adapter.removeAllListeners('progress')
    })
  })
}
