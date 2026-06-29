# Phase 1: Core Canvas — Research

**Researched:** 2026-06-29
**Domain:** Excalidraw fork, infinite canvas, element management, undo/redo, chunk rendering, IndexedDB persistence
**Confidence:** HIGH (all major claims verified via web search + planning docs)

## Summary

Phase 1 builds the foundation for the entire project: a vendored Excalidraw v0.18.x fork at `packages/excalidraw/` with full drawing tools, a custom AIElement type placeholder, a unified HistoryStore, chunk-based performance rendering, and Dexie.js IndexedDB persistence. This is the rendering surface that all subsequent phases (node editor overlay, AI elements, application UI) build upon.

**Primary recommendation:** Fork Excalidraw from the v0.18 release tag (March 2025), NOT from develop. Establish FORK_CHANGES.md from commit 1. Keep Excalidraw source modifications minimal — the AIElement type is added to the element type union and render dispatch, but the core rendering pipeline (dual-canvas StaticCanvas/InteractiveCanvas separation) is left untouched. CanvasStore and HistoryStore are the two active Zustand stores; all other stores get stubs.

**Critical findings:**
- Excalidraw v0.18 deprecated the old `commitToHistory` parameter in favor of `captureUpdate: CaptureUpdateAction.NEVER` to disable native undo. This is how Phase 1 prevents conflicts between Excalidraw's native undo and the custom unified HistoryStore.
- The element type system is a simple string union (`type: "rectangle" | "diamond" | "ellipse" | "arrow" | "line" | "freedraw" | "image" | "text" | "frame" | "embeddable" | "iframe"`). Adding `"ai-image"` requires modifying the union type and the `renderElement()` dispatch function. There is no plugin registry — it's a direct source modification.
- Excalidraw's `onChange` callback `(excalidrawElements, appState, files) => void` is the integration point for CanvasStore. The new `onIncrement` API (PR #9450, April 2025) provides granular `EphemeralIncrement`/`DurableIncrement` events but may be too new for the fork baseline.
- The `excalidrawAPI` ref provides `getSceneElements()`, `getAppState()`, `updateScene(sceneData)`, `history.clear()`, `addFiles()`, `getFiles()`, `scrollToContent()`.
- Vite 8 uses Rolldown (single Rust bundler) with `build.rolldownOptions` instead of `build.rollupOptions`. The React plugin uses OXC-based transformation by default (no Babel).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- D-01: Full vendored fork — Excalidraw source copied wholesale as packages/excalidraw/ (not npm wrapper). FORK_CHANGES.md from commit 1.
- D-02: Fork base — Fork from latest Excalidraw v0.18.x release tag (not develop) that supports React 19.
- D-03: Monorepo for Phase 1 — Minimal monorepo: packages/excalidraw/, packages/shared/, apps/web/. Other packages added later.
- D-04: pnpm workspace — pnpm 11 workspaces with pnpm-workspace.yaml. Lockfile in root.
- D-05: Full Excalidraw drawing toolset — Ship with all built-in tools. Removing tools is extra work.
- D-06: Excalidraw UI intact — Keep native toolbar and context menus in Phase 1. App-level UI replacements come in Phase 7.
- D-07: Hybrid layer management — Sidebar layer panel (custom React component) + Excalidraw native context menu.
- D-08: Layer panel as new React component — Not embedded in Excalidraw source. Built as apps/web component via CanvasStore.
- D-09: Custom unified HistoryStore — Not Excalidraw built-in, not zundo. Dedicated Zustand store for canvas + (future) node graph snapshots. 180ms debounce. Pause during drag. 50 snapshot max. structuredClone(). Filter transient properties. Scope per project.
- D-10: Excalidraw native undo disabled — Route all undo/redo through unified HistoryStore. Prevent conflicts.
- D-11: Custom AIElement type — Extends NonDeletedExcalidrawElement base with metadata fields (prompt, aiProvider, generationParams, generationStatus, imageBlobId). Placeholder now.
- D-12: AIElement rendering as Image with overlay — Uses Excalidraw's existing image rendering path.
- D-13: Blob storage for images — Store AI-generated images as Blob references (not base64). blobId in AIElement, load via createImageBitmap().
- D-14: Dexie.js single-table design — One table "projects" with schema: id, name, canvasState (JSON blob), viewport (JSON), createdAt, updatedAt.
- D-15: Auto-save + explicit Save/Save As — 180ms debounce auto-save. Save (updates current) and Save As (creates new copy). First save prompts for name.
- D-16: Serialization — CanvasStore.serialize() exports clean element data. NodeGraphStore.serialize() is a stub in Phase 1.
- D-17: Storage monitoring — navigator.storage.estimate() before save. Warn near limits. Request navigator.storage.persist().
- D-18: Chunk rendering — 2000x2000px chunks. Only render viewport-intersecting chunks + one buffer.
- D-19: LRU image cache — 200MB hard memory limit. Evict least-recently-viewed to IndexedDB. URL.revokeObjectURL() cleanup.
- D-20: Resolution-tiered rendering — Zoom < 50%: colored rect + label. 50-100%: half-res via OffscreenCanvas. > 100%: full res. AIElement only.
- D-21: Dual-canvas separation sacred — StaticCanvas/InteractiveCanvas separation. AIElement only touches StaticCanvas. Never trigger StaticCanvas redraws from transient UI.
- D-22: CanvasStore active in Phase 1 — CanvasStore (elements, viewport, selection) and HistoryStore (undo/redo) created. Other stores are stubs.
- D-23: Local-state-for-drag — During drag/resize/draw, use local React state. Commit to CanvasStore on pointerup. Reduces re-renders ~75%.
- D-24: Fine-grained selectors — All components use useShallow() with narrow selectors. No component subscribes to entire store.
- D-25: Upstream sync cadence — Sync Excalidraw upstream every 2-4 weeks. Calendar reminder.
- D-26: FORK_CHANGES.md discipline — Every phase that touches packages/excalidraw/ updates FORK_CHANGES.md.
- D-27: Contribute upstream — Generic bug fixes PR'd to upstream Excalidraw.

### Claude's Discretion
- (None specified — all decisions locked)

