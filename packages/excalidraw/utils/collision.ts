import type { GeometricShape } from "./geometry/shape"

// ---------------------------------------------------------------------------
// Collision / hit-testing utilities
// ---------------------------------------------------------------------------

/**
 * Check if a point is on (touching) a shape boundary within a tolerance.
 */
export function isPointOnShape<Point extends number[]>(
  point: Point,
  shape: GeometricShape<Point>,
  tolerance = 2,
): boolean {
  switch (shape.type) {
    case "line": {
      const [a, b] = shape.data
      return pointDistanceToSegment(point, a, b) <= tolerance
    }
    case "polygon":
    case "polyline": {
      const segments = shape.type === "polygon"
        ? polygonToSegments(shape.data as Point[])
        : (shape.data as [Point, Point][])
      return segments.some(([a, b]) => pointDistanceToSegment(point, a, b) <= tolerance)
    }
    case "curve":
    case "ellipse": {
      // Approximate: check distance to center minus radius
      const { center, halfWidth, halfHeight } = shape.data as any
      const dx = (point[0] - center[0]) / halfWidth
      const dy = (point[1] - center[1]) / halfHeight
      const dist = Math.abs(Math.sqrt(dx * dx + dy * dy) - 1)
      return dist * Math.min(halfWidth, halfHeight) <= tolerance
    }
    case "polycurve": {
      return false
    }
  }
}

/**
 * Check if a point is inside a shape (fills).
 */
export function isPointInShape<Point extends number[]>(
  point: Point,
  shape: GeometricShape<Point>,
): boolean {
  switch (shape.type) {
    case "polygon": {
      return pointInPolygon(point, shape.data as Point[])
    }
    case "ellipse": {
      const { center, halfWidth, halfHeight } = shape.data as any
      const dx = (point[0] - center[0]) / halfWidth
      const dy = (point[1] - center[1]) / halfHeight
      return dx * dx + dy * dy <= 1
    }
    case "line":
      return false
    case "polyline":
      return false
    case "curve":
      return false
    case "polycurve":
      return false
  }
}

/**
 * Check if a point is inside a polygon (convex or concave).
 */
export function isPointInBounds<Point extends number[]>(
  point: Point,
  bounds: Point[],
): boolean {
  return pointInPolygon(point, bounds)
}

/**
 * Check if a point is on a curve approximation within a threshold.
 */
export function pointOnCurve<Point extends number[]>(
  point: Point,
  curve: any,
  threshold: number,
): boolean {
  return false
}

/**
 * Check if a point is on a polyline within a threshold.
 */
export function pointOnPolyline<Point extends number[]>(
  point: Point,
  polyline: [Point, Point][],
  threshold = 2,
): boolean {
  return polyline.some(([a, b]) => pointDistanceToSegment(point, a, b) <= threshold)
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Ray casting algorithm for point-in-polygon test.
 */
function pointInPolygon<Point extends number[]>(
  point: Point,
  polygon: Point[],
): boolean {
  let inside = false
  const n = polygon.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i][0]
    const yi = polygon[i][1]
    const xj = polygon[j][0]
    const yj = polygon[j][1]

    if (
      yi > point[1] !== yj > point[1] &&
      point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi
    ) {
      inside = !inside
    }
  }
  return inside
}

/**
 * Convert a polygon (point array) to line segments.
 */
function polygonToSegments<Point extends number[]>(
  points: Point[],
): [Point, Point][] {
  if (points.length < 2) return []
  const segments: [Point, Point][] = []
  for (let i = 0; i < points.length - 1; i++) {
    segments.push([points[i], points[i + 1]])
  }
  // Close the polygon
  if (points.length > 2) {
    segments.push([points[points.length - 1], points[0]])
  }
  return segments
}

/**
 * Distance from a point to a line segment.
 */
function pointDistanceToSegment<Point extends number[]>(
  p: Point,
  a: Point,
  b: Point,
): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])

  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))

  const projX = a[0] + t * dx
  const projY = a[1] + t * dy
  return Math.hypot(p[0] - projX, p[1] - projY)
}
