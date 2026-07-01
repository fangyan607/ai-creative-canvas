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

// UI Components (Plan 02-04)
export { ConnectionLine } from './ConnectionLine'
export { FocusModeToggle } from './FocusModeToggle'
export type { FocusModeToggleProps, FocusMode } from './FocusModeToggle'
export { NodeEditorOverlay } from './NodeEditorOverlay'
export type { NodeEditorOverlayProps } from './NodeEditorOverlay'

// Property Panel
export { PropertyPanel } from './PropertyPanel'
export type { PropertyPanelProps } from './PropertyPanel'

// Template Dialog
export { TemplateDialog } from './TemplateDialog'
export type { TemplateDialogProps } from './TemplateDialog'

// Templates
export { TEMPLATES, applyTemplate } from './templates'
export type { Template } from './templates'
