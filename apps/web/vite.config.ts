import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const excalidrawDir = path.resolve(__dirname, '../../packages/excalidraw')

// Vite 8 with Rolldown bundler
// See: https://vite.dev/blog/announcing-vite8
export default defineConfig({
  resolve: {
    alias: [
      // Resolve @excalidraw/* to local vendored source/overrides instead of
      // broken npm packages. The vendored Excalidraw fork imports from
      // @excalidraw/utils/* and @excalidraw/math/*, but the npm-published
      // packages are incomplete (missing geometry/shape, collision exports).
      {
        find: /^@excalidraw\/utils\/geometry\/shape$/,
        replacement: path.resolve(excalidrawDir, 'utils/geometry/shape.ts'),
      },
      {
        find: /^@excalidraw\/utils\/collision$/,
        replacement: path.resolve(excalidrawDir, 'utils/collision.ts'),
      },
      {
        find: /^@excalidraw\/utils\/bbox$/,
        replacement: path.resolve(excalidrawDir, 'utils/bbox.ts'),
      },
      {
        find: /^@excalidraw\/utils\/export$/,
        replacement: path.resolve(excalidrawDir, 'utils/export.ts'),
      },
      {
        find: /^@excalidraw\/utils\/withinBounds$/,
        replacement: path.resolve(excalidrawDir, 'utils/withinBounds.ts'),
      },
      {
        find: /^@excalidraw\/utils$/,
        replacement: path.resolve(excalidrawDir, 'utils/index.ts'),
      },
      // @ path alias for shadcn/ui
      {
        find: '@',
        replacement: path.resolve(__dirname, 'src'),
      },
      // @excalidraw/math works from the installed npm package
    ],
  },
  plugins: [
    react(),
    tailwindcss(), // TailwindCSS v4 Vite plugin
  ],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  // Vitest configuration (inline, inherits Vite config)
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
