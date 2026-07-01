// ---------------------------------------------------------------------------
// StabilityAdapter Unit Tests
// ---------------------------------------------------------------------------
// Tests cover both v1 (SDXL, JSON) and v2beta (SD3/SD3.5, FormData) dispatch,
// image-to-image mode, error handling, event emission, and custom base URL.
// All tests use mocked fetch() — no real Stability API key required.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StabilityAdapter } from './stability.adapter'
import { runAdapterContractTests } from './base.test'
import { AiAdapterError } from '../interfaces/types'
import type { AdapterResult } from '../interfaces/types'

// ---------------------------------------------------------------------------
// Mock response helpers
// ---------------------------------------------------------------------------

// Minimal valid 1x1 transparent PNG as base64
const MOCK_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

function createV2betaResponse(seed = 12345): Record<string, unknown> {
  return { image: MOCK_PNG_BASE64, seed }
}

function createV1Response(seed = 12345): Record<string, unknown> {
  return { artifacts: [{ base64: MOCK_PNG_BASE64, seed, finishReason: 'SUCCESS' }] }
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('StabilityAdapter', () => {
  let adapter: StabilityAdapter
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(createV2betaResponse()),
    })
    adapter = new StabilityAdapter({ apiKey: 'sk-test-stability-key' })
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  // -------------------------------------------------------------------------
  // Shared contract tests (from base.test.ts)
  // -------------------------------------------------------------------------
  runAdapterContractTests(adapter)

  // -------------------------------------------------------------------------
  // Static metadata
  // -------------------------------------------------------------------------

  describe('static metadata', () => {
    it('providerId is "stability"', () => {
      expect(adapter.providerId).toBe('stability')
    })

    it('providerName is "Stability AI"', () => {
      expect(adapter.providerName).toBe('Stability AI')
    })

    it('defaultBaseUrl is "https://api.stability.ai"', () => {
      expect(adapter.defaultBaseUrl).toBe('https://api.stability.ai')
    })
  })

  // -------------------------------------------------------------------------
  // getModels()
  // -------------------------------------------------------------------------

  describe('getModels()', () => {
    it('returns both v1 and v2beta models', () => {
      const models = adapter.getModels()
      expect(models.length).toBeGreaterThanOrEqual(3)
    })

    it('includes sd3.5-large (v2beta) model', () => {
      const models = adapter.getModels()
      const sd35 = models.find((m) => m.id === 'sd3.5-large')
      expect(sd35).toBeDefined()
      expect(sd35!.supportsImageToImage).toBe(true)
      expect(sd35!.supportsSeed).toBe(true)
    })

    it('includes stable-diffusion-xl-1024-v1-0 (v1) model', () => {
      const models = adapter.getModels()
      const sdxl = models.find((m) => m.id === 'stable-diffusion-xl-1024-v1-0')
      expect(sdxl).toBeDefined()
      expect(sdxl!.supportsImageToImage).toBe(true)
      expect(sdxl!.supportsSeed).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // getConfigSchema()
  // -------------------------------------------------------------------------

  describe('getConfigSchema()', () => {
    it('returns apiKey field as password type with required true', () => {
      const schema = adapter.getConfigSchema()
      const apiKeyField = schema.find((f) => f.key === 'apiKey')
      expect(apiKeyField).toBeDefined()
      expect(apiKeyField!.type).toBe('password')
      expect(apiKeyField!.required).toBe(true)
    })

    it('returns baseUrl field as text type with default value', () => {
      const schema = adapter.getConfigSchema()
      const baseUrlField = schema.find((f) => f.key === 'baseUrl')
      expect(baseUrlField).toBeDefined()
      expect(baseUrlField!.type).toBe('text')
      expect(baseUrlField!.required).toBe(false)
      expect(baseUrlField!.defaultValue).toBe('https://api.stability.ai')
    })
  })

  // -------------------------------------------------------------------------
  // testConnection()
  // -------------------------------------------------------------------------

  describe('testConnection()', () => {
    it('calls GET {baseUrl}/v1/user/account with Authorization header', async () => {
      await adapter.testConnection()
      const callUrl = (global.fetch as any).mock.calls[0][0]
      const callOptions = (global.fetch as any).mock.calls[0][1]
      expect(callUrl).toContain('/v1/user/account')
      expect(callOptions.method).toBe('GET')
      expect(callOptions.headers.Authorization).toContain('Bearer')
    })

    it('returns success on 200', async () => {
      const result = await adapter.testConnection()
      expect(result.success).toBe(true)
    })

    it('returns failure on 401', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Invalid API key' }),
      })
      const result = await adapter.testConnection()
      expect(result.success).toBe(false)
      expect(result.message).toContain('auth_failed')
    })
  })

  // -------------------------------------------------------------------------
  // v2beta (SD3) dispatch tests
  // -------------------------------------------------------------------------

  describe('v2beta SD3 dispatch', () => {

    it('uses FormData POST to /v2beta/stable-image/generate/sd3 for SD3.5 model', async () => {
      await adapter.execute({ prompt: 'test', model: 'sd3.5-large' }, {})
      const callUrl = (global.fetch as any).mock.calls[0][0]
      const callOptions = (global.fetch as any).mock.calls[0][1]
      expect(callUrl).toContain('/v2beta/stable-image/generate/sd3')
      expect(callOptions.method).toBe('POST')
      expect(callOptions.body).toBeInstanceOf(FormData)
      expect(callOptions.headers.Authorization).toContain('Bearer')
    })

    it('includes prompt and model in FormData', async () => {
      await adapter.execute({ prompt: 'A mountain', model: 'sd3.5-large' }, {})
      const formData = (global.fetch as any).mock.calls[0][1].body as FormData
      expect(formData.get('prompt')).toBe('A mountain')
      expect(formData.get('model')).toBe('sd3.5-large')
    })

    it('derives aspect_ratio from width and height (16:9)', async () => {
      await adapter.execute({ prompt: 'test', model: 'sd3.5-large', width: 1792, height: 1024 }, {})
      const formData = (global.fetch as any).mock.calls[0][1].body as FormData
      const aspect = formData.get('aspect_ratio')
      expect(aspect).toBe('16:9')
    })

    it('derives aspect_ratio from width and height (1:1)', async () => {
      await adapter.execute({ prompt: 'test', model: 'sd3.5-large', width: 1024, height: 1024 }, {})
      const formData = (global.fetch as any).mock.calls[0][1].body as FormData
      const aspect = formData.get('aspect_ratio')
      expect(aspect).toBe('1:1')
    })

    it('sends seed parameter when seed > 0 in nodeData', async () => {
      await adapter.execute({ prompt: 'test', model: 'sd3.5-large', seed: 42 }, {})
      const formData = (global.fetch as any).mock.calls[0][1].body as FormData
      expect(formData.get('seed')).toBe('42')
    })

    it('sends negative_prompt when provided', async () => {
      await adapter.execute({ prompt: 'test', model: 'sd3.5-large', negativePrompt: 'blurry' }, {})
      const formData = (global.fetch as any).mock.calls[0][1].body as FormData
      expect(formData.get('negative_prompt')).toBe('blurry')
    })

    it('returns seed from response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(createV2betaResponse(999)),
      })
      const result = await adapter.execute({ prompt: 'test', model: 'sd3.5-large' }, {})
      expect(result.seed).toBe(999)
    })

    it('does NOT set Content-Type header for FormData (browser sets boundary)', async () => {
      await adapter.execute({ prompt: 'test', model: 'sd3.5-large' }, {})
      const callOptions = (global.fetch as any).mock.calls[0][1]
      expect(callOptions.headers['Content-Type']).toBeUndefined()
    })

    it('defaults to sd3.5-large model when no model specified', async () => {
      await adapter.execute({ prompt: 'test' }, {})
      const formData = (global.fetch as any).mock.calls[0][1].body as FormData
      expect(formData.get('model')).toBe('sd3.5-large')
    })
  })

  // -------------------------------------------------------------------------
  // v1 (SDXL) dispatch tests
  // -------------------------------------------------------------------------

  describe('v1 SDXL dispatch', () => {

    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(createV1Response()),
      })
    })

    it('uses JSON POST to /v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', async () => {
      await adapter.execute({ prompt: 'test', model: 'stable-diffusion-xl-1024-v1-0' }, {})
      const callUrl = (global.fetch as any).mock.calls[0][0]
      const callOptions = (global.fetch as any).mock.calls[0][1]
      expect(callUrl).toContain('/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image')
      expect(callOptions.method).toBe('POST')
      expect(callOptions.headers['Content-Type']).toBe('application/json')
    })

    it('sends text_prompts array with prompt and weight', async () => {
      await adapter.execute({ prompt: 'test prompt', model: 'stable-diffusion-xl-1024-v1-0' }, {})
      const callOptions = (global.fetch as any).mock.calls[0][1]
      const body = JSON.parse(callOptions.body)
      expect(body.text_prompts).toHaveLength(1)
      expect(body.text_prompts[0].text).toBe('test prompt')
      expect(body.text_prompts[0].weight).toBe(1)
    })

    it('sends width, height, cfg_scale, samples, steps', async () => {
      await adapter.execute({ prompt: 'test', model: 'stable-diffusion-xl-1024-v1-0', width: 512, height: 768 }, {})
      const callOptions = (global.fetch as any).mock.calls[0][1]
      const body = JSON.parse(callOptions.body)
      expect(body.width).toBe(512)
      expect(body.height).toBe(768)
      expect(body.cfg_scale).toBe(7)
      expect(body.samples).toBe(1)
      expect(body.steps).toBe(30)
    })

    it('sends seed when seed > 0', async () => {
      await adapter.execute({ prompt: 'test', model: 'stable-diffusion-xl-1024-v1-0', seed: 42 }, {})
      const callOptions = (global.fetch as any).mock.calls[0][1]
      const body = JSON.parse(callOptions.body)
      expect(body.seed).toBe(42)
    })

    it('does NOT send seed when seed is 0 (random)', async () => {
      await adapter.execute({ prompt: 'test', model: 'stable-diffusion-xl-1024-v1-0', seed: 0 }, {})
      const callOptions = (global.fetch as any).mock.calls[0][1]
      const body = JSON.parse(callOptions.body)
      expect(body.seed).toBeUndefined()
    })

    it('sends style_preset when provided', async () => {
      await adapter.execute({ prompt: 'test', model: 'stable-diffusion-xl-1024-v1-0', stylePreset: 'cinematic' }, {})
      const callOptions = (global.fetch as any).mock.calls[0][1]
      const body = JSON.parse(callOptions.body)
      expect(body.style_preset).toBe('cinematic')
    })

    it('returns seed from artifacts[0].seed', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(createV1Response(777)),
      })
      const result = await adapter.execute({ prompt: 'test', model: 'stable-diffusion-xl-1024-v1-0' }, {})
      expect(result.seed).toBe(777)
    })
  })

  // -------------------------------------------------------------------------
  // Image-to-image tests
  // -------------------------------------------------------------------------

  describe('image-to-image', () => {
    it('sends image as FormData when inputs contain imageBlob', async () => {
      const mockBlob = new Blob(['fake-image-data'], { type: 'image/png' })
      global.fetch = vi.fn().mockImplementation(async (_url: string, opts: any) => {
        if (opts?.body instanceof FormData) {
          expect(opts.body.has('image')).toBeTruthy()
          expect(opts.body.get('mode')).toBe('image-to-image')
          expect(opts.body.get('strength')).toBe('0.8')
        }
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve(createV2betaResponse()),
        }
      })
      await adapter.execute(
        { prompt: 'test', model: 'sd3.5-large' },
        { imageBlobId: 'existing-img-1', imageBlob: mockBlob },
      )
    })

    it('uses strength from nodeData when provided', async () => {
      const mockBlob = new Blob(['fake-image-data'], { type: 'image/png' })
      global.fetch = vi.fn().mockImplementation(async (_url: string, opts: any) => {
        if (opts?.body instanceof FormData) {
          expect(opts.body.get('strength')).toBe('0.5')
        }
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve(createV2betaResponse()),
        }
      })
      await adapter.execute(
        { prompt: 'test', model: 'sd3.5-large', strength: 0.5 },
        { imageBlobId: 'existing-img-1', imageBlob: mockBlob },
      )
    })
  })

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------

  describe('error handling', () => {
    it('throws AiAdapterError with auth_failed on 401', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Invalid API key' }),
      })
      await expect(adapter.execute({ prompt: 'test' }, {}))
        .rejects.toThrow(AiAdapterError)
    })

    it('throws AiAdapterError with rate_limited on 429', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ message: 'Too many requests' }),
      })
      try {
        await adapter.execute({ prompt: 'test' }, {})
      } catch (e: any) {
        expect(e.code).toBe('rate_limited')
      }
    })

    it('throws AiAdapterError with invalid_params on 400', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Invalid parameters' }),
      })
      try {
        await adapter.execute({ prompt: 'test' }, {})
      } catch (e: any) {
        expect(e.code).toBe('invalid_params')
      }
    })

    it('sanitizes error messages — no raw API keys', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Invalid API key: sk-test-key-12345' }),
      })
      try {
        await adapter.execute({ prompt: 'test' }, {})
      } catch (e: any) {
        expect(e.message).not.toContain('sk-')
        expect(e.message).not.toContain('sk-test')
      }
    })

    it('throws AiAdapterError on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
      try {
        await adapter.execute({ prompt: 'test' }, {})
      } catch (e: any) {
        expect(e.code).toBe('server_error')
      }
    })
  })

  // -------------------------------------------------------------------------
  // Custom base URL
  // -------------------------------------------------------------------------

  describe('custom base URL', () => {
    it('uses custom baseUrl when provided', async () => {
      const customAdapter = new StabilityAdapter({
        apiKey: 'sk-key',
        baseUrl: 'https://stability-proxy.example.com',
      })
      await customAdapter.execute({ prompt: 'test', model: 'sd3.5-large' }, {})
      const callUrl = (global.fetch as any).mock.calls[0][0]
      expect(callUrl).toContain('stability-proxy.example.com')
    })
  })

  // -------------------------------------------------------------------------
  // Event emission
  // -------------------------------------------------------------------------

  describe('events', () => {
    it('emits progress events during execute', async () => {
      const events: Array<{ percent: number; stage: string }> = []
      adapter.on('progress', (e) => events.push(e))
      await adapter.execute({ prompt: 'test' }, {})
      expect(events.length).toBeGreaterThan(0)
    })
  })
})
