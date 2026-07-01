// ---------------------------------------------------------------------------
// @ac-canvas/ai-core — Public API
// ---------------------------------------------------------------------------
// Export only what was created in Plan 04-01 (foundational exports).
// Plans 02-06 do NOT modify this file — consumers import their respective
// modules via the subpath exports defined in package.json.
// ---------------------------------------------------------------------------

export { AiAdapter } from './interfaces/AiAdapter'
export type {
  AdapterResult,
  ConnectionResult,
  ConfigField,
  ModelDescriptor,
  ProviderConfig,
  PromptTemplate,
} from './interfaces/types'
export { AiAdapterError } from './interfaces/types'
export { AdapterRegistry } from './registry'
