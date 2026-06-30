---
phase: 02-node-editor-interface
reviewed: 2026-06-30T12:00:00Z
depth: standard
files_reviewed: 37
files_reviewed_list:
  - README.md
  - apps/web/package.json
  - apps/web/src/App.tsx
  - apps/web/src/components/CanvasWrapper.tsx
  - apps/web/src/hooks/useAutoSave.ts
  - apps/web/src/indexedb/db.ts
  - apps/web/src/stores/historyStore.ts
  - apps/web/src/stores/nodeGraphStore.ts
  - apps/web/src/test/indexedb/database.test.ts
  - apps/web/src/test/shared/nodeGraphTypes.test.ts
  - apps/web/src/test/stores/historyStore.test.ts
  - apps/web/src/test/stores/nodeGraphStore.test.ts
  - apps/web/src/test/stores/stubs/stores.test.ts
  - apps/web/tsconfig.json
  - packages/excalidraw/FORK_CHANGES.md
  - packages/node-editor/package.json
  - packages/node-editor/src/ConnectionLine.tsx
  - packages/node-editor/src/ConnectionValidator.ts
  - packages/node-editor/src/FocusModeToggle.tsx
  - packages/node-editor/src/NodeEditorOverlay.tsx
  - packages/node-editor/src/PropertyPanel.tsx
  - packages/node-editor/src/TemplateDialog.tsx
  - packages/node-editor/src/index.ts
  - packages/node-editor/src/nodes/BaseNode.tsx
  - packages/node-editor/src/nodes/MergeNode.tsx
  - packages/node-editor/src/nodes/PreviewNode.tsx
  - packages/node-editor/src/nodes/PromptNode.tsx
  - packages/node-editor/src/nodes/StyleNode.tsx
  - packages/node-editor/src/nodes/TextToImageNode.tsx
  - packages/node-editor/src/templates/index.ts
  - packages/node-editor/test/ConnectionValidator.test.ts
  - packages/node-editor/tsconfig.json
  - packages/shared/src/index.ts
  - packages/shared/src/types/nodeGraph.ts
  - packages/shared/src/types/project.ts
  - packages/shared/src/utils/coordinate.ts
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-06-30T12:00:00Z
**Depth:** standard
**Files Reviewed:** 37
**Status:** issues_found

## Summary

Reviewed 37 source files across the Phase 2 node-editor interface implementation, including the shared type definitions, Zustand stores (nodeGraph, history, canvas), React Flow node components (5 node types, base framework, connection validation), UI components (PropertyPanel, FocusModeToggle, TemplateDialog, NodeEditorOverlay), IndexedDB persistence layer, and test suites. Scope covers `@ac-canvas/shared`, `@ac-canvas/node-editor`, and `apps/web` packages.

Overall code quality is high with clear structure, consistent D-xx design documentation, and thorough test coverage. Most issues are edge-case correctness problems in the interaction between controlled/uncontrolled React state, pointer event handling, and async error handling. No critical security vulnerabilities were found.

**Key concerns:**
1. PromptNode uses `defaultValue` instead of `value`, breaking PropertyPanel-to-node sync
2. CanvasWrapper lacks pointer capture, risking permanent drag lockout
3. `useAutoSave` has unhandled promise rejections and optimistic ref updates without rollback
4. Cross-package imports from `node-editor` into `apps/web` create a package cycle

## Warnings

### WR-01: PromptNode uses defaultValue instead of value -- PropertyPanel edits invisible to node

**File:** `packages/node-editor/src/nodes/PromptNode.tsx:25`
**Issue:** The textarea uses React's `defaultValue` prop instead of `value`. React's `defaultValue` only sets the initial render value; subsequent prop changes do NOT update the input. When a user edits the prompt text via the PropertyPanel (which calls `updateNodeData` on the store), the PromptNode component re-renders with new `data.prompt`, but the textarea visually stays at the old value. The user sees stale content in the node editor.

```tsx
<textarea
  className="..."
  placeholder="Enter your prompt..."
  defaultValue={(data as any).prompt}  // <-- BUG: defaultValue, not value
/>
```

**Fix:** Replace `defaultValue` with `value` to make the textarea a controlled component:

```tsx
<textarea
  className="..."
  placeholder="Enter your prompt..."
  value={(data as any).prompt ?? ''}
  onChange={(e) => {
    // Optional: commit changes back to store in real-time
    // Or keep as controlled read-only display (edits via PropertyPanel only)
  }}
/>
```

Note: If the textarea is intended for display only (editing through PropertyPanel is the primary flow), then `value` with a read-only appearance is still correct. If in-node editing is desired, wire the `onChange` to `updateNodeData`.

---

