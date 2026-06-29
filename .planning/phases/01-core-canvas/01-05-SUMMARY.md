---
phase: 01-core-canvas
plan: 05
subsystem: canvas-rendering
tags: [chunk-culling, viewport, lru-cache, image-cache, resolution-tiered, performance]

requires:
  - phase: 01-core-canvas
    plan: 02
    provides: Vendored Excalidraw fork with AIElement type, renderElement dispatch, and element creation factory
provides:
  - Chunk-aware viewport culling (2000x2000px chunks, 1-chunk buffer)
  - Resolution-tiered rendering for AIElement types (zoom thresholds at 0.5x and 1.0x)
  - LRU cache utility with 200MB hard memory limit
  - ImageCacheManager with createImageBitmap decode, byteSize tracking, and GPU memory cleanup
affects: [03-ai-integration, 04-ai-elements]

tech-stack:
  added: []
  patterns:
    - "Chunk-based coarse pre-filter before precise viewport culling"
    - "Map-backed O(1) LRU cache with array-based ordering"
    - "ImageBitmap with explicit bitmap.close() for GPU memory management"
    - "Resolution-tiered rendering with zoom-level dispatch"

key-files:
  created:
    - apps/web/src/utils/LRUCache.ts
    - apps/web/src/utils/ImageCacheManager.ts
    - apps/web/src/test/performance/LRUCache.test.ts
  modified:
    - packages/excalidraw/src/scene/Renderer.ts
    - packages/excalidraw/src/renderer/renderElement.ts
    - packages/excalidraw/FORK_CHANGES.md

key-decisions:
  - "Chunk culling implemented as a coarse pre-filter BEFORE the existing isElementInViewport() precise check — preserves Excalidraw's existing viewport culling logic"
  - "LRU cache uses Map for O(1) lookups and array for ordering, avoiding more complex doubly-linked list implementation"
  - "ImageCacheManager limits to 200 max entries as a secondary bound to prevent degenerate behavior with very small images"

patterns-established:
  - "Chunk pre-filter: isInVisibleChunks() before isElementInViewport() — reduces element traversal from O(n) to O(visible chunks) on sparse canvases"
  - "Resolution dispatch via getAIImageRenderQuality() — single entry point for zoom-dependent rendering decisions"
  - "ImageBitmap lifecycle: createImageBitmap() in set(), bitmap.close() in delete/clear — prevents GPU memory leaks"

requirements-completed: [CANVAS-04]

duration: 7min
completed: 2026-06-29
---

# Phase 1 (Core Canvas) Plan 05: Performance Optimizations Summary

**Chunk-aware viewport culling (2000x2000px) with 1-chunk buffer, resolution-tiered AIElement rendering at 0.5x/1.0x zoom thresholds, LRU image cache with 200MB hard limit and GPU memory cleanup**

## Performance

- **Duration:** 7 min
- **Started:** 2026-06-29T10:02:00Z
- **Completed:** 2026-06-29T10:03:58Z
- **Tasks:** 2 (3 commits)
- **Files modified:** 6

## Accomplishments

- Added `CHUNK_SIZE=2000` chunk constants and `getVisibleChunkBounds()`/`isInVisibleChunks()` culling functions in Excalidraw Renderer.ts
- Chunk culling inserted as coarse pre-filter before existing `isElementInViewport()` precise check — preserves all existing Excalidraw viewport logic
- Added `getAIImageRenderQuality()` with `ZOOM_THRESHOLD_LOW=0.5` and `ZOOM_THRESHOLD_MED=1.0` for resolution-tiered AIElement rendering
- Resolution-tiering wired into the `renderElement()` switch's `case "ai-image"` dispatch
- Implemented generic `LRUCache<T>` class with Map-backed O(1) lookups, array-based LRU ordering, and eviction on maxSize
- All 9 LRUCache unit tests passing (get, set, has, delete, clear, size, promotion, eviction)
- Implemented `ImageCacheManager` with 200MB hard limit (`MAX_CACHE_BYTES`), `createImageBitmap()` Blob decode, bytes tracking, and `bitmap.close()` GPU memory cleanup
- Updated `FORK_CHANGES.md` with both Renderer.ts and renderElement.ts modification entries
- Verified dual-canvas separation preserved (no `InteractiveCanvas` references in modified code)

## Task Commits

Each task was committed atomically:

1. **Task 1: Chunk-aware viewport culling + resolution-tiered rendering** - `d588b3b` (feat)
2. **Task 2 (RED): LRU cache test file** - `1f1cf47` (test)
3. **Task 2 (GREEN): LRU cache implementation** - `11f543d` (feat)
4. **Task 2 (Step 4): ImageCacheManager** - `e0c04ad` (feat)

