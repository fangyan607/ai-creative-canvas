// ---------------------------------------------------------------------------
// Prompt Templates — Centralized TypeScript constant definitions (D-12)
// ---------------------------------------------------------------------------
// All prompt templates stored as TypeScript constants, indexed by
// (providerId, purpose) for easy lookup (D-14).
//
// Templates use Handlebars-compatible {{variable}} syntax (D-11).
// Variables come from four source categories (D-13):
//   1. System presets — built-in quality modifiers, role definitions
//   2. Global context — canvas metadata, timestamps, random seed
//   3. Upstream outputs — outputs from preceding nodes in the graph
//   4. Node parameters — fields from the current node's data
// ---------------------------------------------------------------------------

import type { PromptTemplate } from '../interfaces/types'

// ---------------------------------------------------------------------------
// System Preset type
// ---------------------------------------------------------------------------

export interface SystemPreset {
  type: string
  description: string
  content: string
}

// ---------------------------------------------------------------------------
// Template Registry (D-12, D-14)
// ---------------------------------------------------------------------------

const templateRegistry: PromptTemplate[] = [
  // ===== Mock Provider (D-15, D-16) =====
  {
    id: 'mock-text-to-image',
    providerId: 'mock',
    purpose: 'text-to-image',
    label: 'Mock Text to Image',
    template: '{{prompt}}',
    defaultVariables: {},
    description: 'Direct prompt pass-through for mock adapter',
  },

  // ===== OpenAI / DALL-E 3 =====
  {
    id: 'openai-text-to-image-detailed',
    providerId: 'openai',
    purpose: 'text-to-image',
    label: 'Detailed Scene Description',
    template: '{{systemPhotoRealistic}} {{prompt}}.'
      + '{{#if negativePrompt}} {{negativePrompt}}{{/if}}',
    defaultVariables: {
      prompt: '',
    },
    description: 'Photorealistic scene with optional negative prompt',
  },
  {
    id: 'openai-text-to-image-artistic',
    providerId: 'openai',
    purpose: 'text-to-image',
    label: 'Artistic / Creative',
    template: 'Create an artistic {{stylePreset}} illustration of {{prompt}}.'
      + '{{#if reference}} Reference: {{reference}}{{/if}}',
    defaultVariables: {
      prompt: '',
      stylePreset: 'digital-art',
    },
    description: 'Artistic illustration with style preset',
  },
  {
    id: 'openai-text-to-image-vivid',
    providerId: 'openai',
    purpose: 'text-to-image',
    label: 'Vivid / Dramatic',
    template: '{{systemVividLighting}} {{prompt}}.'
      + '{{#if mood}} Mood: {{mood}}{{/if}}',
    defaultVariables: {
      prompt: '',
      mood: 'dramatic',
    },
    description: 'Vivid colors with dramatic lighting and mood setting',
  },

  // ===== Stability.ai =====
  {
    id: 'stability-text-to-image-standard',
    providerId: 'stability',
    purpose: 'text-to-image',
    label: 'Standard',
    template: '{{prompt}}',
    defaultVariables: {
      prompt: '',
      cfgScale: 7,
      steps: 30,
    },
    description: 'Standard prompt with configurable CFG scale and steps',
  },
  {
    id: 'stability-text-to-image-style-transfer',
    providerId: 'stability',
    purpose: 'text-to-image',
    label: 'Style Transfer',
    template: '{{prompt}} in the style of {{stylePreset}}'
      + '{{#if upstreamGeneratedImageId}}, with reference image{{/if}}',
    defaultVariables: {
      prompt: '',
      stylePreset: 'anime',
    },
    description: 'Style transfer with optional reference image',
  },
  {
    id: 'stability-image-to-image',
    providerId: 'stability',
    purpose: 'image-to-image',
    label: 'Image-to-Image',
    template: '{{prompt}}, strength: {{strength}}',
    defaultVariables: {
      prompt: '',
      strength: 0.8,
    },
    description: 'Image-to-image generation with strength control',
  },
]

// ---------------------------------------------------------------------------
// Lookup Functions (D-14)
// ---------------------------------------------------------------------------

/**
 * Get a template by provider ID and purpose.
 * Returns the first matching template, or undefined if none found.
 */
export function getTemplate(
  providerId: string,
  purpose: string,
): PromptTemplate | undefined {
  return templateRegistry.find(
    (t) => t.providerId === providerId && t.purpose === purpose,
  )
}

/**
 * List all templates for a given provider.
 */
export function listTemplates(providerId: string): PromptTemplate[] {
  return templateRegistry.filter((t) => t.providerId === providerId)
}

/**
 * List all templates across all providers.
 */
export function listAllTemplates(): PromptTemplate[] {
  return [...templateRegistry]
}

/**
 * Get a template by its unique ID.
 */
export function getTemplateById(id: string): PromptTemplate | undefined {
  return templateRegistry.find((t) => t.id === id)
}

// ---------------------------------------------------------------------------
// System Presets — built-in variable definitions (D-13, category 1)
// ---------------------------------------------------------------------------
// These are injected as lowest-priority variables into TemplateContext.system.
// Each preset is a named string constant that can be referenced from templates
// via its variable name (e.g. {{systemPhotoRealistic}}).

export const systemPresets: Record<string, SystemPreset> = {
  systemPhotoRealistic: {
    type: 'system',
    description: 'Adds photorealistic quality modifiers',
    content: 'Photorealistic, ultra-detailed, 8K resolution, natural lighting',
  },
  systemVividLighting: {
    type: 'system',
    description: 'Adds dramatic vivid lighting',
    content: 'Vivid colors, dramatic lighting, cinematic atmosphere, high contrast',
  },
}