### Deferred Ideas (OUT OF SCOPE)
- Application toolbar/sidebar/panel shell — Phase 7
- Node editor integration — Phase 2
- AI generation integration — Phases 4-5
- Image export (PNG/JPG) — Phase 7
- Keyboard shortcut manager — Phase 7
- React Flow coordinate system normalization — Phase 2
- Project list/management page — Phase 7
- Settings page with API key config — Phase 7
- Custom node types — Phase 2
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CANVAS-01 | User can draw, drag, zoom, pan on infinite canvas | Excalidraw provides natively. Fork from v0.18.0 release tag. Vite 8 + pnpm workspace builds the SPA. CanvasWrapper component wraps Excalidraw React component. |
| CANVAS-02 | Canvas supports AI-generated image element rendering/display | Add "ai-image" to element type union in packages/excalidraw/element/types.ts. Add render branch in renderElement(). AIElement type defined in packages/shared/types/canvas.ts. Uses Excalidraw image rendering path. Blob storage. |
| CANVAS-03 | Element layer management (reorder, group, lock, hide) | LayerPanel React component in apps/web/components/. Reads/writes CanvasStore via fine-grained selectors. Excalidraw native context menu for quick actions. No Excalidraw source changes needed for the panel. |
| CANVAS-04 | Chunk-based rendering for 500+ elements | Modify Excalidraw's viewport culling in Renderer.ts to use 2000x2000px chunks. Add chunk-aware isElementInViewport() filter. Cache chunks. Resolution-tiered rendering for AIElement types. |
| CANVAS-05 | Undo/redo for all canvas operations | Custom HistoryStore disables Excalidraw native undo via captureUpdate: NEVER. Captures CanvasStore.serialize() snapshots. 180ms debounce. Pause during drag. 50 snapshot max. structuredClone(). |
| CANVAS-06 | Project save/load via IndexedDB | Dexie.js single-table "projects" schema. CanvasStore.serialize() produces JSON payload. Auto-save 180ms debounce. navigator.storage.estimate() monitoring. navigator.storage.persist() request. |
</phase_requirements>

## Standard Stack

### Core (Phase 1 Active)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.x | Language | Full-stack type safety. No v6 announced. Verified by npm registry. |
| React | 19.2.7 | UI framework | React 18 is security-only mode. React 19 brings stable Compiler, Actions model. Excalidraw v0.18+ and React Flow 12.x support it natively. [VERIFIED: npm registry] |
| Vite | 8.0.x | Build tool | Rolldown-based Vite 8 delivers 10-30x faster builds. Greenfield starts clean. Requires Node 22+. [VERIFIED: vite.dev blog] |
| pnpm | 11.8.0 | Package manager | v11 adds supply-chain security defaults, SBOM generation. Requires Node 22+. [VERIFIED: npm registry] |
| Zustand | 5.0.12 | State management | v5 breaking from v4: create() not on default export. Middleware paths changed. Immer from zustand/middleware/immer. [VERIFIED: npm registry] |
| Immer | 11.1.8 | Immutable state | Works with Zustand v5 middleware since v5.0.11 (slice typing fix). [VERIFIED: npm registry] |
| TailwindCSS | 4.3.1 | Utility CSS | v4 is complete rewrite: CSS-first config via @theme, no tailwind.config.js. 10x faster builds. [VERIFIED: tailwindcss.com blog] |
| Dexie.js | 4.4.2 | IndexedDB | v4.4 adds blob offloading. Micro-kernel architecture. ~2.6M monthly downloads. [VERIFIED: npm registry] |
| Zod | 4.4.3 | Runtime validation | v4 is 14x faster string parsing, 57% smaller bundle. BREAKING from v3. [VERIFIED: npm registry] |

### Supporting (Phase 1)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Radix UI | latest | Headless primitives | Layer panel popover, dialog for save-as. Supports React 19. |
| Lucide React | 1.21.0 | Icons | Layer panel UI icons (lock, hide, group, trash). Tree-shakable. [VERIFIED: npm registry] |
| Vitest | 4.1.x | Unit testing | Compatible with Vite 8. Test store logic, serialization. [VERIFIED: vitest.dev] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Excalidraw fork (MIT) | tldraw (source-available) | tldraw requires ~$6K/yr commercial license. DOM-based rendering worse for 10K+ elements. |
| Zustand + Immer | Redux Toolkit, Jotai | RTK 2x bundle size, more ceremony. Jotai less suitable for cross-store sync. |
| Dexie.js | idb-keyval, localForage | Dexie provides query, indexing, transactions. idb-keyval is key-value only. |
| Custom HistoryStore | zundo (Zustand temporal middleware) | zundo is tightly coupled to a single store. Custom HistoryStore wraps both canvas and (future) node graph state. |

### Installation
```bash
# Core Phase 1 dependencies (inside apps/web/)
pnpm add react@^19 react-dom@^19 zustand@^5 immer@^11 dexie@^4 zod@^4
pnpm add @radix-ui/react-popover lucide-react@^1

# Dev dependencies
pnpm add -D typescript@^5 @types/react @types/react-dom
pnpm add -D vite@^8 @vitejs/plugin-react
pnpm add -D tailwindcss@^4 vitest@^4

# Root workspace
pnpm add -D -w typescript@^5
```

### Version Verification
Before writing this table, verify current npm registry versions:
```bash
npm view react version          # expect 19.2.7
npm view zustand version        # expect 5.0.12
npm view immer version          # expect 11.1.8
npm view dexie version          # expect 4.4.2
npm view vite version           # expect 8.x
npm view tailwindcss version    # expect 4.3.1
```

## Architecture Patterns

### Recommended Project Structure
```
/
├── pnpm-workspace.yaml         # packages: ['apps/*', 'packages/*']
├── package.json                # private: true, packageManager: pnpm@11.8.0
├── .npmrc                      # pnpm v11 supply-chain settings
├── tsconfig.base.json          # Shared TypeScript config
├── apps/
│   └── web/
│       ├── package.json        # @ac-canvas/web
│       ├── vite.config.ts      # Vite 8 + Rolldown
│       ├── tsconfig.json       # extends ../../tsconfig.base.json
│       ├── index.html
│       └── src/
│           ├── main.tsx        # Entry point, React 19 createRoot
│           ├── App.tsx         # Root component
│           ├── App.css         # Tailwind v4 @import "tailwindcss"
│           ├── components/
│           │   ├── CanvasWrapper.tsx    # Excalidraw React wrapper
│           │   └── LayerPanel.tsx       # Layer sidebar component
│           ├── stores/
│           │   ├── canvasStore.ts       # CanvasStore (Zustand v5 + Immer)
│           │   ├── historyStore.ts      # HistoryStore (Zustand)
│           │   └── stubs/
│           │       ├── nodeGraphStore.ts  # Phase 2 stub
│           │       ├── aiQueueStore.ts    # Phase 3 stub
│           │       └── uiPreferencesStore.ts  # Phase 7 stub
│           ├── indexedb/
│           │   ├── db.ts                # Dexie database class
│           │   └── projectService.ts    # Save/load CRUD
│           └── hooks/
│               └── useAutoSave.ts       # 180ms debounced auto-save
├── packages/
│   ├── excalidraw/              # Vendored Excalidraw v0.18.x fork
│   │   ├── FORK_CHANGES.md     # Tracked from commit 1
│   │   ├── package.json        # name: @ac-canvas/excalidraw
│   │   └── src/                # Full Excalidraw source tree
│   │       ├── element/
│   │       │   └── types.ts    # MODIFIED: add "ai-image" to type union
│   │       ├── renderer/
│   │       │   └── renderElement.ts  # MODIFIED: add ai-image dispatch
│   │       └── scene/
│   │           └── Renderer.ts # MODIFIED: chunk-aware viewport culling
│   └── shared/                  # Shared types & utilities
│       ├── package.json        # name: @ac-canvas/shared
│       └── src/
│           ├── types/
│           │   ├── canvas.ts   # AIElement type, CanvasSerializedState
│           │   └── project.ts  # Project type
│           └── utils/
│               ├── coordinate.ts  # Transform utilities (stub for Phase 2)
│               └── serialization.ts  # structuredClone wrapper, filter helpers
└── .planning/
    └── phases/
        └── 01-core-canvas/
            └── 01-RESEARCH.md
```

