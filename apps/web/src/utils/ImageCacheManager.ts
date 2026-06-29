/**
 * ImageCacheManager — LRU-backed cache for decoded AI image bitmaps.
 *
 * Features (D-19, Phase 1):
 * - 200MB hard memory limit (MAX_CACHE_BYTES)
 * - Auto-eviction: when totalBytes exceeds maxBytes, evict LRU entries
 * - createImageBitmap() decode from Blob
 * - bitmap.close() cleanup on eviction/delete/clear (GPU memory)
 * - Singleton instance (imageCache) for the application
 */
import { LRUCache } from './LRUCache'

const MAX_CACHE_BYTES = 200 * 1024 * 1024 // 200MB hard limit (D-19)

interface CachedImage {
  bitmap: ImageBitmap
  byteSize: number // Approximate memory usage in bytes
  blobId: string
}

export class ImageCacheManager {
  private readonly _cache: LRUCache<CachedImage>
  private _totalBytes: number = 0
  private readonly _maxBytes: number

  constructor(maxBytes: number = MAX_CACHE_BYTES, maxEntries: number = 200) {
    this._maxBytes = maxBytes
    this._cache = new LRUCache<CachedImage>(maxEntries)
  }

  get totalBytes(): number {
    return this._totalBytes
  }

  get size(): number {
    return this._cache.size
  }

  get(key: string): ImageBitmap | undefined {
    const entry = this._cache.get(key)
    return entry?.bitmap
  }

  has(key: string): boolean {
    return this._cache.has(key)
  }

  async set(key: string, blob: Blob): Promise<void> {
    // Decode Blob to ImageBitmap
    const bitmap = await createImageBitmap(blob)
    const byteSize = blob.size

    // Evict until there's room
    while (this._totalBytes + byteSize > this._maxBytes && this._cache.size > 0) {
      this._evictOne()
    }

    this._cache.set(key, { bitmap, byteSize, blobId: key })
    this._totalBytes += byteSize
  }

  delete(key: string): void {
    const entry = this._cache.get(key)
    if (entry) {
      this._totalBytes -= entry.byteSize
      entry.bitmap.close() // Free GPU memory
      this._cache.delete(key)
    }
  }

  clear(): void {
    // Close all bitmaps to free GPU memory
    for (const key of this._cache.keys()) {
      const entry = this._cache.get(key)
      if (entry) entry.bitmap.close()
    }
    this._cache.clear()
    this._totalBytes = 0
  }

  private _evictOne(): void {
    // Get LRU key (first in list = least recently used)
    const keys = this._cache.keys()
    if (keys.length === 0) return

    const lruKey = keys[0]
    const entry = this._cache.get(lruKey)
    if (entry) {
      this._totalBytes -= entry.byteSize
      entry.bitmap.close() // Free GPU memory
      this._cache.delete(lruKey)
    }
  }
}

// Singleton instance for the app
export const imageCache = new ImageCacheManager()
