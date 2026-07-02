import { describe, bench } from 'vitest'
import { LRUCache } from '../../utils/LRUCache'

/**
 * LRU Cache Performance Benchmarks
 *
 * Simulates 200MB memory limit behavior using string values of ~100 bytes
 * (representative of image blob keys/URLs in the actual cache).
 *
 * Cache configuration:
 * - Max size: 400 entries (simulating 200MB limit with ~500KB avg image)
 * - Hot set: 50 frequently accessed keys
 * - Warm set: 200 periodically accessed keys
 * - Cold set: 150 rarely accessed keys (eviction candidates)
 *
 * Run: pnpm test:perf
 */

// ── Test Setup ──

// Simulate 200MB memory limit: 200MB / 500KB avg = ~400 entries
const CACHE_SIZE = 400
const HOT_COUNT = 50
const WARM_COUNT = 200
const COLD_COUNT = 150

function populateCacheWithAccessPattern(): {
  cache: LRUCache<string>
  hotKeys: string[]
  warmKeys: string[]
  coldKeys: string[]
} {
  const cache = new LRUCache<string>(CACHE_SIZE)
  const value = 'x'.repeat(100) // ~100 bytes per entry

  // Insert all entries
  const allKeys: string[] = []
  for (let i = 0; i < CACHE_SIZE; i++) {
    const key = `img-${i}`
    cache.set(key, value)
    allKeys.push(key)
  }

  return {
    cache,
    hotKeys: allKeys.slice(0, HOT_COUNT),
    warmKeys: allKeys.slice(HOT_COUNT, HOT_COUNT + WARM_COUNT),
    coldKeys: allKeys.slice(HOT_COUNT + WARM_COUNT),
  }
}

// ── Benchmarks ──

describe('LRUCache - hit rate under 200MB simulation', () => {
  bench('hot keys: get 50 items with 100% hit rate', () => {
    const { cache, hotKeys } = populateCacheWithAccessPattern()
    for (const key of hotKeys) {
      cache.get(key)
    }
  })

  bench('eviction: insert 50 new entries evicting cold keys', () => {
    const { cache } = populateCacheWithAccessPattern()
    for (let i = 0; i < 50; i++) {
      cache.set(`new-img-${i}`, 'x'.repeat(100))
    }
  })

  bench('mixed access: hot(80%) + warm(15%) + cold(5%) pattern', () => {
    const { cache, hotKeys, warmKeys, coldKeys } = populateCacheWithAccessPattern()
    // Simulate 100 accesses with realistic distribution
    for (let i = 0; i < 100; i++) {
      const rand = Math.random()
      if (rand < 0.8) {
        cache.get(hotKeys[Math.floor(Math.random() * hotKeys.length)])
      } else if (rand < 0.95) {
        cache.get(warmKeys[Math.floor(Math.random() * warmKeys.length)])
      } else {
        cache.get(coldKeys[Math.floor(Math.random() * coldKeys.length)])
      }
    }
  })
})
