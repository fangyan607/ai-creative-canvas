# FORK_CHANGES.md — @ac-canvas/excalidraw

**Upstream:** [excalidraw/excalidraw](https://github.com/excalidraw/excalidraw)
**Fork base tag:** v0.18.0
**Fork date:** 2026-06-29

## Purpose
Vendored fork of Excalidraw v0.18.x to add AIElement type support and deep integration
with the project's custom rendering pipeline (chunk rendering, resolution-tiered rendering,
LRU image cache). Full vendored copy (not npm wrapper) per D-01.

## Sync Cadence
- Sync upstream every 2-4 weeks (D-25)
- Before each sync, review this file to identify customizations that may conflict
- Any generic (non-domain-specific) bug fix should be PR'd upstream (D-27)

## Modified Files

| File | Modification | Reason | Date | Phase |
|------|-------------|--------|------|-------|
| (initial vendored state) | Vendored from upstream v0.18.0 | Initial fork | 2026-06-29 | Phase 1 |
| element/types.ts | Added ExcalidrawAIImageElement type + added to ExcalidrawElement union | AIElement custom type (D-11) | 2026-06-29 | Phase 1 |
| renderer/renderElement.ts | Added case 'ai-image' render dispatch + renderAIPlaceholder function | Placeholder rendering (D-12) | 2026-06-29 | Phase 1 |
| element/newElement.ts | Added newAIElement() factory | Element creation utility | 2026-06-29 | Phase 1 |

## Modification Rules
- Every phase that touches packages/excalidraw/ MUST update this file
- Entries: file path, modification reason, date, phase reference
- No exception to this discipline (D-26)
