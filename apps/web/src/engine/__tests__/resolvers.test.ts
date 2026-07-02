import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createDefaultResolvers } from '../resolvers'
import type { ExecutorResolver, Executor } from '../types'

// Mock AI queue store (needed by text-to-image and style resolvers)
vi.mock('../../stores/aiQueueStore', () => ({
  useAIQueueStore: {
    getState: () => ({
      enqueue: vi.fn().mockResolvedValue({ imageBlobId: 'mock-blob-id', queueItemId: 'q-1' }),
    }),
  },
}))

// Mock providerStoreSingleton
vi.mock('../../stores/providerStoreSingleton', () => ({
  getProviderStore: () => ({
    getState: () => ({
      providers: {},
      defaultProvider: 'mock',
    }),
  }),
}))

// Mock aiBridge
vi.mock('../aiBridge', () => ({
  createAiExecutor: vi.fn(() => async () => ({
    imageBlobId: 'mock-ai-blob',
    width: 1024,
    height: 1024,
  })),
  resolveProviderId: vi.fn(() => 'mock'),
}))

describe('createDefaultResolvers', () => {
  let resolvers: ExecutorResolver

  beforeEach(() => {
    resolvers = createDefaultResolvers()
  })

  it('returns a Map', () => {
    expect(resolvers).toBeInstanceOf(Map)
  })

  it('contains all 5 node type resolvers', () => {
    expect(resolvers.has('prompt')).toBe(true)
    expect(resolvers.has('text-to-image')).toBe(true)
    expect(resolvers.has('style')).toBe(true)
    expect(resolvers.has('merge')).toBe(true)
    expect(resolvers.has('preview')).toBe(true)
    expect(resolvers.size).toBe(5)
  })

  describe('prompt executor', () => {
    it('returns prompt from nodeData', () => {
      const executor = resolvers.get('prompt')!
      const result = executor({ prompt: 'hello world' }, {})
      expect(result).toEqual({ prompt: 'hello world' })
    })

    it('returns empty string when nodeData has no prompt', () => {
      const executor = resolvers.get('prompt')!
      const result = executor({}, {})
      expect(result).toEqual({ prompt: '' })
    })
  })

  describe('merge executor', () => {
    it('returns object with required fields', () => {
      const executor = resolvers.get('merge')!
      const result = executor(
        { blendMode: 'normal' },
        { 'input-0': { generatedImageId: 'img-1' } },
      )
      expect(result).toHaveProperty('mergedImageId')
      expect(result).toHaveProperty('blendMode')
      expect(result).toHaveProperty('sourceCount')
      expect(result).toHaveProperty('isStub', true)
    })

    it('counts input sources correctly', () => {
      const executor = resolvers.get('merge')!
      const result = executor(
        { blendMode: 'multiply' },
        {
          'input-0': { generatedImageId: 'img-1' },
          'input-1': { generatedImageId: 'img-2' },
          'input-2': { generatedImageId: 'img-3' },
        },
      )
      expect(result.sourceCount).toBe(3)
      expect(result.blendMode).toBe('multiply')
    })
  })

  describe('preview executor', () => {
    it('returns displayImageId from first input', () => {
      const executor = resolvers.get('preview')!
      const result = executor(
        {},
        { 'input-0': { generatedImageId: 'img-preview' } },
      )
      expect(result.displayImageId).toBe('img-preview')
      expect(result.isStub).toBe(true)
    })

    it('returns null displayImageId when no inputs provided', () => {
      const executor = resolvers.get('preview')!
      const result = executor({}, {})
      expect(result.displayImageId).toBeNull()
      expect(result.isStub).toBe(true)
    })

    it('falls back to displayImageId field if generatedImageId is missing', () => {
      const executor = resolvers.get('preview')!
      const result = executor(
        {},
        { 'input-0': { displayImageId: 'display-img' } },
      )
      expect(result.displayImageId).toBe('display-img')
    })
  })

  describe('text-to-image executor', () => {
    it('is an async function', () => {
      const executor = resolvers.get('text-to-image')!
      const result = executor({ prompt: 'test' }, {})
      expect(result).toBeInstanceOf(Promise)
    })
  })

  describe('style executor', () => {
    it('is an async function', () => {
      const executor = resolvers.get('style')!
      const result = executor({ prompt: 'test', style: 'anime' }, {})
      expect(result).toBeInstanceOf(Promise)
    })
  })
})
