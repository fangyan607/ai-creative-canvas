import { describe, bench } from 'vitest'

/**
 * Canvas Rendering Performance Benchmarks
 *
 * Measures chunk rendering performance with 500+ elements.
 * The canvas is divided into 2000x2000px chunks. Each element
 * is assigned to one or more chunks based on its bounding box.
 *
 * Operations measured:
 * - Chunk assignment: distributing 500+ elements into chunks
 * - Visible chunk computation: determining which chunks are in viewport
 * - Element bounding box extraction (common canvas operation)
 *
 * Run: pnpm test:perf
 * Excluded from unit test runs via .perf.ts suffix.
 */

// ── Types matching the Excalidraw element model ──

interface BoundingBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

interface CanvasElement {
  id: string
  x: number
  y: number
  width: number
  height: number
  type: string
}

// ── Chunk System Simulation ──
// Chunk size: 2000x2000px (matching Phase 1 chunk rendering implementation)

const CHUNK_SIZE = 2000

function getChunkKey(element: CanvasElement): string {
  const chunkX = Math.floor(element.x / CHUNK_SIZE)
  const chunkY = Math.floor(element.y / CHUNK_SIZE)
  return `${chunkX}:${chunkY}`
}

function assignElementsToChunks(elements: CanvasElement[]): Map<string, CanvasElement[]> {
  const chunks = new Map<string, CanvasElement[]>()
  for (const el of elements) {
    const key = getChunkKey(el)
    if (!chunks.has(key)) chunks.set(key, [])
    chunks.get(key)!.push(el)
  }
  return chunks
}

function computeBoundingBox(elements: CanvasElement[]): BoundingBox {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const el of elements) {
    minX = Math.min(minX, el.x)
    minY = Math.min(minY, el.y)
    maxX = Math.max(maxX, el.x + el.width)
    maxY = Math.max(maxY, el.y + el.height)
  }
  return { minX, minY, maxX, maxY }
}

function getVisibleChunks(
  viewportX: number,
  viewportY: number,
  viewportWidth: number,
  viewportHeight: number,
): string[] {
  const visible: string[] = []
  const startChunkX = Math.floor(viewportX / CHUNK_SIZE)
  const startChunkY = Math.floor(viewportY / CHUNK_SIZE)
  const endChunkX = Math.floor((viewportX + viewportWidth) / CHUNK_SIZE)
  const endChunkY = Math.floor((viewportY + viewportHeight) / CHUNK_SIZE)

  for (let cx = startChunkX; cx <= endChunkX; cx++) {
    for (let cy = startChunkY; cy <= endChunkY; cy++) {
      visible.push(`${cx}:${cy}`)
    }
  }
  return visible
}

// ── Test Data: 500+ elements spread across canvas ──

function generateElements(count: number, spreadPx: number): CanvasElement[] {
  const elements: CanvasElement[] = []
  const types = ['rectangle', 'ellipse', 'diamond', 'text', 'image']
  for (let i = 0; i < count; i++) {
    elements.push({
      id: `el-${i}`,
      x: Math.random() * spreadPx,
      y: Math.random() * spreadPx,
      width: 50 + Math.random() * 200,
      height: 50 + Math.random() * 200,
      type: types[Math.floor(Math.random() * types.length)],
    })
  }
  return elements
}

// 500 elements spread across a 10000x10000 canvas area
// (5x5 = 25 chunks with ~20 elements each)
const ELEMENTS_500 = generateElements(500, 10000)
// 1000 elements spread wider for stress test
const ELEMENTS_1000 = generateElements(1000, 20000)

// ── Benchmarks ──

describe('Canvas chunk assignment - 500 elements', () => {
  bench('assign 500 elements to chunks', () => {
    assignElementsToChunks(ELEMENTS_500)
  })

  bench('compute bounding box of 500 elements', () => {
    computeBoundingBox(ELEMENTS_500)
  })
})

describe('Canvas chunk assignment - 1000 elements', () => {
  bench('assign 1000 elements to chunks', () => {
    assignElementsToChunks(ELEMENTS_1000)
  })

  bench('compute bounding box of 1000 elements', () => {
    computeBoundingBox(ELEMENTS_1000)
  })
})

describe('Visible chunk computation', () => {
  // Simulate a 1920x1080 viewport scrolled to various positions
  const viewports = [
    { x: 0, y: 0, w: 1920, h: 1080 },
    { x: 3000, y: 2000, w: 1920, h: 1080 },
    { x: 8000, y: 5000, w: 1920, h: 1080 },
  ]

  bench('compute visible chunks at viewport (0,0)', () => {
    getVisibleChunks(viewports[0].x, viewports[0].y, viewports[0].w, viewports[0].h)
  })

  bench('compute visible chunks at viewport (3000,2000)', () => {
    getVisibleChunks(viewports[1].x, viewports[1].y, viewports[1].w, viewports[1].h)
  })

  bench('compute visible chunks at viewport (8000,5000)', () => {
    getVisibleChunks(viewports[2].x, viewports[2].y, viewports[2].w, viewports[2].h)
  })
})
