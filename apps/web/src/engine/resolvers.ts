// ---------------------------------------------------------------------------
// Default Resolvers -- Stub executors for all node types.
//
// Phase 3: Synchronous stubs returning placeholder data.
// Phase 5: Replaced with real async AI provider executors.
//
// Per D-01: Sync-first. Each executor returns ExecutorOutput directly
// (not a Promise) for Phase 3. The `Executor` type accepts both sync
// and async returns to maintain the Phase 5 contract.
// ---------------------------------------------------------------------------

import type { NodeType } from '@ac-canvas/shared'
import type { Executor, ExecutorResolver, ExecutorOutput } from './types'

/**
 * Create default stub resolvers for all node types.
 * Each executor returns placeholder data appropriate to the node type.
 * Group nodes have no executor (they pass through, meaning they're skipped
 * by the engine's layer execution logic).
 */
export function createDefaultResolvers(): ExecutorResolver {
  const resolvers: ExecutorResolver = new Map()

  resolvers.set('prompt', ((nodeData, _inputs) => {
    // Prompt node: passes through its prompt text as output
    return { prompt: (nodeData as any).prompt ?? '' }
  }) as Executor)

  resolvers.set('text-to-image', ((nodeData, inputs) => {
    // Stub: returns placeholder image metadata
    return {
      generatedImageId: 'stub-image-' + crypto.randomUUID().slice(0, 8),
      width: (nodeData as any).width ?? 1024,
      height: (nodeData as any).height ?? 1024,
      isStub: true,
    }
  }) as Executor)

  resolvers.set('style', ((nodeData, inputs) => {
    // Stub: passes through input info, records style preset
    return {
      styledImageId: 'stub-styled-' + crypto.randomUUID().slice(0, 8),
      stylePreset: (nodeData as any).stylePreset ?? 'none',
      isStub: true,
    }
  }) as Executor)

  resolvers.set('merge', ((nodeData, inputs) => {
    // Stub: combines input references
    return {
      mergedImageId: 'stub-merged-' + crypto.randomUUID().slice(0, 8),
      blendMode: (nodeData as any).blendMode ?? 'normal',
      sourceCount: Object.keys(inputs).length,
      isStub: true,
    }
  }) as Executor)

  resolvers.set('preview', ((nodeData, inputs) => {
    // Stub: picks the first input's generatedImageId
    const firstInput = Object.values(inputs)[0] as Record<string, unknown> | undefined
    return {
      displayImageId: firstInput?.generatedImageId as string ?? firstInput?.displayImageId as string ?? null,
      isStub: true,
    }
  }) as Executor)

  return resolvers
}
