/**
 * ImageBlobStore — In-memory blob storage for AI-generated images.
 *
 * MVP tier: blobs are stored in-memory only (Map<string, Blob>).
 * Blobs are available during the current session for PreviewNode to display.
 * Persists blobs across node re-executions within the same session.
 *
 * The `store()` signature matches AiAdapter's `onStoreImage` callback:
 *   (blob: Blob) => Promise<string>
 *
 * Future: Phase 6 backend adds IndexedDB-backed blob persistence.
 * Phase 8 may add LRU eviction for memory management.
 */

export class ImageBlobStore {
  private blobs = new Map<string, Blob>()

  /**
   * Store a blob and return its unique ID.
   * The returned ID is used as `imageBlobId` in AdapterResult.
   */
  async store(blob: Blob): Promise<string> {
    const id = crypto.randomUUID()
    this.blobs.set(id, blob)
    return id
  }

  /** Retrieve a stored blob by ID. Returns undefined if not found. */
  async get(id: string): Promise<Blob | undefined> {
    return this.blobs.get(id)
  }

  /** Delete a blob by ID. No-op if not found. */
  async delete(id: string): Promise<void> {
    this.blobs.delete(id)
  }

  /** Remove all stored blobs. Called on project switch or clear. */
  clear(): void {
    this.blobs.clear()
  }

  /** Current number of stored blobs (for debugging/memory tracking). */
  get size(): number {
    return this.blobs.size
  }
}

/** Singleton instance shared across the application. */
export const imageBlobStore = new ImageBlobStore()