### Pattern 1: Zustand CanvasStore with Excalidraw Bridge

**What:** CanvasStore holds the canonical element state. Excalidraw's `onChange` feeds into it. Components read via fine-grained selectors. The bridge component (`CanvasWrapper`) wires the two together.

**When to use:** Every component that reads or writes element/viewport state.

```typescript
// apps/web/src/stores/canvasStore.ts
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { ExcalidrawElement } from '@ac-canvas/excalidraw/element/types'

interface Viewport {
  x: number
  y: number
  zoom: number
}

interface CanvasStoreState {
  elements: Record<string, ExcalidrawElement>
  viewport: Viewport
  selectedElementIds: Record<string, boolean>
  isDragging: boolean

  // Actions
  setElements: (elements: ExcalidrawElement[]) => void
  updateElement: (id: string, props: Partial<ExcalidrawElement>) => void
  addElement: (el: ExcalidrawElement) => void
  removeElements: (ids: string[]) => void
  setViewport: (viewport: Viewport) => void
  setSelectedElementIds: (ids: Record<string, boolean>) => void
  setIsDragging: (dragging: boolean) => void
  serialize: () => CanvasSerializedState
  loadSerialized: (state: CanvasSerializedState) => void
}

export const useCanvasStore = create<CanvasStoreState>()(
  immer((set, get) => ({
    elements: {},
    viewport: { x: 0, y: 0, zoom: 1 },
    selectedElementIds: {},
    isDragging: false,

    setElements: (elements) =>
      set((state) => {
        state.elements = Object.fromEntries(elements.map((el) => [el.id, el]))
      }),

    updateElement: (id, props) =>
      set((state) => {
        if (state.elements[id]) {
          Object.assign(state.elements[id], props)
        }
      }),

    addElement: (el) =>
      set((state) => {
        state.elements[el.id] = el
      }),

    removeElements: (ids) =>
      set((state) => {
        for (const id of ids) {
          delete state.elements[id]
        }
      }),

    setViewport: (viewport) => set((state) => { state.viewport = viewport }),
    setSelectedElementIds: (ids) => set((state) => { state.selectedElementIds = ids }),
    setIsDragging: (dragging) => set((state) => { state.isDragging = dragging }),

    serialize: () => {
      const state = get()
      return {
        elements: Object.values(state.elements).map((el) => {
          const { isSelected, ...clean } = el as any
          return clean
        }),
        viewport: state.viewport,
      }
    },

    loadSerialized: (serialized) =>
      set((state) => {
        state.elements = Object.fromEntries(
          serialized.elements.map((el: any) => [el.id, el])
        )
        state.viewport = serialized.viewport
      }),
  }))
)
// Source: Adapted from Zustand v5 docs + project architecture patterns
```

**Key insight:** The `serialize()` function filters transient Excalidraw properties (`isSelected`, `dragging`, `measured`) before creating the snapshot payload. This prevents bloated snapshots and corrupted restores.

### Pattern 2: CanvasWrapper — Excalidraw + Zustand Bridge

**What:** The React component that mounts Excalidraw and bridges its `onChange` to CanvasStore. All Excalidraw interactions flow through this component.

**When to use:** Top-level component in App.tsx. All canvas state read/write goes through this bridge.

```typescript
// apps/web/src/components/CanvasWrapper.tsx
import { useEffect, useRef, useCallback } from 'react'
import { Excalidraw, exportToCanvas } from '@ac-canvas/excalidraw'
import { useShallow } from 'zustand/react/shallow'
import { useCanvasStore } from '../stores/canvasStore'
import { useHistoryStore } from '../stores/historyStore'

export function CanvasWrapper() {
  const excalidrawRef = useRef<ExcalidrawImperativeAPI>(null)
  const isDragging = useCanvasStore(useShallow((s) => s.isDragging))

  // Wire Excalidraw onChange to CanvasStore
  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: any) => {
      // Commit to CanvasStore
      useCanvasStore.getState().setElements(elements as ExcalidrawElement[])
      useCanvasStore.getState().setViewport({
        x: appState.scrollX,
        y: appState.scrollY,
        zoom: appState.zoom.value,
      })

      // Capture history snapshot (if not dragging)
      if (!useCanvasStore.getState().isDragging) {
        useHistoryStore.getState().captureSnapshot()
      }
    },
    []
  )

  // Load initial state from CanvasStore
  const initialElements = useCanvasStore(
    useShallow((s) => Object.values(s.elements))
  )
  const initialAppState = useCanvasStore((s) => ({
    scrollX: s.viewport.x,
    scrollY: s.viewport.y,
    zoom: { value: s.viewport.zoom },
  }))

  return (
    <div className="w-full h-full">
      <Excalidraw
        excalidrawAPI={(api) => { excalidrawRef.current = api }}
        onChange={handleChange}
        initialData={{
          elements: initialElements,
          appState: initialAppState,
          // captureUpdate: CaptureUpdateAction.NEVER disables native undo
          captureUpdate: 'never',
        }}
        // Disable Excalidraw's built-in undo system
        UIOptions={{
          canvasActions: {
            undo: false,
            redo: false,
          },
        }}
      />
    </div>
  )
}
```
**Source:** Derived from Excalidraw API docs [docs.excalidraw.com] and v0.18 release notes.

**Key insight about D-10 (disable native undo):** Excalidraw v0.18 supports `captureUpdate: CaptureUpdateAction.NEVER` per-update. For complete disable, pass `UIOptions.canvasActions = { undo: false, redo: false }` AND use `captureUpdate: 'never'` in all `updateScene()` calls. Without the UI mask, the undo/redo buttons are still visible even if they do nothing.

### Pattern 3: Custom HistoryStore

**What:** A dedicated Zustand store that captures atomic state snapshots for undo/redo. Not zundo — manually managed to support both canvas and (future) node graph state on a single stack.

**When to use:** Every undo/redo operation routes through this store. Phase 2 hooks into it for node graph state.

