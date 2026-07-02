import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  // apps/web uses inline test config from vite.config.ts (jsdom, globals, setupFiles)
  'apps/web/vite.config.ts',
  // apps/backend uses own vitest.config.ts (globals, node environment)
  'apps/backend/vitest.config.ts',
  // packages/ai-core uses own vitest.config.ts (jsdom, globals)
  'packages/ai-core/vitest.config.ts',
  // packages/node-editor gets its own vitest.config.ts (created in Task 2)
  'packages/node-editor/vitest.config.ts',
])
