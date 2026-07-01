// ---------------------------------------------------------------------------
// AI Bridge — Produces Executor functions that call real AI adapters
//
// Factory function createAiExecutor() wraps the adapter lifecycle:
//   1. Query AdapterRegistry for the provider's adapter constructor
//   2. Read API config from ProviderStore (decrypts API key)
//   3. Build prompt via TemplateEngine from node data + upstream inputs
//   4. Instantiate the adapter with config
//   5. Wire EventEmitter progress/error/done to EngineStore
//   6. Create onStoreImage callback via ImageBlobStore
//   7. Execute adapter.execute() and return mapped ExecutorOutput
//   8. Clean up EventEmitter listeners (finally block — Pitfall 1 mitigation)
// ---------------------------------------------------------------------------

import { AdapterRegistry } from '@ac-canvas/ai-core'
import type { AiAdapter } from '@ac-canvas/ai-core'
import { renderPrompt, resolveContext } from '@ac-canvas/ai-core/prompt/templateEngine'
import type { ProviderStore } from '@ac-canvas/ai-core/config/providerStore'
import { imageBlobStore } from '../indexedb/imageStore'
import { useEngineStore } from '../stores/engineStore'
import { useNodeGraphStore } from '../stores/nodeGraphStore'
import type { Executor, ExecutorOutput } from './types'

export interface BridgeDependencies {
  providerStore: ProviderStore
}

/**
 * Factory: creates an Executor function for the given provider that wraps
 * the full AI adapter lifecycle.
 *
 * @param providerId - AI provider identifier (e.g., 'openai', 'stability', 'mock')
 * @param deps - Bridge dependencies (ProviderStore, etc.)
 * @returns An Executor function matching the existing types.ts contract
 */
export function createAiExecutor(
  providerId: string,
  deps: BridgeDependencies,
): Executor {
  const { providerStore } = deps

  return async (nodeData, inputs): Promise<ExecutorOutput> => {
    const nodeId = (nodeData as any).__nodeId as string | undefined
    const registry = AdapterRegistry.getInstance()

    // Step 1: Find adapter constructor
    const AdapterClass = registry.get(providerId)
    if (!AdapterClass) {
      throw new Error(`No adapter registered for provider: ${providerId}`)
    }

    // Step 2: Read API config from ProviderStore (Phase 4 BYOK)
    const apiKey = await providerStore.getApiKey(providerId)
    // Read defaultBaseUrl from a minimal instance (same pattern as registry.ts
    // register() and getAllProviders() which both use no-arg construction).
    const defaultBaseUrl = new AdapterClass({}).defaultBaseUrl
    const baseUrl = await providerStore.getBaseUrl(providerId, defaultBaseUrl)

    // Step 3: Build prompt via TemplateEngine
    const nodeGraph = useNodeGraphStore.getState()
    const textToImageData = nodeData as Record<string, unknown>
    const rawPrompt = (textToImageData.prompt as string) ?? ''
    // If node has a template reference, build prompt; otherwise use raw prompt
    let finalPrompt = rawPrompt
    if (textToImageData.templateId) {
      // Template-based prompt (Phase 4 TemplateEngine integration)
      const resolved = resolveContext({
        params: nodeData,
        upstream: inputs,
      })
      finalPrompt = renderPrompt(rawPrompt, {
        params: resolved,
        upstream: resolved, // merged for backward compat
      })
    }

    // Step 4: Instantiate adapter
    const adapter: AiAdapter = new AdapterClass({
      apiKey,
      baseUrl,
    }) as AiAdapter

    try {
      // Step 5: Wire progress events -> EngineStore
      const adapterNodeId = nodeId ?? crypto.randomUUID()
      adapter.on('progress', (data: { percent: number; stage: string }) => {
        useEngineStore.getState().setNodeStatus(adapterNodeId, 'executing')
        // Stage info could be stored for tooltip display (Claude's Discretion)
      })
      adapter.on('error', (data: { code: string; message: string }) => {
        useEngineStore.getState().setNodeStatus(adapterNodeId, 'error')
        useEngineStore.getState().setNodeError(adapterNodeId, data.message)
      })

      // Step 6: onStoreImage callback via ImageBlobStore
      const onStoreImage = async (blob: Blob): Promise<string> => {
        return imageBlobStore.store(blob)
      }

      // Step 7: Execute adapter
      const result = await adapter.execute(nodeData, inputs, onStoreImage)

      // Step 8: Map AdapterResult to ExecutorOutput
      const output: ExecutorOutput = {
        imageBlobId: result.imageBlobId,
        width: result.width,
        height: result.height,
        seed: result.seed,
        model: result.model,
        timing: result.timing,
        isStub: false,
      }

      // For style node, add the stylePreset to output
      if ((nodeData as any).nodeType === 'style') {
        output.stylePreset = (nodeData as any).stylePreset ?? 'none'
      }

      return output
    } finally {
      // Step 9: Clean up all EventEmitter listeners (Pitfall 1 mitigation)
      adapter.removeAllListeners()
    }
  }
}

/**
 * Map providerId from node data.
 * Priority: 1. nodeData.model (if contains provider prefix like 'dall-e-3' -> 'openai')
 *            2. Default lookup based on node type (text-to-image -> 'openai', style -> 'stability')
 *
 * @param nodeData - The node's data field
 * @param nodeType - The node's type
 * @returns The providerId to use for this node
 */
export function resolveProviderId(
  nodeData: Record<string, unknown>,
  nodeType: string,
): string {
  const model = (nodeData.model as string) ?? ''
  // Map model names to provider IDs
  if (model.includes('dall-e')) return 'openai'
  if (model.includes('stable-diffusion')) return 'stability'
  // Default by node type
  if (nodeType === 'style') return 'stability'
  return 'openai' // default for text-to-image
}
