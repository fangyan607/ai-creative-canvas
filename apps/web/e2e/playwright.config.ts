import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './specs',
  timeout: 30000,
  retries: 0,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    baseURL: 'http://localhost:5173',
    actionTimeout: 10000,
  },
  // Only Chromium — per D-04
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  // Do not run in CI — per D-08. No CI reporter needed.
  // Local-only: output HTML report for debugging
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }]],
})