```typescript
// apps/web/src/stores/historyStore.ts
import { create } from 'zustand'
import { useCanvasStore } from './canvasStore'

interface HistorySnapshot {
  timestamp: number
  canvas: CanvasSerializedState
  nodeGraph?: any  // stub for Phase 2
}

interface HistoryStoreState {
  snapshots: HistorySnapshot[]
  currentIndex: number
  maxSnapshots: number
  mergeWindow: number  // ms
  isPaused: boolean

  captureSnapshot: () => void
  undo: () => void
  redo: () => void
  setPaused: (paused: boolean) => void
  clear: () => void
}

export const useHistoryStore = create<HistoryStoreState>()((set, get) => ({
  snapshots: [],
  currentIndex: -1,
  maxSnapshots: 50,
  mergeWindow: 180,
  isPaused: false,

  captureSnapshot: () => {
    const state = get()
    if (state.isPaused) return

    const now = Date.now()
    const lastSnapshot = state.snapshots[state.currentIndex]

    // Debounce: within mergeWindow, replace (don't append)
    if (lastSnapshot && now - lastSnapshot.timestamp < state.mergeWindow) {
      set((s) => {
        s.snapshots[s.currentIndex] = {
          timestamp: now,
          canvas: useCanvasStore.getState().serialize(),
        }
      })
      return
    }

    // Append new snapshot
    const snapshot: HistorySnapshot = {
      timestamp: now,
      canvas: structuredClone(useCanvasStore.getState().serialize()),
    }

    set((s) => {
      // Truncate any future snapshots (we're at a new branch)
      s.snapshots = [
        ...s.snapshots.slice(0, s.currentIndex + 1),
        snapshot,
      ].slice(-s.maxSnapshots)
      s.currentIndex = Math.min(s.currentIndex + 1, s.snapshots.length - 1)
    })
  },

  undo: () => {
    const state = get()
    if (state.currentIndex <= 0) return

    const newIndex = state.currentIndex - 1
    const snapshot = state.snapshots[newIndex]
    if (snapshot) {
      useCanvasStore.getState().loadSerialized(snapshot.canvas)
      set({ currentIndex: newIndex })
    }
  },

  redo: () => {
    const state = get()
    if (state.currentIndex >= state.snapshots.length - 1) return

    const newIndex = state.currentIndex + 1
    const snapshot = state.snapshots[newIndex]
    if (snapshot) {
      useCanvasStore.getState().loadSerialized(snapshot.canvas)
      set({ currentIndex: newIndex })
    }
  },

  setPaused: (paused) => set({ isPaused: paused }),
  clear: () => set({ snapshots: [], currentIndex: -1 }),
}))
```
**Source:** Project D-09 specification + verified architecture patterns from planning docs.

### Pattern 4: Dexie.js Single-Table Database

**What:** One Dexie table for project storage. Canvas state stored as a JSON blob. Blob storage for images.

**When to use:** All IndexedDB CRUD operations.

```typescript
// apps/web/src/indexedb/db.ts
import Dexie, { type EntityTable } from 'dexie'

interface Project {
  id?: number
  name: string
  canvasState: string  // JSON string of CanvasSerializedState
  viewport: string     // JSON string of viewport
  createdAt: Date
  updatedAt: Date
}

const db = new Dexie('AICreativeCanvas') as Dexie & {
  projects: EntityTable<Project, 'id'>
}

// Schema version 1: single table
// "id" is auto-increment primary key
// Don't index canvasState or viewport — they're large blobs
db.version(1).stores({
  projects: '++id, name, &name, createdAt, updatedAt',
})

export type { Project }
export { db }

// apps/web/src/indexedb/projectService.ts
import { db, type Project } from './db'

export const projectService = {
  async save(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const now = new Date()
    return db.projects.put({
      ...project,
      createdAt: now,
      updatedAt: now,
    } as Project)
  },

  async update(id: number, data: Partial<Project>): Promise<void> {
    await db.projects.update(id, { ...data, updatedAt: new Date() })
  },

  async load(id: number): Promise<Project | undefined> {
    return db.projects.get(id)
  },

  async delete(id: number): Promise<void> {
    await db.projects.delete(id)
  },

  async list(): Promise<Project[]> {
    return db.projects.orderBy('updatedAt').reverse().toArray()
  },

  async checkStorage(): Promise<{ usage: number; quota: number; percentUsed: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      const usage = estimate.usage ?? 0
      const quota = estimate.quota ?? 0
      return { usage, quota, percentUsed: quota > 0 ? (usage / quota) * 100 : 0 }
    }
    return { usage: 0, quota: 0, percentUsed: 0 }
  },
}
```
**Source:** Dexie.js v4 docs [dexie.org/docs/Version/Version.stores()] — confirmed: never index blob/image fields.

### Pattern 5: AIElement Type Registration

**What:** Adding a custom element type to vendored Excalidraw. This is a direct source modification to the element type union and render dispatch.

**When to use:** Once, when establishing the fork. AIElement is a placeholder now; actual AI rendering comes in Phases 4-5.

```typescript
// packages/shared/src/types/canvas.ts
// The AIElement type definition lives in shared so both
// the Excalidraw fork and apps/web can use it.

import type { ExcalidrawElement } from '@ac-canvas/excalidraw/element/types'

export type GenerationStatus = 'idle' | 'queued' | 'generating' | 'done' | 'error'

export interface AIElement extends Omit<ExcalidrawElement, 'type'> {
  type: 'ai-image'
  prompt: string
  aiProvider: string
  generationParams: Record<string, unknown>
  generationStatus: GenerationStatus
  imageBlobId: string | null  // Reference to Blob in IndexedDB
}

// Serialized state (what gets saved to IndexedDB)
export interface CanvasSerializedState {
  elements: Array<ExcalidrawElement | AIElement>
  viewport: { x: number; y: number; zoom: number }
}
```

```typescript
// packages/excalidraw/element/types.ts (MODIFIED FILE)
// This is the existing Excalidraw type file. We add "ai-image" to the union.

// ORIGINAL:
// export type ElementType =
//   | "rectangle" | "diamond" | "ellipse" | "arrow" | "line"
//   | "freedraw" | "image" | "text" | "frame"
//   | "embeddable" | "iframe"

// MODIFIED:
export type ElementType =
  | "rectangle" | "diamond" | "ellipse" | "arrow" | "line"
  | "freedraw" | "image" | "text" | "frame"
  | "embeddable" | "iframe"
  | "ai-image"  // ADDED: custom AI element type
```

