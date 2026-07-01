## Open Questions

1. **Encryption approach: app-level key vs user passphrase?** -- RESOLVED: App-level key chosen for MVP velocity (Plan 05 Task 1 encryption.ts). Upgrade path to passphrase documented via `deriveEncryptionKey()` function — only that function needs to change.
   - What we know: D-09 allows either. Web Crypto PBKDF2 implementation is the same either way.
   - What's unclear: User passphrase UX adds friction (user must remember/enter a password) but provides stronger security. App-level key is transparent but less secure.
   - Recommendation: Start with app-level key for MVP velocity. The encryption API is abstracted in `providerStore.ts` -- upgrading to passphrase later only changes `getEncryptionKey()`.

2. **Where does `storeImage` store blobs?** -- RESOLVED: The `storeImage` callback is passed into `execute()` by the caller (Phase 5 bridge). The adapter never manages storage. The caller (Phase 5) will provide the callback that stores blobs using whatever blob storage mechanism is available (delegated per D-03).
   - What we know: Phase 1 planned blob storage (D-13) but no `BlobStore` service exists in the current codebase. ImageCacheManager handles ImageBitmap caching, not blob persistence.
   - What's unclear: Does the `storeImage` callback need to create a new blob storage table in IndexedDB? Or reuse the existing project record?
   - Recommendation: Planner should define a `BlobStore` service (or integrate into existing projectService) that stores blobs in IndexedDB. The `storeImage` callback delegates to this service.

3. **Stability.ai image-to-image: input image format?** -- RESOLVED: The adapter's `execute()` receives image blob via `inputs.imageBlob` (for in-memory blobs passed from upstream node). The `imageBlobId` in inputs is used for lookups but the blob itself is passed directly as the recommended path for MVP simplicity (Plan 04 Task 1).
   - What we know: v2beta SD3 endpoint supports `mode=image-to-image` with `image` (binary) and `strength` (0-1) params.
   - What's unclear: The adapter receives images as `imageBlobId` strings (Phase 1 blob references). Need to load blob from IndexedDB before sending as FormData.
   - Recommendation: The adapter's `execute()` receives a helper function or reads from a global blob resolver to convert `imageBlobId` to `Blob`.

4. **Provider config: new Dexie table or field on projects?** -- RESOLVED: New `providerConfigs` table (global scope) at Dexie schema version 2 (Plan 05 Task 1). Provider configs are not per-project, so a separate table is cleaner than a field on ProjectRecord.
   - What we know: D-08 says planner decides. Provider configs are global (not per-project) in MVP.
   - What's unclear: Should config be scoped per-project or global? If per-project, a field on `ProjectRecord` works. If global, a new `providerConfig` table is cleaner.
   - Recommendation: New `providerConfig` table (global scope, separate from project data). Simpler CRUD, no serialization coupling, easy to make per-user later.
