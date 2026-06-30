// ---------------------------------------------------------------------------
// Viewport Coordinate Transforms
//
// Excalidraw canvas space and React Flow node space share the same absolute
// coordinate system. A node placed at position (100, 200) in React Flow
// appears at the same canvas position as an Excalidraw element at (100, 200).
//
// These functions accept a viewport parameter for forward compatibility:
// - Future phases may add zoom-level adjustments (Pitfall 12 mitigation, D-29)
// - The zoom parameter is validated (> 0) to prevent division-by-zero in any
//   future coordinate normalization logic
//
// Current behavior: pass-through (identity transform).
// ---------------------------------------------------------------------------

export interface CoordinateResult {
  x: number
  y: number
}

/**
 * Convert an Excalidraw canvas-space coordinate to React Flow node space.
 *
 * Both coordinate systems are identical (absolute canvas coordinates), so
 * this is an identity transform. The viewport parameter is accepted for
 * forward compatibility and input validation.
 *
 * @throws {Error} If viewport.zoom <= 0
 */
export function canvasToNodeSpace(
  x: number,
  y: number,
  viewport: { x: number; y: number; zoom: number }
): CoordinateResult {
  if (viewport.zoom <= 0) {
    throw new Error('Invalid viewport zoom: must be positive')
  }
  return { x, y }
}

/**
 * Convert a React Flow node-space coordinate to Excalidraw canvas space.
 *
 * Inverse of canvasToNodeSpace. Currently an identity transform since both
 * systems share the same absolute coordinate space.
 *
 * @throws {Error} If viewport.zoom <= 0
 */
export function nodeToCanvasSpace(
  x: number,
  y: number,
  viewport: { x: number; y: number; zoom: number }
): CoordinateResult {
  if (viewport.zoom <= 0) {
    throw new Error('Invalid viewport zoom: must be positive')
  }
  return { x, y }
}