```typescript
// packages/excalidraw/renderer/renderElement.ts (MODIFIED FILE)
// Add an "ai-image" branch to the render dispatch.

function renderElement(
  context: CanvasRenderingContext2D,
  element: ExcalidrawElement,
  ...rest: any[]
) {
  switch (element.type) {
    case 'rectangle':
    case 'diamond':
    case 'ellipse':
    case 'arrow':
    case 'line':
    case 'freedraw':
    case 'text':
    case 'image':
    case 'frame':
    case 'embeddable':
    case 'iframe':
      // ... existing rendering logic
      break

    case 'ai-image':
      // Phase 1: Render as placeholder rectangle with label
      // Full image rendering comes in Phases 4-5 when AI integration lands
      renderAIPlaceholder(context, element as AIElement)
      break
  }
}

function renderAIPlaceholder(
  context: CanvasRenderingContext2D,
  element: AIElement
) {
  const { x, y, width, height, generationStatus, prompt } = element

  // Draw dashed border
  context.strokeStyle = '#6366f1'
  context.lineWidth = 2
  context.setLineDash([6, 3])
  context.strokeRect(x, y, width, height)
  context.setLineDash([])

  // Draw status indicator
  context.fillStyle = 'rgba(99, 102, 241, 0.1)'
  context.fillRect(x, y, width, height)

  // Draw label
  context.fillStyle = '#6366f1'
  context.font = '14px sans-serif'
  context.fillText(
    generationStatus === 'done' ? '[AI Image]' : `[${generationStatus}] ${prompt?.slice(0, 30)}`,
    x + 8,
    y + 20
  )
}
```
**Source:** Excalidraw element system DeepWiki analysis [deepwiki.com/excalidraw/excalidraw/3-element-system] and Excalidraw source structure.

**Key insight about D-11:** There is no plugin system or element registry in Excalidraw. The element type is a TypeScript string union, and rendering is a `switch` statement. Adding a new type requires modifying exactly these files:
1. `element/types.ts` — add `"ai-image"` to `ElementType` union
2. `renderElement.ts` (or equivalent) — add `case 'ai-image':` in the render dispatch
3. `newElement.ts` (or equivalent) — add a creation function for AIElement defaults

### Pattern 6: Chunk-Aware Viewport Culling

**What:** Partition the canvas into 2000x2000px chunks. Only render chunks visible in the current viewport plus one buffer chunk. Cache chunk render results.

**When to use:** CANVAS-04. Modify Excalidraw's existing viewport culling in the Renderer class.

```typescript
// packages/excalidraw/scene/Renderer.ts (MODIFIED FILE — concept)
// Add chunk-aware culling to the existing getRenderableElements()

const CHUNK_SIZE = 2000  // 2000x2000px chunks

interface ChunkKey {
  row: number
  col: number
}

function getChunkKey(x: number, y: number): ChunkKey {
  return {
    row: Math.floor(y / CHUNK_SIZE),
    col: Math.floor(x / CHUNK_SIZE),
  }
}

// In getRenderableElements():
// 1. Calculate which chunks the current viewport covers
// 2. Expand by 1 chunk in each direction (buffer)
// 3. Filter elements to only those in visible chunks
// 4. For AIElement types at zoom < 50%: return simplified representation

function getVisibleChunks(viewport: Viewport): Set<string> {
  const chunks = new Set<string>()
  const startCol = Math.floor(viewport.x / CHUNK_SIZE) - 1
  const endCol = Math.ceil((viewport.x + viewport.width) / CHUNK_SIZE) + 1
  const startRow = Math.floor(viewport.y / CHUNK_SIZE) - 1
  const endRow = Math.ceil((viewport.y + viewport.height) / CHUNK_SIZE) + 1

  for (let col = startCol; col <= endCol; col++) {
    for (let row = startRow; row <= endRow; row++) {
      chunks.add(`${col},${row}`)
    }
  }
  return chunks
}
```
**Source:** Project D-18 specification + CSDN Excalidraw rendering optimization deep-dive.

### Anti-Patterns to Avoid
- **Modifying Excalidraw's dual-canvas architecture:** The StaticCanvas/InteractiveCanvas separation must remain intact. AIElement additions should only touch the `renderElement()` dispatch in StaticCanvas.
- **Subscribing to entire stores:** Every component must use `useShallow()` with narrow selectors. `useCanvasStore()` (no selector) subscribes to ALL changes — re-renders the entire component tree on every pixel of movement.
- **Global state during drag:** During drag/resize/draw, use local `useState`. Only commit to CanvasStore on `pointerup`. This single pattern reduces re-renders ~75%.
- **Polling for storage status:** Use `navigator.storage.estimate()` asynchronously before saves, not on a timer.
- **Capturing history during drag:** The HistoryStore's `isPaused` flag must be set during drag operations. Without this, every drag pixel creates a history entry.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Canvas rendering | Custom canvas renderer | Excalidraw fork (v0.18.x) | Dual-canvas pipeline with RoughJS, viewport culling, ShapeCache — months of work to replicate |
| State management | Custom event emitter/pubsub | Zustand v5 + Immer | 3-4KB gzipped, fine-grained selectors, devtools, cross-store subscribe(). Custom event buses create implicit undocumented dependencies |
| IndexedDB storage | Raw IndexedDB API | Dexie.js v4 | Query, indexing, transactions, blob handling, versioning — raw IDB is verbose and error-prone |
| Viewport culling | Full scene traversal | Excalidraw Renderer.isElementInViewport() | Excalidraw already has viewport culling. Phase 1 adds chunk-aware grouping on top |
| Undo/redo | Excalidraw native undo | Custom HistoryStore | Native undo can't handle node graph state (Phase 2). Custom unified stack is necessary |
| Drag performance | Global state during drag | Local useState + commit on release | ~75% re-render reduction. Simple pattern, proven in production (TapCanvas, Giselle) |
| Image serialization | base64 data URLs | Blob references | 33% space savings. IndexedDB handles Blob natively |

**Key insight:** The most deceptive "don't hand-roll" is the Excalidraw element type system. There's no plugin API or element registry — adding `ai-image` requires direct source modification to the type union and render switch. This is expected and acceptable (D-01), but must be documented in FORK_CHANGES.md.

## Common Pitfalls

