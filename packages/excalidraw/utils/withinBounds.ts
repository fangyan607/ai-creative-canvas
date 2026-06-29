import { getElementAbsoluteCoords } from "../src/element/bounds"
import type {
  Bounds,
} from "../src/element/bounds"
import type {
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
} from "../src/element/types"

type Element = NonDeletedExcalidrawElement
type Elements = readonly NonDeletedExcalidrawElement[]

export const isElementInsideBBox = (
  element: Element,
  bbox: Bounds,
  eitherDirection?: boolean,
): boolean => {
  const [x1, y1, x2, y2] = getElementAbsoluteCoords(element)

  if (eitherDirection) {
    return (
      (x1 >= bbox[0] && y1 >= bbox[1] && x2 <= bbox[2] && y2 <= bbox[3]) ||
      (bbox[0] >= x1 && bbox[1] >= y1 && bbox[2] <= x2 && bbox[3] <= y2)
    )
  }

  return x1 >= bbox[0] && y1 >= bbox[1] && x2 <= bbox[2] && y2 <= bbox[3]
}

export const elementPartiallyOverlapsWithOrContainsBBox = (
  element: Element,
  bbox: Bounds,
): boolean => {
  const [x1, y1, x2, y2] = getElementAbsoluteCoords(element)
  return x1 < bbox[2] && x2 > bbox[0] && y1 < bbox[3] && y2 > bbox[1]
}

export const elementsOverlappingBBox = ({
  elements,
  bounds,
  type,
  errorMargin = 0,
}: {
  elements: Elements
  bounds: Bounds | ExcalidrawElement
  errorMargin?: number
  type: "overlap" | "contain" | "inside"
}): NonDeletedExcalidrawElement[] => {
  let bbox: Bounds

  if (Array.isArray(bounds) && bounds.length === 4) {
    bbox = bounds
  } else {
    bbox = getElementAbsoluteCoords(bounds as ExcalidrawElement)
  }

  const expandedBbox: Bounds = [
    bbox[0] - errorMargin,
    bbox[1] - errorMargin,
    bbox[2] + errorMargin,
    bbox[3] + errorMargin,
  ]

  return elements.filter((el) => {
    if (type === "inside") {
      return isElementInsideBBox(el, expandedBbox)
    }
    if (type === "contain") {
      return (
        isElementInsideBBox(el, expandedBbox, true) ||
        elementPartiallyOverlapsWithOrContainsBBox(el, expandedBbox)
      )
    }
    return elementPartiallyOverlapsWithOrContainsBBox(el, expandedBbox)
  }) as NonDeletedExcalidrawElement[]
}