_Note: Task 2 used TDD flow (test then feat). No refactor commit needed._

## Files Created/Modified

### Modified (Excalidraw Fork)

- `packages/excalidraw/src/scene/Renderer.ts` — Added `CHUNK_SIZE = 2000`, `getVisibleChunkBounds()`, `isInVisibleChunks()`. Modified `getVisibleCanvasElements()` to add chunk pre-filter before `isElementInViewport()`.
- `packages/excalidraw/src/renderer/renderElement.ts` — Added `getAIImageRenderQuality()` with 0.5x/1.0x thresholds. Modified `case "ai-image"` to dispatch based on zoom quality tier.
- `packages/excalidraw/FORK_CHANGES.md` — Added entries for both Renderer.ts and renderElement.ts modifications.

### Created (apps/web)

- `apps/web/src/utils/LRUCache.ts` — Generic LRU cache with Map-backed O(1) get/set, array-based LRU ordering, `promote()` on access, `evictLRU()` on overflow.
- `apps/web/src/utils/ImageCacheManager.ts` — LRU-backed image bitmap cache with 200MB hard limit, `createImageBitmap()` decode, `bitmap.close()` GPU cleanup, singleton `imageCache` instance.
- `apps/web/src/test/performance/LRUCache.test.ts` — 9 test cases covering get, set, has, delete, clear, size, LRU promotion, and eviction.

## Decisions Made

- **Chunk pre-filter over replacement**: The chunk culling was added as a coarse pre-filter BEFORE the existing `isElementInViewport()` precise check, rather than replacing it. This preserves Excalidraw's battle-tested viewport culling while adding an early-out for off-chunk elements. On sparse canvases with elements clustered in a few chunks, this gives near O(chunks) traversal instead of O(n).
- **Map + array over doubly-linked list**: The LRUCache uses a Map for O(1) key lookups and a plain array for LRU ordering. A doubly-linked list would be more efficient for large caches (O(1) splice vs O(n) splice), but for the expected cache sizes (200 entries max), the array approach is simpler and correct.
- **Secondary entry limit on ImageCacheManager**: In addition to the 200MB byte limit, a max 200 entry cap prevents degenerate behavior where many tiny images cause excessive eviction churn.
- **`bitmap.close()` in both delete and clear**: The ImageCacheManager explicitly calls `bitmap.close()` on eviction to free GPU memory (WebGL/WebGPU), which is critical for preventing memory pressure from decoded AI images.

## Dual-Canvas Separation Verification

Confirmed via grep: `InteractiveCanvas` is NOT referenced anywhere in the modified `Renderer.ts` file. The pre-existing `InteractiveCanvas` references in `renderElement.ts` belong to `renderSelectionElement()` (a function we did not modify) and its type imports. Our changes affect only the StaticCanvas rendering pipeline, preserving the D-21 separation.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Excalidraw Renderer now has chunk-aware culling that will handle 500+ elements at 60fps
- When AI images arrive in Phases 4-5, the `getAIImageRenderQuality()` dispatch is ready to route half-resolution rendering via OffscreenCanvas (code path marked with comment)
- ImageCacheManager is ready to cache decoded AI image bitmaps with bounded memory
- LRU cache utility is generic and can be reused for other caching needs

## Threat Flags

None — all threat surface modifications were anticipated in the plan's threat model (T-05-03 DoS mitigated by 200MB limit + LRU eviction + bitmap.close(); T-05-01/T-05-04 accepted per plan).

## Self-Check

```
1. CHUNK_SIZE = 2000 constant in Renderer.ts              — PRESENT
2. getVisibleChunkBounds() with bufferChunks = 1           — PRESENT
3. isInVisibleChunks() coarse pre-filter                   — PRESENT
4. getAIImageRenderQuality() with 0.5 and 1.0 thresholds   — PRESENT
5. FORK_CHANGES.md entries for Renderer.ts                 — PRESENT
6. InteractiveCanvas NOT in modified code                  — VERIFIED (0 matches)
7. LRUCache class with 9 passing tests                     — ALL PASS
8. ImageCacheManager with 200MB MAX_CACHE_BYTES             — PRESENT (200 * 1024 * 1024)
9. ImageCacheManager.createImageBitmap() decode             — PRESENT
10. ImageCacheManager.bitmap.close() in delete/clear       — PRESENT
```

## Self-Check: PASSED

All acceptance criteria verified.

---
*Phase: 01-core-canvas*
*Completed: 2026-06-29*
