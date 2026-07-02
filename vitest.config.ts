import { defineConfig } from 'vitest/config'

// Root-level vitest configuration with explicit project definitions.
// Using `test.projects` (vitest v4 API) to define workspace members,
// preventing auto-discovery of all pnpm workspace members including
// packages/excalidraw (vendored fork with 80+ own tests).
export default defineConfig({
  test: {
    // Root project excludes — no tests run at root level directly
    include: [],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.claude/**',
      '**/coverage/**',
      '**/.{idea,git,cache,output,temp}/**',
    ],
    projects: [
      // apps/web uses inline test config from vite.config.ts (jsdom, globals, setupFiles)
      'apps/web/vite.config.ts',
      // apps/backend uses own vitest.config.ts (globals, node environment)
      'apps/backend/vitest.config.ts',
      // packages/ai-core uses own vitest.config.ts (jsdom, globals)
      'packages/ai-core/vitest.config.ts',
      // packages/node-editor uses own vitest.config.ts (jsdom, globals)
      'packages/node-editor/vitest.config.ts',
    ],
  },
})
