// ---------------------------------------------------------------------------
// Template Engine — Tempura wrapper with context resolution
// ---------------------------------------------------------------------------
// Uses tempura (1.3KB gzip) for Handlebars-compatible template rendering.
// Supports: {{variable}}, {{{unescaped}}}, {{#if}}, {{#each}}, path resolution
//
// D-11: Handlebars-compatible {{variable}} syntax via tempura
// D-13: Four variable source categories resolved in priority order
// ---------------------------------------------------------------------------

import { compile } from 'tempura'

/**
 * The four categories of variables that can be injected into templates,
 * listed in order of increasing priority (system = lowest, params = highest).
 *
 * D-13: Variable sources resolved in this order:
 * 1. System presets — built-in role definitions, quality modifiers
 * 2. Global context — canvas metadata, timestamps, random seed
 * 3. Upstream outputs — outputs from preceding nodes in the graph
 * 4. Node parameters — fields from the current node's data
 */
export interface TemplateContext {
  /** System presets: quality modifiers, role definitions, negative prompt fragments */
  system?: Record<string, unknown>
  /** Global context: canvas metadata, project info, timestamps */
  global?: Record<string, unknown>
  /** Upstream node outputs keyed by output socket ID */
  upstream?: Record<string, unknown>
  /** Current node's parameters (prompt, width, height, seed, etc.) */
  params?: Record<string, unknown>
}

/**
 * Extract variable names from a template string for tempura's `props` option.
 * tempura needs to know variable names ahead of time to destructure them from
 * the data object. This function pre-scans the template for all top-level
 * variable references including those inside {{#if}} and {{#each}} blocks.
 */
function extractVariableNames(template: string): string[] {
  const names = new Set<string>()
  // Matches {{var}}, {{#if var}}, {{#each var}}, {{#elif var}}, {{#else}}
  // Captures the first identifier after the opening braces and optional #block
  const re = /{{\s*#?(?:if|each|elif|else)?\s*([a-zA-Z$_][\w$]*)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(template)) !== null) {
    const name = m[1]
    // Skip control-flow keywords that happen to match as identifiers
    if (!['if', 'each', 'else', 'elif', 'as', 'var', 'expect'].includes(name)) {
      names.add(name)
    }
  }
  return [...names]
}

/**
 * Render a template string with the given variables.
 * Uses tempura's compile() for Handlebars-compatible {{variable}} syntax.
 * Throws if the template has syntax errors.
 *
 * @param template - Handlebars-compatible template string
 * @param variables - Key-value pairs for template substitution
 * @returns Rendered string with all variables substituted
 */
export function renderTemplate(
  template: string,
  variables: Record<string, unknown>,
): string {
  const props = extractVariableNames(template)
  const render = compile(template, { props })
  return render(variables)
}

/**
 * Resolve variables from all four context sources (D-13).
 * System presets are lowest priority, node params are highest.
 * Later sources override earlier ones for the same key.
 *
 * Priority order: system < global < upstream < params
 *
 * @param context - Template context with up to four variable source categories
 * @returns Merged flat variables object
 */
export function resolveContext(context: TemplateContext): Record<string, unknown> {
  return {
    ...(context.system ?? {}),
    ...(context.global ?? {}),
    ...(context.upstream ?? {}),
    ...(context.params ?? {}),
  }
}

/**
 * Convenience function: resolve context from four sources, then render.
 *
 * @param template - Handlebars-compatible template string
 * @param context - Template context with four variable source categories
 * @returns Rendered string with all variables substituted
 */
export function renderPrompt(
  template: string,
  context: TemplateContext,
): string {
  const variables = resolveContext(context)
  return renderTemplate(template, variables)
}
