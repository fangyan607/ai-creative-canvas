---
phase: 04-ai-adapters
plan: 06
type: execute
wave: 2
subsystem: ai-core
tags: ["prompt-templates", "template-engine", "tempura", "handlebars"]
requires: []
provides:
  - Tempura-based template rendering engine (1.3KB gzip)
  - Handlebars-compatible {{variable}} syntax: conditionals, loops, escaped/unescaped
  - Context resolution with 4-source priority merging (system < global < upstream < params)
  - 7 centralized prompt templates across mock, openai, stability providers
  - Template lookup by providerId + purpose, id, or listing all
  - System presets for quality modifiers and role definitions
affects:
  - Phase 04 Plan 05 (providerStore config)
  - Phase 5 (AI Execution Infrastructure — bridge will use template engine to construct prompts)
tech-stack:
  added:
    - tempura ^0.4.1 (lightweight Handlebars-compatible template engine, 1.3KB gzip)
  patterns:
    - Template rendering via tempura compile() with variable name extraction
    - 4-source priority merge (system < global < upstream < params)
    - Centralized TypeScript constant template definitions (D-12)
    - Template lookup by (providerId, purpose) composite key (D-14)
key-files:
  created:
    - packages/ai-core/src/prompt/templateEngine.ts — Tempura wrapper with resolveContext
    - packages/ai-core/src/prompt/templateEngine.test.ts — 16 unit tests for template rendering
    - packages/ai-core/src/prompt/templates.ts — 7 centralized template definitions + 4 lookup functions + 2 system presets
  modified: []
decisions:
  - "tempura chosen over full Handlebars (82KB): tempura is 1.3KB gzip with same {{variable}} syntax"
  - "tempura requires props option for variable destructuring — extractVariableNames() pre-scans templates"
  - "tempura {{#each}} uses 'as item' syntax (not bare {{.}}), reflected in template definitions"
  - "tempura HTML escaping is minimal (only &, \", <) — < becomes &lt without semicolon"
metrics:
  duration: 15 minutes
  tests: 16 (1 suite, all passing)
  commits: 4
completed_date: 2026-07-01
requirements-completed: [AI-06]
---

# Phase 04 Plan 06: Prompt Template System

**Tempura-wrapped Handlebars-compatible template engine with 4-source context resolution priority and 7 centralized TypeScript template definitions across mock, OpenAI/DALL-E 3, and Stability.ai providers.**

## Performance

- **Duration:** 15 minutes
- **Started:** 2026-07-01T11:10:00Z
- **Completed:** 2026-07-01T11:18:30Z
- **Tasks:** 2 (1 TDD, 1 auto)
- **Files created:** 3

## Accomplishments

- Template engine wraps tempura's `compile()` with automatic variable name extraction (props option) supporting all Handlebars-compatible syntax: `{{var}}`, `{{{unescaped}}}`, `{{#if}}`, `{{#each as item}}`, path resolution (`{{a.b}}`)
- Context resolver merges 4 variable source categories in correct priority order per D-13: system < global < upstream < params
- 7 prompt templates defined across 3 providers: 1 mock, 3 OpenAI (detailed, artistic, vivid), 3 Stability (standard, style transfer, image-to-image)
- 4 lookup functions exported: `getTemplate(providerId, purpose)`, `listTemplates(providerId)`, `listAllTemplates()`, `getTemplateById(id)`
- 2 system presets (`systemPhotoRealistic`, `systemVividLighting`) for built-in quality modifiers

## Task Commits

Each task was committed atomically:

| Task | Name | Commit | Type |
|------|------|--------|------|
| (context) | Sync phase 4 context and ai-core from master | `9cff46c` | chore |
| 1 (TDD RED) | Add failing test for template engine | `625e975` | test |
| 1 (TDD GREEN) | Implement template engine with tempura wrapper | `332a0f7` | feat |
| 2 | Create centralized prompt template definitions | `a3a4f83` | feat |

## Files Created

- `packages/ai-core/src/prompt/templateEngine.ts` — `renderTemplate()`, `resolveContext()`, `renderPrompt()`, `TemplateContext` type, `extractVariableNames()` helper
- `packages/ai-core/src/prompt/templateEngine.test.ts` — 16 tests covering simple variables, multiple variables, `{{#if}}` conditionals (true/false/comparison), `{{#each}}` iteration, `{{{unescaped}}}` raw output, HTML escaping, path resolution, syntax errors, context resolution priority
- `packages/ai-core/src/prompt/templates.ts` — 7 template definitions, `getTemplate()`, `listTemplates()`, `listAllTemplates()`, `getTemplateById()`, `systemPresets`, `SystemPreset` interface

## Decisions Made

- **tempura over full Handlebars:** tempura at 1.3KB gzip vs 82KB for Handlebars, with the same `{{variable}}` syntax coverage. The only syntax differences: `{{#each}}` requires `as item` form, and HTML escaping is minimal (`&`, `"`, `<` only).
- **Auto-extract props:** tempura requires variable names to be listed in the `props` compile option for block access. `extractVariableNames()` pre-scans templates to auto-populate this.
- **Flat variable merge:** `resolveContext()` merges the four sources via object spread (not deep merge) per D-13 priority order, since template variables are simple key-value pairs.

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all template definitions are complete with real template strings and default variables.

## Threat Surface Scan

No new threat surface beyond what the plan documented:
- **T-04-06-01 (Spoofing - Template injection):** Mitigated by tempura's built-in HTML escaping for `{{variable}}` syntax; raw output requires explicit `{{{triple}}}` braces
- **T-04-06-02 (Tampering - Syntax errors):** Mitigated by tempura's `compile()` throwing on unknown blocks and unterminated blocks; caller handles error

## Verification

- **All 16 tests pass:** `npx vitest run src/prompt/templateEngine.test.ts` -- 16/16 passed
- **Full test suite passes:** `npx vitest run` -- 89/89 tests across 5 test files
- **TypeScript compilation:** Clean (no errors in any new files; pre-existing errors in test files referencing vitest globals unrelated to this plan)

## Self-Check: PASSED

- [x] `packages/ai-core/src/prompt/templateEngine.ts` -- exists, exports `renderTemplate`, `resolveContext`, `renderPrompt`, `TemplateContext`
- [x] `packages/ai-core/src/prompt/templateEngine.test.ts` -- exists, 16 tests all passing
- [x] `packages/ai-core/src/prompt/templates.ts` -- exists, exports `getTemplate`, `listTemplates`, `listAllTemplates`, `getTemplateById`, `systemPresets`
- [x] All 3 commits confirmed in git history: `625e975`, `332a0f7`, `a3a4f83`
- [x] 7 templates across mock (1), openai (3), stability (3)
- [x] 2 system presets defined

## Next Phase Readiness

- Template engine ready for Phase 5 (AI Execution Infrastructure) where the bridge will use `renderPrompt()` to construct prompts before calling adapter `execute()`
- Prompt templates ready for Phase 7 (Application UI) where a visual template editor can be built on top

---

*Phase: 04-ai-adapters*
*Plan: 06*
*Completed: 2026-07-01*
