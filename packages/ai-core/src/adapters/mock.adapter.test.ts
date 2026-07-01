// ---------------------------------------------------------------------------
// MockAdapter Unit Tests
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MockAdapter } from './mock.adapter'
import { runAdapterContractTests } from './base.test'
import type { AdapterResult } from '../interfaces/types'

// ---------------------------------------------------------------------------
// Factory helper
// ---------------------------------------------------------------------------

function createAdapter(mode?: 'fallback' | 'manual'): MockAdapter {
  return new MockAdapter(mode ? { mode } : undefined)
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('MockAdapter', () => {
  let adapter: MockAdapter

  beforeEach(() => {
    adapter = createAdapter()
  })

  // -------------------------------------------------------------------------
  // Shared contract tests (from base.test.ts)
  // -------------------------------------------------------------------------
  runAdapterContractTests(new MockAdapter())

  // -------------------------------------------------------------------------
  // Static metadata (D-06)
  // -------------------------------------------------------------------------

  describe('static metadata', () => {
    it('providerId is "mock"', () => {
      expect(adapter.providerId).toBe('mock')
    })

    it('providerName is "MockAdapter"', () => {
      expect(adapter.providerName).toBe('MockAdapter')
    })

    it('defaultBaseUrl is "http://localhost/mock"', () => {
      expect(adapter.defaultBaseUrl).toBe('http://localhost/mock')
    })
  })

  // -------------------------------------------------------------------------
  // getModels()
  // -------------------------------------------------------------------------

  describe('getModels()', () => {
    it('returns at least one model', () => {
      const models = adapter.getModels()
      expect(models.length).toBeGreaterThanOrEqual(1)
    })

    it('first model has id "mock-default"', () => {
      const models = adapter.getModels()
      expect(models[0].id).toBe('mock-default')
    })

    it('supportedSizes includes "1024x1024"', () => {
      const models = adapter.getModels()
      expect(models[0].supportedSizes).toContain('1024x1024')
    })
  })

  // -------------------------------------------------------------------------
  // getConfigSchema()
  // -------------------------------------------------------------------------

  describe('getConfigSchema()', () => {
    it('returns ConfigField[]', () => {
      const schema = adapter.getConfigSchema()
      expect(Array.isArray(schema)).toBe(true)
    })

    it('apiKey field is optional (required === false)', () => {
      const schema = adapter.getConfigSchema()
      const apiKeyField = schema.find((f) => f.key === 'apiKey')
      expect(apiKeyField).toBeDefined()
      expect(apiKeyField!.required).toBe(false)
    })

    it('includes a baseUrl field', () => {
      const schema = adapter.getConfigSchema()
      const baseUrlField = schema.find((f) => f.key === 'baseUrl')
      expect(baseUrlField).toBeDefined()
    })
  })

  // -------------------------------------------------------------------------
  // testConnection()
  // -------------------------------------------------------------------------

  describe('testConnection()', () => {
    it('returns { success: true }', async () => {
      const result = await adapter.testConnection()
      expect(result.success).toBe(true)
    })

    it('returns a message string', async () => {
      const result = await adapter.testConnection()
      expect(typeof result.message).toBe('string')
      expect(result.message.length).toBeGreaterThan(0)
    })
  })

  // -------------------------------------------------------------------------
  // execute()
  // -------------------------------------------------------------------------

  describe('execute()', () => {
    it('returns AdapterResult with imageBlobId', async () => {
      const result = await adapter.execute(
        { prompt: 'test', width: 512, height: 512, seed: 42 },
        {},
      )
      expect(result).toHaveProperty('imageBlobId')
      expect(typeof result.imageBlobId).toBe('string')
      expect(result.imageBlobId).toBeTruthy()
    })

    it('returns correct width and height from nodeData', async () => {
      const result = await adapter.execute(
        { prompt: 'test', width: 512, height: 512, seed: 42 },
        {},
      )
      expect(result.width).toBe(512)
      expect(result.height).toBe(512)
    })

    it('returns seed from nodeData', async () => {
      const result = await adapter.execute(
        { prompt: 'test', width: 512, height: 512, seed: 42 },
        {},
      )
      expect(result.seed).toBe(42)
    })

    it('returns model as "mock-default"', async () => {
      const result = await adapter.execute(
        { prompt: 'test' },
        {},
      )
      expect(result.model).toBe('mock-default')
    })

    it('returns timing as a positive number', async () => {
      const result = await adapter.execute(
        { prompt: 'test' },
        {},
      )
      expect(result.timing).toBeGreaterThanOrEqual(0)
    })

    it('uses defaults (1024x1024, random seed) when nodeData is empty', async () => {
      const result = await adapter.execute({}, {})
      expect(result.width).toBe(1024)
      expect(result.height).toBe(1024)
      expect(typeof result.seed).toBe('number')
    })

    it('same prompt produces same color (deterministic hash)', async () => {
      const r1 = await adapter.execute(
        { prompt: 'hello world', width: 256, height: 256, seed: 1 },
        {},
      )
      const r2 = await adapter.execute(
        { prompt: 'hello world', width: 256, height: 256, seed: 1 },
        {},
      )
      // Results should be structurally identical
      expect(r1.width).toBe(r2.width)
      expect(r1.height).toBe(r2.height)
      expect(r1.model).toBe(r2.model)
      expect(r1.seed).toBe(r2.seed)
    })

    it('different prompts produce different results', async () => {
      const r1 = await adapter.execute({ prompt: 'red apple', seed: 1 }, {})
      const r2 = await adapter.execute({ prompt: 'blue ocean', seed: 2 }, {})
      // Different prompts with different seeds should produce different results
      expect(r1.seed).not.toBe(r2.seed)
    })

    it('emits progress events with percent and stage', async () => {
      const progressEvents: Array<{ percent: number; stage: string }> = []
      adapter.on('progress', (e: { percent: number; stage: string }) => {
        progressEvents.push(e)
      })
      await adapter.execute({ prompt: 'test' }, {})
      expect(progressEvents.length).toBeGreaterThan(0)
      for (const evt of progressEvents) {
        expect(evt).toHaveProperty('percent')
        expect(evt).toHaveProperty('stage')
      }
    })

    it('emits done event with AdapterResult', async () => {
      let doneEvent: AdapterResult | null = null
      adapter.on('done', (e: AdapterResult) => {
        doneEvent = e
      })
      const result = await adapter.execute({ prompt: 'test' }, {})
      expect(doneEvent).not.toBeNull()
      expect(doneEvent!.imageBlobId).toBe(result.imageBlobId)
    })

    it('calls onStoreImage when provided', async () => {
      const storeImage = vi.fn().mockResolvedValue('stored-blob-id-42')
      const result = await adapter.execute(
        { prompt: 'test' },
        {},
        storeImage,
      )
      expect(storeImage).toHaveBeenCalledTimes(1)
      expect(storeImage).toHaveBeenCalledWith(expect.any(Blob))
      expect(result.imageBlobId).toBe('stored-blob-id-42')
    })
  })

  // -------------------------------------------------------------------------
  // Dual-mode support (D-16)
  // -------------------------------------------------------------------------

  describe('Dual-mode support', () => {
    it('constructor accepts mode option', () => {
      const fallback = createAdapter('fallback')
      expect(fallback).toBeInstanceOf(MockAdapter)
    })

    it('createOfflineFallback() returns a MockAdapter instance', () => {
      const fallback = MockAdapter.createOfflineFallback()
      expect(fallback).toBeInstanceOf(MockAdapter)
    })
  })
})
