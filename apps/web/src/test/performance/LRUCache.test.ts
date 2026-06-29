import { describe, it, expect } from 'vitest'
import { LRUCache } from '../../utils/LRUCache'

describe('LRUCache', () => {
  it('get() returns stored value for existing key', () => {
    const cache = new LRUCache<string>(3)
    cache.set('a', 'value-a')
    expect(cache.get('a')).toBe('value-a')
  })

  it('get() returns undefined for missing key', () => {
    const cache = new LRUCache<string>(3)
    expect(cache.get('nonexistent')).toBeUndefined()
  })

  it('set() stores value and makes it retrievable', () => {
    const cache = new LRUCache<number>(3)
    cache.set('count', 42)
    expect(cache.get('count')).toBe(42)
  })

  it('get() promotes accessed entry to MRU position', () => {
    const cache = new LRUCache<string>(3)
    cache.set('a', '1')
    cache.set('b', '2')
    cache.set('c', '3')
    cache.get('a') // promote 'a' to MRU
    cache.set('d', '4') // should evict 'b' (LRU after 'a' access)
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('a')).toBe('1')
    expect(cache.get('c')).toBe('3')
    expect(cache.get('d')).toBe('4')
  })

  it('evicts LRU entry when maxSize exceeded', () => {
    const cache = new LRUCache<string>(2)
    cache.set('a', '1')
    cache.set('b', '2')
    cache.set('c', '3') // should evict 'a'
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe('2')
    expect(cache.get('c')).toBe('3')
  })

  it('has() returns correct boolean', () => {
    const cache = new LRUCache<string>(3)
    cache.set('x', '1')
    expect(cache.has('x')).toBe(true)
    expect(cache.has('y')).toBe(false)
  })

  it('delete() removes entry', () => {
    const cache = new LRUCache<string>(3)
    cache.set('a', '1')
    cache.delete('a')
    expect(cache.has('a')).toBe(false)
    expect(cache.get('a')).toBeUndefined()
  })

  it('clear() empties all entries', () => {
    const cache = new LRUCache<string>(3)
    cache.set('a', '1')
    cache.set('b', '2')
    cache.clear()
    expect(cache.has('a')).toBe(false)
    expect(cache.has('b')).toBe(false)
    expect(cache.size).toBe(0)
  })

  it('size property returns correct count', () => {
    const cache = new LRUCache<string>(5)
    expect(cache.size).toBe(0)
    cache.set('a', '1')
    expect(cache.size).toBe(1)
    cache.set('b', '2')
    expect(cache.size).toBe(2)
  })
})
