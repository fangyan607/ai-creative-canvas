/**
 * Sliding-window rate limiter — pure function, no Zustand/React dependency.
 *
 * Per-provider rate limits are hardcoded per D-03:
 * - OpenAI:    5 req / 60s window
 * - Stability: 10 req / 60s window
 * - Mock:      Infinity (no limit)
 * - Unknown:   Permissive (allow through)
 *
 * The caller (AIQueueStore) maintains the timestamp array per provider.
 * This module is stateless and fully testable.
 */

export const DEFAULT_RATE_LIMITS: Record<string, { rate: number; windowMs: number }> = {
  openai:    { rate: 5,  windowMs: 60000 },
  stability: { rate: 10, windowMs: 60000 },
  mock:      { rate: Infinity, windowMs: 60000 },
}

/**
 * Check whether a request is allowed under the sliding-window rate limit.
 *
 * @param providerId   - Provider key to look up in DEFAULT_RATE_LIMITS
 * @param timestamps   - Array of previous request timestamps (ms since epoch), oldest-first
 * @param now          - Current time override (for testing). Defaults to Date.now().
 * @returns            - `{ allowed, waitMs }` where waitMs > 0 when rate limited
 */
export function checkRateLimit(
  providerId: string,
  timestamps: number[],
  now: number = Date.now(),
): { allowed: boolean; waitMs: number } {
  const limits = DEFAULT_RATE_LIMITS[providerId]

  // Unknown provider: permissive (allow through, delegate enforcement to provider API)
  if (!limits) return { allowed: true, waitMs: 0 }

  // Infinity rate: always allowed (mock adapter)
  if (limits.rate === Infinity) return { allowed: true, waitMs: 0 }

  const windowStart = now - limits.windowMs
  // Filter timestamps strictly within the current sliding window (exclude exact boundary)
  const recent = timestamps.filter(t => t > windowStart)

  if (recent.length < limits.rate) {
    return { allowed: true, waitMs: 0 }
  }

  // Wait until the oldest timestamp in the window expires
  const oldestInWindow = recent[0]
  const waitMs = oldestInWindow + limits.windowMs - now
  return { allowed: false, waitMs: Math.max(waitMs, 0) }
}
