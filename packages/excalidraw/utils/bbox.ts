import type { Bounds } from "../src/element/bounds"

export type LineSegment<P extends Array<number>> = [P, P]

export function getBBox<P extends number[]>(line: LineSegment<P>): Bounds {
  return [
    Math.min(line[0][0], line[1][0]),
    Math.min(line[0][1], line[1][1]),
    Math.max(line[0][0], line[1][0]),
    Math.max(line[0][1], line[1][1]),
  ] as unknown as Bounds
}

export function doBBoxesIntersect(a: Bounds, b: Bounds): boolean {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1]
}

export function isPointOnLine<P extends number[]>(
  l: LineSegment<P>,
  p: P,
): boolean {
  const [ax, ay] = l[0]
  const [bx, by] = l[1]
  const [px, py] = p

  const cross = (px - ax) * (by - ay) - (py - ay) * (bx - ax)
  if (Math.abs(cross) > Number.EPSILON) return false

  const dot = (px - ax) * (bx - ax) + (py - ay) * (by - ay)
  if (dot < 0) return false

  const lenSq = (bx - ax) ** 2 + (by - ay) ** 2
  if (dot > lenSq) return false

  return true
}

export function isPointRightOfLine<P extends number[]>(
  l: LineSegment<P>,
  p: P,
): boolean {
  const [ax, ay] = l[0]
  const [bx, by] = l[1]
  return (bx - ax) * (p[1] - ay) - (by - ay) * (p[0] - ax) < 0
}

export function isLineSegmentTouchingOrCrossingLine<
  P extends number[],
>(a: LineSegment<P>, b: LineSegment<P>): boolean {
  return (
    isPointRightOfLine(a, b[0]) !== isPointRightOfLine(a, b[1])
  )
}

export function doLineSegmentsIntersect<P extends number[]>(
  a: LineSegment<P>,
  b: LineSegment<P>,
): boolean {
  return (
    isLineSegmentTouchingOrCrossingLine(a, b) &&
    isLineSegmentTouchingOrCrossingLine(b, a)
  )
}