### WR-02: CanvasWrapper -- missing pointer capture can cause permanent drag lockout

**File:** `apps/web/src/components/CanvasWrapper.tsx:45-74`
**Issue:** The `handlePointerDown` handler sets `isPointerDownRef.current = true`, and `handlePointerUp` resets it to `false`. The `onChange` callback (line 28) skips commits when `isPointerDownRef.current` is true (the D-23 local-state-for-drag pattern). However, if the user's pointer leaves the wrapper `<div>` before releasing (e.g., a fast drag that exits the Excalidraw area), the `pointerup` event fires on whatever element is under the cursor at release time -- NOT on the wrapper div. The wrapper's `onPointerUp` never fires, leaving `isPointerDownRef` permanently `true`. All subsequent `onChange` calls are silently ignored, meaning canvas state stops being committed to the store.

```typescript
const handlePointerDown = useCallback(() => {
  isPointerDownRef.current = true   // set true here
  // ...
}, [])

const handlePointerUp = useCallback(() => {
  isPointerDownRef.current = false  // never called if pointerup outside wrapper
  // ...
}, [])
```

**Fix:** Listen for `pointerup` on `window` in a `useEffect`, or set pointer capture on the wrapper element. The simplest fix is a window-level event listener:

```typescript
useEffect(() => {
  const handleWindowPointerUp = () => {
    if (isPointerDownRef.current) {
      isPointerDownRef.current = false
      useCanvasStore.getState().setIsDragging(false)
      useHistoryStore.getState().setPaused(false)
      // ... trigger final commit
    }
  }
  window.addEventListener('pointerup', handleWindowPointerUp)
  return () => window.removeEventListener('pointerup', handleWindowPointerUp)
}, [])
```

Or use `setPointerCapture` on the wrapper ref during `onPointerDown`.

---

### WR-03: useAutoSave -- unhandled promise rejection from projectService.update

**File:** `apps/web/src/hooks/useAutoSave.ts:30-35`
**Issue:** The `save()` function calls `await projectService.update(pid, ...)` which wraps a Dexie `db.projects.update()` call. Dexie can reject for several reasons (IndexedDB quota exceeded, storage error, database version conflict). There is no try-catch or `.catch()` on the returned promise. If `update()` rejects, the rejection goes unhandled, which Node.js will treat as an `unhandledRejection` event. In browser contexts, this may surface as a console error and can crash in future ECMAScript versions which treat unhandled rejections as fatal.

```typescript
const save = async () => {
  // ...
  await projectService.update(pid, {  // <-- can throw, no error handling
    canvasState: canvasStr,
    viewport: JSON.stringify(canvasParsed.viewport),
    nodeGraph: graphStr,
  })
}
```

**Fix:** Add a try-catch to handle storage failures gracefully (e.g., log warning, surface to user via toast):

```typescript
const save = async () => {
  const pid = projectIdRef.current
  if (pid === null) return
  try {
    // ... existing logic
    await projectService.update(pid, { ... })
  } catch (err) {
    console.warn('[useAutoSave] Failed to persist project state:', err)
    // Roll back refs so next change triggers a retry
    lastSavedCanvasRef.current = ''
    lastSavedGraphRef.current = ''
  }
}
```

---

### WR-04: useAutoSave -- optimistic ref update without rollback on failure

**File:** `apps/web/src/hooks/useAutoSave.ts:27-28`
**Issue:** The `lastSavedCanvasRef` and `lastSavedGraphRef` are updated BEFORE the async `projectService.update()` call completes (lines 27-28). If the update fails (e.g., IndexedDB write error, quota exceeded), the refs still point to the "just saved" state. The guard at line 25 (`if (canvasStr === lastSavedCanvasRef.current && ...) return`) then prevents re-saving the same state on the next change, even though the write actually failed and the data was never persisted.

```typescript
lastSavedCanvasRef.current = canvasStr    // updated optimistically
lastSavedGraphRef.current = graphStr       // updated optimistically

await projectService.update(pid, { ... })  // this could fail
```

**Fix:** Move the ref updates after the async operation, or use the try-catch pattern from WR-03 to reset refs on failure:

```typescript
const save = async () => {
  // ... compute canvasStr, graphStr, canvasParsed
  try {
    await projectService.update(pid, { ... })
    lastSavedCanvasRef.current = canvasStr
    lastSavedGraphRef.current = graphStr
  } catch (err) {
    console.warn('[useAutoSave] Save failed:', err)
  }
}
```

This ensures the refs only reflect successfully persisted state.

## Info

### IN-01: Cross-package imports create circular dependency

