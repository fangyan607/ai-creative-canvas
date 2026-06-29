export function deepClone<T>(value: T): T {
  try {
    return structuredClone(value)
  } catch {
    // Fallback if structuredClone is not available
    return JSON.parse(JSON.stringify(value))
  }
}

export function filterTransientProps(element: Record<string, unknown>): Record<string, unknown> {
  const transientProps = new Set(['isSelected', 'dragging', 'measured'])
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(element)) {
    if (!transientProps.has(key)) {
      result[key] = value
    }
  }
  return result
}
