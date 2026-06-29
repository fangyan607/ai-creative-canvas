/**
 * LRU (Least Recently Used) Cache
 * Evicts the least-recently-used entry when maxSize is exceeded.
 * Used for decoded AI image bitmap cache (D-19, Phase 1).
 *
 * Provides O(1) get/set via Map for lookups, with a linked list
 * (implemented as a plain array) for LRU ordering.
 */
export class LRUCache<T> {
  private readonly _maxSize: number
  private readonly _map: Map<string, { value: T; key: string }>
  private readonly _list: { key: string; value: T }[]

  constructor(maxSize: number) {
    if (maxSize < 1) throw new Error('maxSize must be >= 1')
    this._maxSize = maxSize
    this._map = new Map()
    this._list = []
  }

  get size(): number {
    return this._list.length
  }

  get maxSize(): number {
    return this._maxSize
  }

  has(key: string): boolean {
    return this._map.has(key)
  }

  get(key: string): T | undefined {
    const entry = this._map.get(key)
    if (!entry) return undefined
    // Promote to MRU (move to end of list)
    this._promote(entry)
    return entry.value
  }

  set(key: string, value: T): void {
    const existing = this._map.get(key)
    if (existing) {
      // Update existing entry
      existing.value = value
      this._promote(existing)
      return
    }
    // Evict if at capacity
    if (this._list.length >= this._maxSize) {
      this._evictLRU()
    }
    // Add new entry as MRU
    const entry = { key, value }
    this._map.set(key, entry)
    this._list.push(entry)
  }

  delete(key: string): boolean {
    const entry = this._map.get(key)
    if (!entry) return false
    this._map.delete(key)
    const idx = this._list.indexOf(entry)
    if (idx >= 0) this._list.splice(idx, 1)
    return true
  }

  clear(): void {
    this._map.clear()
    this._list.length = 0
  }

  /** Returns all keys in LRU order (least recently used first) */
  keys(): string[] {
    return this._list.map((e) => e.key)
  }

  private _promote(entry: { key: string; value: T }): void {
    const idx = this._list.indexOf(entry)
    if (idx >= 0) {
      this._list.splice(idx, 1)
      this._list.push(entry)
    }
  }

  private _evictLRU(): void {
    const lru = this._list.shift()
    if (lru) {
      this._map.delete(lru.key)
    }
  }
}
