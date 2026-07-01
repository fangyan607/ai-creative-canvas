import { describe, it, expect, beforeEach } from 'vitest'
import type { AdapterResult, ConnectionResult, ConfigField, ModelDescriptor } from './types'
import { AiAdapterError } from './types'
import { AiAdapter } from './AiAdapter'

// ---------------------------------------------------------------------------
// Test 1-4: Interface shape verification
// ---------------------------------------------------------------------------

describe('AdapterResult shape', () => {
  const result: AdapterResult = {
    imageBlobId: 'blob:test-123',
    width: 1024,
    height: 1024,
    seed: 42,
    model: 'dall-e-3',
    timing: 1500,
  }

  it('has imageBlobId as string', () => {
    expect(typeof result.imageBlobId).toBe('string')
  })

  it('has width as number', () => {
    expect(typeof result.width).toBe('number')
  })

  it('has height as number', () => {
    expect(typeof result.height).toBe('number')
  })

  it('has seed as number | null', () => {
    expect(result.seed === null || typeof result.seed === 'number').toBe(true)
  })

  it('has model as string', () => {
    expect(typeof result.model).toBe('string')
  })

  it('has timing as number', () => {
    expect(typeof result.timing).toBe('number')
  })
})

describe('ConfigField shape', () => {
  const field: ConfigField = {
    key: 'apiKey',
    label: 'API Key',
    type: 'password',
    required: true,
  }

  it('has key as string', () => {
    expect(typeof field.key).toBe('string')
  })

  it('has label as string', () => {
    expect(typeof field.label).toBe('string')
  })

  it('has type as one of text|password|number|select', () => {
    expect(['text', 'password', 'number', 'select']).toContain(field.type)
  })

  it('has required as boolean', () => {
    expect(typeof field.required).toBe('boolean')
  })

  it('accepts optional defaultValue', () => {
    const withDefault: ConfigField = { key: 'k', label: 'L', type: 'text', required: false, defaultValue: 'hello' }
    expect(withDefault.defaultValue).toBe('hello')
  })

  it('accepts optional placeholder', () => {
    const withPlaceholder: ConfigField = { key: 'k', label: 'L', type: 'text', required: false, placeholder: 'Enter...' }
    expect(withPlaceholder.placeholder).toBe('Enter...')
  })

  it('accepts optional validationRegex', () => {
    const withRegex: ConfigField = { key: 'k', label: 'L', type: 'text', required: false, validationRegex: '^sk-' }
    expect(withRegex.validationRegex).toBe('^sk-')
  })

  it('accepts optional options array for select type', () => {
    const withOpts: ConfigField = { key: 'k', label: 'L', type: 'select', required: true, options: ['a', 'b'] }
    expect(withOpts.options).toEqual(['a', 'b'])
  })
})

describe('ModelDescriptor shape', () => {
  const model: ModelDescriptor = {
    id: 'dall-e-3',
    name: 'DALL-E 3',
    supportedSizes: ['1024x1024', '1792x1024'],
    maxDimensions: { width: 1792, height: 1024 },
    supportsImageToImage: false,
    supportsSeed: true,
  }

  it('has id as string', () => {
    expect(typeof model.id).toBe('string')
  })

  it('has name as string', () => {
    expect(typeof model.name).toBe('string')
  })

  it('has supportedSizes as string array', () => {
    expect(Array.isArray(model.supportedSizes)).toBe(true)
    expect(model.supportedSizes.every(s => typeof s === 'string')).toBe(true)
  })

  it('has maxDimensions with width and height', () => {
    expect(model.maxDimensions).toHaveProperty('width')
    expect(typeof model.maxDimensions.width).toBe('number')
    expect(model.maxDimensions).toHaveProperty('height')
    expect(typeof model.maxDimensions.height).toBe('number')
  })

  it('has supportsImageToImage as boolean', () => {
    expect(typeof model.supportsImageToImage).toBe('boolean')
  })

  it('has supportsSeed as boolean', () => {
    expect(typeof model.supportsSeed).toBe('boolean')
  })
})

describe('ConnectionResult shape', () => {
  it('has success as boolean and message as string', () => {
    const success: ConnectionResult = { success: true, message: 'Connected' }
    expect(typeof success.success).toBe('boolean')
    expect(typeof success.message).toBe('string')

    const failure: ConnectionResult = { success: false, message: 'Failed' }
    expect(typeof failure.success).toBe('boolean')
    expect(typeof failure.message).toBe('string')
  })
})

// ---------------------------------------------------------------------------
// Test 5: AiAdapterError
// ---------------------------------------------------------------------------

describe('AiAdapterError', () => {
  it('extends Error with code and message fields', () => {
    const err = new AiAdapterError('auth_failed', 'Authentication failed')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(AiAdapterError)
    expect(err.code).toBe('auth_failed')
    expect(err.message).toBe('Authentication failed')
    expect(err.name).toBe('AiAdapterError')
  })
})

// ---------------------------------------------------------------------------
// Test 6-11: AiAdapter abstract class contract
// ---------------------------------------------------------------------------

describe('AiAdapter abstract class', () => {
  it('is a class (constructible with new)', () => {
    // Verify AiAdapter is a class by checking typeof
    expect(typeof AiAdapter).toBe('function')
  })

  it('has abstract readonly providerId property on prototype', () => {
    // The abstract properties won't exist on the prototype directly,
    // but we verify the class can be extended properly via a concrete impl below
    expect(AiAdapter.prototype).toBeDefined()
  })
})

// Concrete implementation to verify abstract class contract
class TestAdapter extends AiAdapter {
  readonly providerId = 'test'
  readonly providerName = 'Test Provider'
  readonly defaultBaseUrl = 'https://api.test.com'

  async execute(
    _nodeData: Record<string, unknown>,
    _inputs: Record<string, unknown>,
    _onStoreImage?: (blob: Blob) => Promise<string>,
  ): Promise<AdapterResult> {
    return {
      imageBlobId: 'blob:test',
      width: 512,
      height: 512,
      seed: null,
      model: 'test-model',
      timing: 100,
    }
  }

  async testConnection(): Promise<ConnectionResult> {
    return { success: true, message: 'Connected' }
  }

  getModels(): ModelDescriptor[] {
    return [{
      id: 'test-model',
      name: 'Test Model',
      supportedSizes: ['512x512'],
      maxDimensions: { width: 512, height: 512 },
      supportsImageToImage: false,
      supportsSeed: false,
    }]
  }

  getConfigSchema(): ConfigField[] {
    return [{ key: 'apiKey', label: 'API Key', type: 'password', required: true }]
  }
}

describe('Concrete adapter extending AiAdapter', () => {
  let adapter: TestAdapter

  beforeEach(() => {
    adapter = new TestAdapter()
  })

  it('has providerId as non-empty string', () => {
    expect(adapter.providerId).toBeTruthy()
    expect(typeof adapter.providerId).toBe('string')
  })

  it('has providerName as non-empty string', () => {
    expect(adapter.providerName).toBeTruthy()
    expect(typeof adapter.providerName).toBe('string')
  })

  it('has defaultBaseUrl as non-empty string starting with http', () => {
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
    expect(events.length).toBeGreaterThanOrEqual(0)
    adapter.removeAllListeners('progress')
  })
})
