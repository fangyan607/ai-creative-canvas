// ---------------------------------------------------------------------------
// @ac-canvas/node-editor — barrel exports
// ---------------------------------------------------------------------------

// Base node framework
export { BaseNode } from './nodes/BaseNode'
export type { BaseNodeProps } from './nodes/BaseNode'

// Concrete node components
export { PromptNode } from './nodes/PromptNode'
export { TextToImageNode } from './nodes/TextToImageNode'
export { StyleNode } from './nodes/StyleNode'
export { MergeNode } from './nodes/MergeNode'
export { PreviewNode } from './nodes/PreviewNode'

// Connection validation
export {
  validateConnection,
  wouldCreateCycle,
  isConnectionValid,
} from './ConnectionValidator'
export type { ConnectionValidationResult } from './ConnectionValidator'

// Icon resolver utility
export { getNodeIcon } from './nodes/BaseNode'
