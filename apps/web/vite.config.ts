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
      // shadcn/ui aliases (matches tsconfig paths)
      {
        find: /^@\/(.*)/,
        replacement: path.resolve(__dirname, 'src/$1'),
      },
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
      // @excalidraw/math subpath imports — npm package bundles everything
      // into a single index.js, so redirect subpaths to the main entry.
      {
        find: /^@excalidraw\/math\/ellipse$/,
        replacement: path.resolve(excalidrawDir, 'node_modules/@excalidraw/math'),
      },
      // @excalidraw/laser-pointer — transitive dep not hoisted to root
      {
        find: /^@excalidraw\/laser-pointer$/,
        replacement: path.resolve(excalidrawDir, 'node_modules/@excalidraw/laser-pointer'),
      },
    ],
  },
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
