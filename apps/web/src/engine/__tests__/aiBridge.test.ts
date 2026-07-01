import { describe, it, expect, vi } from 'vitest'
import { createAiExecutor, resolveProviderId } from '../aiBridge'

// Mock dependencies
vi.mock('../../stores/engineStore', () => ({
  useEngineStore: {
    getState: () => ({
      setNodeStatus: vi.fn(),
      setNodeError: vi.fn(),
    }),
  },
}))

vi.mock('../../stores/nodeGraphStore', () => ({
  useNodeGraphStore: {
    getState: () => ({ nodes: [] }),
  },
}))

vi.mock('../../indexedb/imageStore', () => ({
  imageBlobStore: {
    store: vi.fn().mockResolvedValue('mock-blob-id'),
    get: vi.fn(),
  },
}))

describe('createAiExecutor', () => {
  it('throws if no adapter registered for providerId', async () => {
    const executor = createAiExecutor('nonexistent', {
      providerStore: { getApiKey: vi.fn(), getBaseUrl: vi.fn() } as any,
    })
    await expect(executor({ __nodeId: 'n1' }, {}))
      .rejects.toThrow('No adapter registered')
  })
  // Additional tests will be written when real adapters exist in the test env
})

describe('resolveProviderId', () => {
  it('maps dall-e model to openai', () => {
    expect(resolveProviderId({ model: 'dall-e-3' }, 'text-to-image')).toBe('openai')
  })
  it('maps stable-diffusion model to stability', () => {
    expect(resolveProviderId({ model: 'stable-diffusion-xl' }, 'text-to-image')).toBe('stability')
  })
  it('defaults style node to stability', () => {
    expect(resolveProviderId({}, 'style')).toBe('stability')
  })
  it('defaults unknown node type to openai', () => {
    expect(resolveProviderId({}, 'text-to-image')).toBe('openai')
  })
})
