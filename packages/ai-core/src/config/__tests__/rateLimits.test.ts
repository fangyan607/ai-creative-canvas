import { describe, it, expect, vi } from 'vitest'
import { checkRateLimit, DEFAULT_RATE_LIMITS } from '../rateLimits'

describe('checkRateLimit', () => {
  it('allows when no timestamps provided', () => {
    const result = checkRateLimit('openai', [], Date.now())
    expect(result.allowed).toBe(true)
    expect(result.waitMs).toBe(0)
  })

  it('allows when within limit (1 of 5 requests in last 60s for openai)', () => {
    const now = Date.now()
    const timestamps = [now - 10000] // 10 seconds ago
    const result = checkRateLimit('openai', timestamps, now)
    expect(result.allowed).toBe(true)
    expect(result.waitMs).toBe(0)
  })

  it('rate limits when at limit (5 of 5 requests in last 60s for openai)', () => {
    const now = Date.now()
    // 5 timestamps all within the last 60 seconds
    const timestamps = [
      now - 10000,
      now - 20000,
      now - 30000,
      now - 40000,
      now - 50000,
    ]
    const result = checkRateLimit('openai', timestamps, now)
    expect(result.allowed).toBe(false)
    expect(result.waitMs).toBeGreaterThan(0)
  })

  it('rate limits when over limit (6 of 5 requests in last 60s for openai)', () => {
    const now = Date.now()
    const timestamps = [
      now - 1000,
      now - 5000,
      now - 10000,
      now - 20000,
      now - 30000,
      now - 40000,
    ]
    const result = checkRateLimit('openai', timestamps, now)
    expect(result.allowed).toBe(false)
    expect(result.waitMs).toBeGreaterThan(0)
  })

  it('prunes old timestamps outside the window (oldest is 70s ago, only 3 within window)', () => {
    const now = Date.now()
    // 5 timestamps, but only 3 within the last 60s
    const timestamps = [
      now - 70000, // 70s ago — outside window
      now - 65000, // 65s ago — outside window
      now - 30000, // 30s ago — inside
      now - 20000, // 20s ago — inside
      now - 10000, // 10s ago — inside
    ]
    const result = checkRateLimit('openai', timestamps, now)
    expect(result.allowed).toBe(true)
    expect(result.waitMs).toBe(0)
  })

  it('always allows mock adapter (rate: Infinity) even with many timestamps', () => {
    const now = Date.now()
    const timestamps = [
      now - 1000,
      now - 2000,
      now - 3000,
      now - 4000,
      now - 5000,
      now - 6000,
      now - 7000,
    ]
    const result = checkRateLimit('mock', timestamps, now)
    expect(result.allowed).toBe(true)
    expect(result.waitMs).toBe(0)
  })

  it('allows unknown providers permissively', () => {
    const now = Date.now()
    const timestamps = [now - 1000, now - 2000, now - 3000]
    const result = checkRateLimit('unknown-provider', timestamps, now)
    expect(result.allowed).toBe(true)
    expect(result.waitMs).toBe(0)
  })

  it('excludes timestamps exactly at window boundary (older than windowStart)', () => {
    const now = Date.now()
    const windowMs = 60000
    const windowStart = now - windowMs
    // timestamp exactly at windowStart should be excluded (t > windowStart, not >=)
    const timestamps = [windowStart, now - 10000, now - 20000]
    // For openai rate=5, 3 timestamps with 1 excluded => 2 within window => allowed
    const result = checkRateLimit('openai', timestamps, now)
    expect(result.allowed).toBe(true)
    expect(result.waitMs).toBe(0)
  })

  it('transitions from rate limited back to allowed when a timestamp expires', () => {
    const now = Date.now()
    const windowMs = 60000
    const windowStart = now - windowMs

    // 5 timestamps all within window — rate limited
    const timestamps = [
      windowStart + 1, // just inside window
      now - 40000,
      now - 30000,
      now - 20000,
      now - 10000,
    ]
    const result1 = checkRateLimit('openai', timestamps, now)
    expect(result1.allowed).toBe(false)
    expect(result1.waitMs).toBeGreaterThan(0)

    // Simulate time passing: now moves forward past the first window boundary
    const laterNow = windowStart + windowMs + 1000 // 1 second after the first timestamp expires
    const result2 = checkRateLimit('openai', timestamps, laterNow)
    // Now windowStart = laterNow - windowMs = (windowStart + windowMs + 1000) - windowMs = windowStart + 1000
    // Only timestamps > windowStart + 1000 are within window
    // timestamps[0] = windowStart + 1 — excluded (not > windowStart + 1000)
    // Remaining 4 timestamps are still within window, 4 < 5 => allowed
    expect(result2.allowed).toBe(true)
    expect(result2.waitMs).toBe(0)
  })
})
