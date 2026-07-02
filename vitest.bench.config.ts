import { defineConfig } from 'vitest/config'

// Dedicated vitest bench configuration.
// Non-workspace mode — runs vitest bench directly across the monorepo,
// picking up .perf.ts, .bench.ts, and .benchmark.ts files.
export default defineConfig({
  test: {
    include: [],
    benchmark: {
      include: ['**/*.{bench,benchmark,perf}.?(c|m)[jt]s?(x)'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.claude/**',
        '**/coverage/**',
        '**/.{idea,git,cache,output,temp}/**',
      ],
    },
  },
})
