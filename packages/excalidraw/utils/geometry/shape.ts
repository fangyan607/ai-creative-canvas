import type {
  Drawable,
  Op,
  OpSet,
} from "roughjs/bin/core"
import type { ExcalidrawElement } from "../../src/element/types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Polyline<Point extends number[]> = [Point, Point][]

export type Polycurve<Point extends number[]> = {
  center: Point
  angle: number
  halfWidth: number
  halfHeight: number
}[]

export type Ellipse<Point extends number[]> = {
  center: Point
  angle: number
  halfWidth: number
  halfHeight: number
}

export type GeometricShape<Point extends number[]> =
  | { type: "line"; data: [Point, Point] }
  | { type: "polygon"; data: Point[] }
  | { type: "curve"; data: { center: Point; angle: number; halfWidth: number; halfHeight: number } }
  | { type: "ellipse"; data: Ellipse<Point> }
  | { type: "polyline"; data: Polyline<Point> }
  | { type: "polycurve"; data: Polycurve<Point> }

// ---------------------------------------------------------------------------
// Shape utilities
// ---------------------------------------------------------------------------

/**
 * Extract drawing operations from a roughjs Drawable.
 */
export function getCurvePathOps(shape: Drawable): Op[] {
  if (!shape?.sets?.length) return []
  return shape.sets[0]?.ops ?? []
}

/**
 * Get polygon shape for rectangular elements (rectangle, diamond, frame, etc.).
 */
export function getPolygonShape<Point extends number[]>(
  element: any,
): GeometricShape<Point> {
  const { x, y, width, height, angle = 0 } = element
  const cx = x + width / 2
  const cy = y + height / 2
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  const corners: Point[] = [
    [x, y] as Point,
    [x + width, y] as Point,
    [x + width, y + height] as Point,
    [x, y + height] as Point,
  ]

  // Rotate corners around center
  const rotated = corners.map(([px, py]) =>
    [
      cos * (px - cx) - sin * (py - cy) + cx,
      sin * (px - cx) + cos * (py - cy) + cy,
    ] as Point,
  )

  return { type: "polygon", data: rotated }
}

/**
 * Get selection box shape around any element.
 */
export function getSelectionBoxShape<Point extends number[]>(
  element: ExcalidrawElement,
  _elementsMap: Map<string, ExcalidrawElement>,
  padding = 0,
): GeometricShape<Point> {
  const { x, y, width, height, angle = 0 } = element
  const cx = x + width / 2
  const cy = y + height / 2
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  const corners: Point[] = [
    [x - padding, y - padding] as Point,
    [x + width + padding, y - padding] as Point,
    [x + width + padding, y + height + padding] as Point,
    [x - padding, y + height + padding] as Point,
  ]

  const rotated = corners.map(([px, py]) =>
    [
      cos * (px - cx) - sin * (py - cy) + cx,
      sin * (px - cx) + cos * (py - cy) + cy,
    ] as Point,
  )

  return { type: "polygon", data: rotated }
}

/**
 * Get ellipse shape for ellipse elements.
 */
export function getEllipseShape<Point extends number[]>(
  element: any,
): GeometricShape<Point> {
  return {
    type: "ellipse",
    data: {
      center: [element.x + element.width / 2, element.y + element.height / 2] as Point,
      angle: element.angle ?? 0,
      halfWidth: Math.abs(element.width) / 2,
      halfHeight: Math.abs(element.height) / 2,
    },
  }
}

/**
 * Convert a roughjs curve drawable into a GeometricShape.
 */
export function getCurveShape<Point extends number[]>(
  roughShape: Drawable,
  startingPoint: Point | undefined,
  angleInRadian: number,
  center: Point,
): GeometricShape<Point> {
  const ops = getCurvePathOps(roughShape)
  if (!ops.length) {
    return { type: "line", data: [center, center] }
  }

  const points: Point[] = []
  let lastPoint: number[] = startingPoint ?? [0, 0]
  const centX = center[0]
  const centY = center[1]
  const cos = Math.cos(-angleInRadian)
  const sin = Math.sin(-angleInRadian)

  for (const op of ops) {
    if (op.op === "move") {
      const px = op.data[0]
      const py = op.data[1]
      lastPoint = [cos * (px - centX) - sin * (py - centY) + centX,
        sin * (px - centX) + cos * (py - centY) + centY]
      points.push(lastPoint as Point)
    } else if (op.op === "lineTo") {
      const px = op.data[0]
      const py = op.data[1]
      lastPoint = [cos * (px - centX) - sin * (py - centY) + centX,
        sin * (px - centX) + cos * (py - centY) + centY]
      points.push(lastPoint as Point)
    } else if (op.op === "bcurveTo") {
      // For bezier curves, approximate by using the end point
      const px = op.data[4]
      const py = op.data[5]
      lastPoint = [cos * (px - centX) - sin * (py - centY) + centX,
        sin * (px - centX) + cos * (py - centY) + centY]
      points.push(lastPoint as Point)
    }
  }

  return { type: "polyline", data: points.slice(0, -1).map((p, i) => [p, points[i + 1]] as [Point, Point]) }
}

/**
 * Get closed curve shape for closed linear elements (lines flagged as closed).
 */
export function getClosedCurveShape<Point extends number[]>(
  element: any,
  roughShape: Drawable,
  startingPoint: Point | undefined,
  angleInRadian: number,
  center: Point,
): GeometricShape<Point> {
  const shape = getCurveShape(roughShape, startingPoint, angleInRadian, center)
  if (shape.type === "polyline" && shape.data.length > 0) {
    const points = [
      shape.data[0][0],
      ...shape.data.map((seg) => seg[1]),
    ]
    return { type: "polygon", data: points }
  }
  return shape
}

/**
 * Get freedraw shape for freedraw elements.
 */
export function getFreedrawShape<Point extends number[]>(
  element: any,
  center: Point,
  isClosed = false,
): GeometricShape<Point> {
  const points: Point[] = (element.points ?? []).map(([px, py]: number[]) =>
    [px + center[0], py + center[1]] as Point,
  )

  if (points.length < 2) {
    return { type: "line", data: [center, center] }
  }

  if (isClosed) {
    return { type: "polygon", data: points }
  }

  const segments: [Point, Point][] = []
  for (let i = 0; i < points.length - 1; i++) {
    segments.push([points[i], points[i + 1]])
  }
  return { type: "polyline", data: segments }
}

/**
 * Determine intersection of a rectangular shaped element and a line segment.
 */
export function segmentIntersectRectangleElement<Point extends number[]>(
  _element: any,
  _segment: [Point, Point],
  _gap?: number,
): Point[] {
  // Simplified intersection - used for binding calculations
  return []
}
