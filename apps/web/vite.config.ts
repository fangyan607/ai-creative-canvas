import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite 8 with Rolldown bundler
// See: https://vite.dev/blog/announcing-vite8
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // TailwindCSS v4 Vite plugin
  ],
  server: {
    port: 5173,
    open: true,
  },
  // Vitest configuration (inline, inherits Vite config)
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
