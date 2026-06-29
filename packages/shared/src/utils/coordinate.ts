export interface CoordinateResult {
  x: number
  y: number
}

export function canvasToNodeSpace(
  x: number,
  y: number,
  viewport: { x: number; y: number; zoom: number }
): CoordinateResult {
  throw new Error('Not implemented: Phase 2')
}

export function nodeToCanvasSpace(
  x: number,
  y: number,
  viewport: { x: number; y: number; zoom: number }
): CoordinateResult {
  throw new Error('Not implemented: Phase 2')
}
