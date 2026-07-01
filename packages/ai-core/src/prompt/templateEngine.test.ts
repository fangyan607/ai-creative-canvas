import { describe, it, expect } from 'vitest'
import { renderTemplate, resolveContext, renderPrompt } from './templateEngine'

// ---------------------------------------------------------------------------
// renderTemplate — Tempura wrapper that compiles + renders template strings
// ---------------------------------------------------------------------------
describe('renderTemplate', () => {
  it('substitutes simple variables', () => {
    const result = renderTemplate('Hello {{name}}', { name: 'World' })
    expect(result).toBe('Hello World')
  })

  it('substitutes multiple variables', () => {
    const result = renderTemplate('{{a}} + {{b}} = {{sum}}', { a: 1, b: 2, sum: 3 })
    expect(result).toBe('1 + 2 = 3')
  })

  it('handles {{#if}} conditional (true)', () => {
    const result = renderTemplate('{{#if show}}visible{{/if}}', { show: true })
    expect(result).toBe('visible')
  })

  it('handles {{#if}} conditional (false)', () => {
    const result = renderTemplate('{{#if show}}visible{{/if}}', { show: false })
    expect(result).toBe('')
  })

  it('handles {{#if}} conditional with comparison', () => {
    const result = renderTemplate(
      '{{#if style !== "none"}}styled{{#else}}no style{{/if}}',
      { style: 'oil-painting' },
    )
    expect(result).toBe('styled')
  })

  it('handles {{#each}} iteration', () => {
    const result = renderTemplate(
      '{{#each items as item}}{{item}}{{/each}}',
      { items: ['A', 'B', 'C'] },
    )
    expect(result).toBe('ABC')
  })

  it('handles {{{unescaped}}} raw output', () => {
    const result = renderTemplate('{{{content}}}', { content: '<b>bold</b>' })
    expect(result).toBe('<b>bold</b>')
  })

  it('HTML-escapes {{double}} braces by default', () => {
    const result = renderTemplate('{{content}}', { content: '<b>bold</b>' })
    // tempura's esc() escapes &, " and < (not >); < becomes &lt (no semicolon)
    expect(result).toBe('&ltb>bold&lt/b>')
  })

  it('supports variable path resolution: {{a.b}}', () => {
    const result = renderTemplate('{{person.name}} is {{person.age}}', {
      person: { name: 'Alice', age: 30 },
    })
    expect(result).toBe('Alice is 30')
  })

  it('throws on syntax errors', () => {
    // tempura throws on unknown block actions
    expect(() => renderTemplate('{{#unknown}}content{{/unknown}}', {})).toThrow()
  })
})

// ---------------------------------------------------------------------------
// resolveContext — Merge four variable source categories with priority
// ---------------------------------------------------------------------------
describe('resolveContext', () => {
  it('merges all four sources with correct priority', () => {
    const result = resolveContext({
      system: { quality: 'high', role: 'assistant' },
      global: { seed: 42, timestamp: '2026-01-01' },
      upstream: { generatedImageId: 'img-123' },
      params: { prompt: 'A cat', width: 1024, height: 1024 },
    })
    expect(result.quality).toBe('high')
    expect(result.seed).toBe(42)
    expect(result.generatedImageId).toBe('img-123')
    expect(result.prompt).toBe('A cat')
  })

  it('params override upstream for same key', () => {
    const result = resolveContext({
      upstream: { prompt: 'upstream prompt' },
      params: { prompt: 'node prompt' },
    })
    expect(result.prompt).toBe('node prompt')
  })

  it('upstream overrides global for same key', () => {
    const result = resolveContext({
      global: { seed: 42 },
      upstream: { seed: 99 },
    })
    expect(result.seed).toBe(99)
  })

  it('handles missing sources gracefully', () => {
    const result = resolveContext({
      params: { prompt: 'test' },
    })
    expect(result.prompt).toBe('test')
  })

  it('returns empty object for empty context', () => {
    const result = resolveContext({})
    expect(result).toEqual({})
  })
})

// ---------------------------------------------------------------------------
// renderPrompt — Convenience function
// ---------------------------------------------------------------------------
describe('renderPrompt', () => {
  it('resolves context then renders template', () => {
    const result = renderPrompt('Create {{subject}} in {{style}} style', {
      params: { subject: 'a landscape' },
      global: { style: 'oil-painting' },
    })
    expect(result).toBe('Create a landscape in oil-painting style')
  })
})