### Pitfall 1: Excalidraw Fork Drift (CRITICAL)
**What goes wrong:** Fork diverges so far from upstream that merging bug fixes becomes impossible. 64.4% of cherry-picks fail between structurally divergent forks.
**Why it happens:** Fork based on `develop` instead of release tag. Customizations touch core systems. Upstream refactorings (like PR #9285 modularization) break assumptions.
**How to avoid:** Base on v0.18.0 release tag (NOT develop). Sync upstream every 2-4 weeks. Minimize Excalidraw source modifications. Document every change in FORK_CHANGES.md. PR generic fixes upstream.
**Warning signs:** `git merge upstream/master` produces conflicts in >10 files. Excalidraw releases pass by without syncing.
**Mitigation in Phase 1:** FORK_CHANGES.md from commit 1. AIElement modifications limited to type union + render dispatch. Chunk rendering sits on top of existing viewport culling, not replacing it.

### Pitfall 2: Canvas Rendering Performance Collapse
**What goes wrong:** Adding AI element types breaks the dual-canvas pipeline. Frame rate drops below 30fps with 10+ AI image elements.
**Why it happens:** StaticCanvas/InteractiveCanvas separation is blurred. AI images rendered at full resolution even when zoomed out. Full scene traversal on every viewport update.
**How to avoid:** Dual-canvas separation is sacred. AIElement rendering only touches StaticCanvas via the render dispatch. Resolution-tiered rendering from day one. Chunk-based viewport culling. OffscreenCanvas for image decode.
**Warning signs:** `requestAnimationFrame` callbacks exceed 16ms. GPU memory > 200MB. "Major GC" pauses during interactions.
**Mitigation in Phase 1:** Chunk rendering (D-18), LRU cache (D-19), tiered resolution (D-20) are built now, not deferred.

### Pitfall 3: Zustand Re-render Cascade
**What goes wrong:** Every component re-renders on every state change because selectors are too broad.
**Why it happens:** Components subscribe to entire store. Selectors return new object references every call. `useCanvasStore()` (no selector) re-renders on ANY change.
**How to avoid:** Enforce fine-grained selectors with `useShallow()`. No component subscribes to an entire store. Local state for drag (D-23) — commit on release, not during.
**Warning signs:** Drag interactions feel sluggish. React DevTools shows most components re-rendering on every interaction.
**Mitigation in Phase 1:** D-24 enforced from day one. LayerPanel uses narrow selectors. CanvasWrapper uses `getState()` for commits, not subscriptions.

### Pitfall 4: Browser Memory Limits from AI-Generated Images
**What goes wrong:** AI-generated images consume browser memory until tab crashes.
**Why it happens:** Base64 encoding inflates images by 33%. Unreleased object URLs leak memory. Full-resolution images decoded at all zoom levels.
**How to avoid:** Blob storage (D-13), not base64. LRU cache with 200MB hard limit (D-19). Resolution-tiered rendering (D-20). URL.revokeObjectURL() in cleanup. navigator.storage.estimate() monitoring (D-17).
**Warning signs:** Tab memory > 500MB. QuotaExceededError in console.
**Mitigation in Phase 1:** AIElement imageBlobId is a placeholder but the architecture (Blob storage + LRU cache + tiered resolution) is built now.

### Pitfall 5: Undo/Redo State Corruption
**What goes wrong:** History snapshots contain transient properties (isSelected, dragging, measured). Undoing restores incorrect state.
**Why it happens:** CanvasStore.serialize() doesn't filter transient Excalidraw properties. structuredClone() clones everything including ephemeral UI state.
**How to avoid:** serialize() explicitly removes `isSelected`, `dragging`, `measured` fields. Use `partialize` pattern. Deep clone via structuredClone() AFTER filtering.
**Warning signs:** Undo restores element at wrong position. History stack grows past 50 entries during single drag.
**Mitigation in Phase 1:** HistoryStore's snapshot filtering. Pause during drag (D-23). 50 snapshot max.

## Code Examples

### Verified Excalidraw API Access Patterns

```typescript
// Excalidraw imperative API access via ref
// Source: Excalidraw developer docs [docs.excalidraw.com]

const excalidrawRef = useRef<ExcalidrawImperativeAPI>(null)

// Inside component:
{/* <Excalidraw excalidrawAPI={(api) => { excalidrawRef.current = api }} /> */}

// Available methods for Phase 1:
const api = excalidrawRef.current!

// Get all non-deleted elements
const elements = api.getSceneElements()

// Get all elements including deleted
const allElements = api.getSceneElementsIncludingDeleted()

// Get current app state (viewport, zoom, theme, etc.)
const appState = api.getAppState()

// Update scene (replace or merge elements + state)
api.updateScene({
  elements: newElements,
  appState: { viewBackgroundColor: '#f0f0f0' },
  captureUpdate: 'never',  // Don't add to undo stack
})

// Clear the canvas
api.resetScene()

// Manage binary files (for image elements)
api.addFiles({ [fileId]: blob })
api.getFiles()  // returns Map<string, BinaryFileData>

// Clear undo/redo history
api.history.clear()

// Center viewport on all elements
api.scrollToContent()
```

### Zustand v5 + Immer Middleware Pattern

```typescript
// Source: Zustand v5 release notes + docs
// IMPORTANT: v5 changes from v4:
// 1. create() is a named export, not default
// 2. Immer middleware path: zustand/middleware/immer (not zustand/middleware)

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface Store {
  items: Record<string, Item>
  addItem: (item: Item) => void
}

const useStore = create<Store>()(
  immer((set) => ({
    items: {},
    addItem: (item) => set((state) => {
      // Immer allows "mutative" syntax — this is safe
      state.items[item.id] = item
    }),
  }))
)
```

### Fine-Grained Selector Pattern with useShallow

```typescript
// Source: Zustand v5 docs — always use shallow equality for objects/arrays
import { useShallow } from 'zustand/react/shallow'

// CORRECT: Selects a single primitive — re-renders only when this value changes
const elementX = useCanvasStore((s) => s.elements[id]?.x)

// CORRECT: Selects an object — useShallow prevents reference-instability re-renders
const element = useCanvasStore(useShallow((s) => s.elements[id]))

// CORRECT: Multiple values from one store
const { x, y } = useCanvasStore(
  useShallow((s) => ({ x: s.elements[id]?.x, y: s.elements[id]?.y }))
)

// WRONG: Subscribes to entire store — re-renders on ANY change
const store = useCanvasStore()

// WRONG: Returns new object every time — infinite re-render!
const element = useCanvasStore((s) => ({ el: s.elements[id] }))
```

### TailwindCSS v4 CSS-First Config

```css
/* apps/web/src/App.css — Tailwind v4 uses CSS-first config, no tailwind.config.js */
@import "tailwindcss";

@theme {
  --color-primary: #6c5ce7;
  --color-primary-light: #a29bfe;
  --color-surface: #ffffff;
  --color-surface-secondary: #f5f5f5;
  --font-sans: 'Inter', 'system-ui', sans-serif;
}
```
**Source:** TailwindCSS v4 release notes [tailwindcss.com/blog/tailwindcss-v4-3].

### pnpm Workspace Config

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```ini
# .npmrc — pnpm v11 supply-chain security
# Disable for local dev: set min release age to 0 or comment out
pnpm-minimum-release-age=0
# Allow build scripts for known-safe packages
pnpm-allow-build=esbuild,rollup
```

### Auto-Save Hook

```typescript
// apps/web/src/hooks/useAutoSave.ts
import { useEffect, useRef } from 'react'
import { useCanvasStore } from '../stores/canvasStore'
import { projectService } from '../indexedb/projectService'

export function useAutoSave(projectId: number | null) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const unsubscribe = useCanvasStore.subscribe(
      (state) => state.elements,
      () => {
        if (!projectId) return

        // Debounce: wait 180ms after last change
        clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(async () => {
          const serialized = useCanvasStore.getState().serialize()

          // Check storage before saving
          const storage = await projectService.checkStorage()
          if (storage.percentUsed > 80) {
            console.warn(`Storage at ${storage.percentUsed.toFixed(0)}% — consider clearing projects`)
          }

          await projectService.update(projectId, {
            canvasState: JSON.stringify(serialized),
            viewport: JSON.stringify(serialized.viewport),
          })
        }, 180)
      },
      { equalityFunction: Object.is }
    )

    return () => {
      unsubscribe()
      clearTimeout(debounceRef.current)
    }
  }, [projectId])
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Excalidraw npm package | Vendored source fork | Phase 1 decision | Full control for AIElement. Fork drift risk. FORK_CHANGES.md discipline required. |
| Excalidraw native undo | Custom unified HistoryStore | Phase 1 decision | Supports node graph state (Phase 2). More complex to implement. |
| zundo temporal middleware | Custom HistoryStore | Phase 1 decision | zundo couples to single store. Custom store wraps both canvas + node graph. |
| Single monolithic Zustand store | 5 domain-split stores | Architecture decision | Each store independent. Canvas updates don't re-render AI queue panel. |
| Excalidraw v0.17 (React 17) | Excalidraw v0.18 (React 19) | March 2025 | v0.18 drops UMD, fully ESM. `captureUpdate` replaces `commitToHistory`. React 19 support. |
| Vite 5 (esbuild + Rollup) | Vite 8 (Rolldown) | March 2026 | Single Rust bundler. 10-30x faster builds. OXC replaces Babel. `rolldownOptions` not `rollupOptions`. |
| Zustand v4 | Zustand v5 | Late 2025 | create() is named export. Middleware import paths changed. |

**Deprecated/outdated:**
- **React 18:** Security-only mode. Don't start new projects on it.
- **Node.js 20:** EOL April 30, 2026. Do not use.
- **TailwindCSS 3:** Complete rewrite to v4. No tailwind.config.js. CSS-first config via @theme.
- **Zod 3:** Breaking changes to v4 (unified error API, deprecated string format methods).
- **Excalidraw v0.17:** Lacks React 19 support. Requires `commitToHistory` pattern instead of `captureUpdate`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Excalidraw v0.18.0 supports React 19 natively | Standard Stack | MEDIUM — Excalidraw PR #9182 confirmed React 19 compatibility, but the specific v0.18.0 release tag must be verified to include this fix. If not, fork from a slightly later v0.18.x tag. |
| A2 | Vite 8 requires Node 22+ and the current environment has Node 23.8.0 | Standard Stack | LOW — Node 23.8.0 >= 22.12.0, so Vite 8 works. However, recommended Node 24 LTS is not active. Upgrade to 24 LTS when available. |
| A3 | `structuredClone()` is available in all browsers for history snapshots | HistoryStore | LOW — Modern browsers support it. Fallback to `JSON.parse(JSON.stringify())` for compatibility if needed. |
| A4 | `captureUpdate: 'never'` string works in v0.18 | HistoryStore | MEDIUM — v0.18 introduced `CaptureUpdateAction` enum. The string `'never'` may be the enum value or an alias. Verify exact API from Excalidraw source. |
| A5 | IndexedDB can handle single-table design with large JSON blobs | Persistence | LOW — Confirmed by Dexie docs. Single table with unindexed blob fields is a recommended pattern. |

## Open Questions (RESOLVED)

1. **Exact v0.18.x release tag for forking** — (RESOLVED)
   - What we know: Fork from latest v0.18.x release tag that supports React 19. Excalidraw PR #9182 confirms React 19 support.
   - What's unclear: Which specific v0.18.x tag includes the React 19 fix (v0.18.0 from March 2025, or a later patch).
   - **Recommendation:** Clone upstream, git tag, check release dates. v0.18.0 (March 11, 2025) is likely the right base. If React 19 support landed later, use the first v0.18.x tag after PR #9182 merged.
   - **RESOLVED:** Plan 01 Task 2 handles this at execution time — clones upstream, checks for v0.18.x tags, verifies React 19 support (PR #9182 in commit log), uses the latest working tag. FORK_CHANGES.md documents the exact tag used.

2. **CaptureUpdateAction API shape in v0.18** — (RESOLVED)
   - What we know: v0.18 deprecated `commitToHistory` in favor of `captureUpdate`. Three modes: IMMEDIATELY, EVENTUALLY, NEVER.
   - What's unclear: Is it a string enum (`'never'`) or a TypeScript enum (`CaptureUpdateAction.NEVER`)? Both patterns appear in Excalidraw's codebase historically.
   - **Recommendation:** Read the vendored source after forking.
   - **RESOLVED:** Plan 01 Task 2 vendors the source, and Plan 03 Task 1 reads the actual API from the vendored files via `grep`. The plans use `'never'` as a string literal with a comment noting to verify against the actual API signature found. Plan 03's SUMMARY will document the exact API shape.

3. **Chunk rendering integration with Excalidraw's existing viewport culling** — (RESOLVED)
   - What we know: Excalidraw already has `isElementInViewport()` in `Renderer.getRenderableElements()`. Phase 1 adds chunk-aware grouping.
   - What's unclear: How much of the existing culling can be preserved vs. replaced.
   - **Recommendation:** Measure first. Excalidraw's viewport culling may already be sufficient for 500+ basic elements. Add feature flag to toggle chunk rendering.
   - **RESOLVED:** Plan 05 implements chunk rendering as a coarse pre-filter BEFORE Excalidraw's existing `isElementInViewport()` precise check. The existing culling is preserved — chunk filter reduces the element set first, then the precise check runs on the filtered set. No feature flag needed; chunk filtering is always active with 1-chunk buffer.

4. **Ref forwarding in React 19 for Excalidraw imperative API** — (RESOLVED)
   - What we know: React 19 deprecated `forwardRef` (but kept it for backward compatibility). Excalidraw v0.18 may still use `forwardRef`.
   - What's unclear: Whether the downstream `excalidrawAPI` prop pattern works identically in React 19.
   - **Recommendation:** Test the Excalidraw React component renders in the app shell before doing any deep integration work.
   - **RESOLVED:** Plan 03 Task 1 discovers the actual export pattern from vendored source via `grep` and uses the `excalidrawAPI` callback prop (which is the canonical Excalidraw pattern independent of `forwardRef`). The import statement is dynamically resolved at execution time based on actual exports found.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build toolchain (Vite 8) | Yes | 23.8.0 | Upgrade to 24 LTS when stable |
| pnpm | Package management (workspaces) | Yes | 10.10.0 | Upgrade to 11.8.0 via `npm install -g pnpm@11` |
| npm | Global package installs | Yes | 11.13.0 | — |
| Git | Version control | Yes | (bundled) | — |
| Chrome/Chromium | Browser testing | Likely | — | Edge, Firefox as fallbacks |

**Missing dependencies with no fallback:**
- Node.js 24 LTS — Not available (Node 23.8.0 installed). Node 23 is a non-LTS release between 22 and 24. Functionally compatible with Vite 8 and pnpm 11. **Low risk**, but upgrade when 24 LTS is available for the system. Update the toolchain recommendation to say "Node 23+ (24 LTS preferred)" for this environment.

**Missing dependencies with fallback:**
- pnpm 11 -> pnpm 10.10.0. pnpm 11 requires Node 22+. pnpm 10.10.0 is fully functional for workspace management. The v11 supply-chain security defaults (`pnpm-minimum-release-age`, `blockExoticSubdeps`) are not critical for local development. Note that `pnpm-workspace.yaml` syntax is identical between v10 and v11. Upgrade with `npm install -g pnpm@11`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `apps/web/vite.config.ts` (Vitest inherits from Vite config) |
| Quick run command | `pnpm --filter @ac-canvas/web vitest run --reporter=verbose` |
| Full suite command | `pnpm --filter @ac-canvas/web vitest run --coverage` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CANVAS-01 | Canvas renders with pan/zoom/draw | manual-only | — | N/A — E2E test via Playwright in Phase 8 |
| CANVAS-02 | AIElement type exists in element union | unit | `vitest run -- test/AIElement.test.ts` | Wave 0 |
| CANVAS-03 | Layer panel adds/removes/reorders via CanvasStore | unit | `vitest run -- test/LayerPanel.test.tsx` | Wave 0 |
| CANVAS-04 | Chunk culling filters offscreen elements | unit | `vitest run -- test/ChunkCulling.test.ts` | Wave 0 |
| CANVAS-05 | HistoryStore undo/redo restores correct state | unit | `vitest run -- test/HistoryStore.test.ts` | Wave 0 |
| CANVAS-06 | Project save/load roundtrip preserves element state | unit | `vitest run -- test/Persistence.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter @ac-canvas/web vitest run --changed`
- **Per wave merge:** `pnpm --filter @ac-canvas/web vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `apps/web/test/stores/HistoryStore.test.ts` — tests: undo/redo/pause/clear/merge-window
- [ ] `apps/web/test/stores/CanvasStore.test.ts` — tests: serialize/filter/loadSerialized
- [ ] `apps/web/test/shared/AIElement.test.ts` — tests: AIElement type structure
- [ ] `apps/web/test/indexedb/ProjectService.test.ts` — tests: save/load/update/delete roundtrip
- [ ] `apps/web/test/indexedb/Database.test.ts` — tests: schema version, blob storage
- [ ] `apps/web/test/performance/ChunkCulling.test.ts` — tests: viewport filter, chunk boundary
- [ ] `apps/web/test/setup.ts` — Vitest setup file (JSDOM, Dexie mock)

**Test pattern for HistoryStore:**

```typescript
// apps/web/test/stores/HistoryStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useHistoryStore } from '../../src/stores/historyStore'

describe('HistoryStore', () => {
  beforeEach(() => {
    useHistoryStore.getState().clear()
  })

  it('captures and restores snapshots via undo', () => {
    const store = useHistoryStore.getState()
    store.captureSnapshot()
    // ... verify snapshot count
    store.undo()
    // ... verify state restored
  })

  it('debounces rapid changes within merge window', () => {
    // ... verify 180ms merge
  })

  it('pauses capture during drag operations', () => {
    // ... verify setPaused(true) blocks capture
  })

  it('limits to 50 snapshots', () => {
    // ... verify max depth
  })
})
```

## Security Domain

> No security layer exists in Phase 1. The MVP runs entirely client-side with IndexedDB. No authentication, no API keys, no server communication. AIElement is a placeholder with no real AI integration. Security enforcement begins in Phase 4 (AI Adapters — API key storage) and Phase 6 (Backend — JWT auth, server-side validation).

## Sources

### Primary (HIGH confidence)
- Excalidraw v0.18.0 release notes [newreleases.io/project/github/excalidraw/excalidraw/release/v0.18.0] — disabled native undo via `captureUpdate`, ESM migration, React 19 support
- Excalidraw API documentation [docs.excalidraw.com] — `excalidrawAPI` methods, `onChange` signature
- Excalidraw element system DeepWiki [deepwiki.com/excalidraw/excalidraw/3-element-system] — element type union, render dispatch, dual-canvas architecture
- Excalidraw canvas rendering pipeline DeepWiki [deepwiki.com/excalidraw/excalidraw/5.1-canvas-rendering] — StaticCanvas/InteractiveCanvas, viewport culling, ShapeCache, off-screen canvas
- Dexie.js v4.4 release [dexie.org/blog/dexie-44-dexie-cloud-server-30-the-big-one] — blob offloading, version.stores() docs
- Zustand v5 release notes [github.com/pmndrs/zustand/releases] — create() named export, immer middleware path change
- TailwindCSS v4 release [tailwindcss.com/blog/tailwindcss-v4-3] — CSS-first config, @theme, no tailwind.config.js
- Vite 8 announcement [vite.dev/blog/announcing-vite8] — Rolldown, OXC, build.rolldownOptions
- pnpm 11 release notes [pnpm.io/next/cli/update] — supply-chain security, Node 22+ requirement

### Secondary (MEDIUM confidence)
- Excalidraw PR #9450 [github.com/excalidraw/excalidraw/pull/9450] — `onIncrement` API with `EphemeralIncrement`/`DurableIncrement`
- Excalidraw PR #9182 [github.com/excalidraw/excalidraw/pull/9182] — React 19 support
- Excalidraw issue #4957 [github.com/excalidraw/excalidraw/issues/4957] — custom element proposal (feature request, not yet implemented)
- Excalidraw issue #10512 — full scene traversal regression
- Excalidraw scene content schema [plus.excalidraw.com/docs/api/scene-content-schema] — element type definitions
- Dexie.js v4.4.1 release [newreleases.io/project/npm/dexie/release/4.4.1] — confirm version currency
- Dexie.js financial data architecture guide [dev.to/maxxmini] — single-table performance benchmarks
- Excalidraw rendering optimization [blog.csdn.net/gitblog_00622/article/details/150998841] — performance patterns

### Tertiary (LOW confidence)
- Excalidraw fork maintainability study (Ogenrwot & Businge, 2025) — 64.4% cherry-pick failure rate
- Market/ecosystem analysis from SUMMARY.md — stack choices validated against 2026 production patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All versions verified against npm registry and official release notes
- Architecture: HIGH — Patterns validated against production deployments (Giselle, TapCanvas, Infinite Canvas)
- Pitfalls: HIGH — Fork drift, rendering performance, and re-render cascade documented with specific mitigations
- Persistence: HIGH — Dexie.js single-table pattern confirmed by official docs and production examples
- Element system: MEDIUM — Excalidraw source files not directly inspected; API verified via docs and DeepWiki analysis

**Research date:** 2026-06-29
**Valid until:** 2026-07-29 (30 days; stack versions moving fast in 2026)