**File:** `packages/node-editor/src/NodeEditorOverlay.tsx:61-65`
**Issue:** The `@ac-canvas/node-editor` package imports directly from `apps/web/src/stores/` and `apps/web/src/components/ui/` via relative paths:

```typescript
import { Dialog, ... } from '../../../apps/web/src/components/ui/dialog'
import { Button } from '../../../apps/web/src/components/ui/button'
import { useNodeGraphStore } from '../../../apps/web/src/stores/nodeGraphStore'
import { useCanvasStore } from '../../../apps/web/src/stores/canvasStore'
import { useHistoryStore } from '../../../apps/web/src/stores/historyStore'
```

This creates a package dependency cycle: `apps/web` -> `@ac-canvas/node-editor` -> `apps/web`. The node-editor package cannot be extracted, tested, or published independently. If the web app's store shapes or component interfaces change, the node-editor package silently breaks.

**Suggestion:** The node-editor should receive data through props/context or a defined interface, not by importing the consumer's internals. Options:
1. Define a `StoreProvider` context in `@ac-canvas/shared` that the web app provides to node-editor components
2. Pass store actions as props to `NodeEditorOverlay`
3. Extract the UI components (Dialog, Button) into a shared package

---

### IN-02: excalidrawRef typed as any

**File:** `apps/web/src/components/CanvasWrapper.tsx:12`
**Issue:** `excalidrawRef` is typed as `useRef<any>(null)`. The Excalidraw API object has a defined type from `@ac-canvas/excalidraw` (the vendored fork).

**Suggestion:** Import and use the Excalidraw API type:

```typescript
import type { ExcalidrawAPI } from '@ac-canvas/excalidraw'
const excalidrawRef = useRef<ExcalidrawAPI | null>(null)
```

This provides autocompletion and compile-time checks when calling API methods like `getSceneElements()` or `getAppState()`.

---

### IN-03: TemplateDialog import placed at bottom of file

**File:** `packages/node-editor/src/NodeEditorOverlay.tsx:515`
**Issue:** The `TemplateDialog` import is placed at line 515, at the bottom of the file, rather than at the top with other imports. The comment explains this is intentional ("at bottom to avoid issues with module resolution before TemplateDialog.tsx exists in Task 3"). While ES module hoisting makes this functionally correct, it's an unusual pattern that contradicts standard import conventions and should be cleaned up once both files coexist in the codebase.

**Suggestion:** Move the import to the top of the file alongside other imports:

```typescript
// Line ~55, alongside other imports
import { TemplateDialog } from './TemplateDialog'
```

---

### IN-04: Inconsistent deep-clone in historyStore captureSnapshot

**File:** `apps/web/src/stores/historyStore.ts:40-56`
**Issue:** The `captureSnapshot` function has two code paths:
- **Merge-window path** (lines 40-48): stores `canvas` and `nodeGraph` WITHOUT `structuredClone`. These are the return values of `serialize()`, which are shallow-cloned objects (nested arrays/objects share references with the store's current state).
- **Append path** (lines 52-66): wraps both in `structuredClone()` for a full deep copy.

```typescript
// Merge path (no structuredClone):
const canvas = useCanvasStore.getState().serialize()
const nodeGraph = useNodeGraphStore.getState().serialize()
set({ snapshots: state.snapshots.map(/* replace in-place */) })

// Append path (with structuredClone):
const snapshot: HistorySnapshot = {
  timestamp: now,
  canvas: structuredClone(useCanvasStore.getState().serialize()),
  nodeGraph: structuredClone(useNodeGraphStore.getState().serialize()),
}
```

While Immer's immutability guarantees prevent mutation of store state through these references, the inconsistency is confusing and could mask bugs if serialization ever returns references to mutable objects.

**Suggestion:** Apply `structuredClone` consistently in both paths, or remove it from both (the shallow clone from `serialize()` combined with Immer guarantees is sufficient).

---

### IN-05: TemplateDialog calls setTemplateDialogOpen redundantly

**File:** `packages/node-editor/src/NodeEditorOverlay.tsx:368`
**Issue:** The `handleTemplateSelect` callback calls `setTemplateDialogOpen(false)` at line 368. Separately, `TemplateDialog.handleSelect` (in `TemplateDialog.tsx:36`) calls both `onSelect(templateId)` and `onClose()`, where `onClose` is `() => setTemplateDialogOpen(false)`. This means `setTemplateDialogOpen(false)` is called twice per template selection. The double call is idempotent and harmless but indicates a coordination gap between the two components.

**Suggestion:** Remove the redundant `setTemplateDialogOpen(false)` from `handleTemplateSelect` and let the TemplateDialog's `onClose` callback handle it, or vice versa. Choose one owner for dialog visibility control.

---

_Reviewed: 2026-06-30T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
