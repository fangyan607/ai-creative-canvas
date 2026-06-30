// ---------------------------------------------------------------------------
// NodeEditorOverlay -- Transparent React Flow wrapper over the Excalidraw
// canvas. Provides node type toolbar, drag-to-create, connection validation,
// delete confirmation, viewport sync, and focus mode toggle.
// ---------------------------------------------------------------------------

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
  type DragEvent,
} from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react'
import { type NodeType, nodeTypeDefinitions } from '@ac-canvas/shared'
import {
  MessageSquareText,
  WandSparkles,
  Palette,
  Layers,
  Eye,
  Plus,
  FolderKanban,
  type LucideIcon,
} from 'lucide-react'

import { PromptNode } from './nodes/PromptNode'
import { TextToImageNode } from './nodes/TextToImageNode'
import { StyleNode } from './nodes/StyleNode'
import { MergeNode } from './nodes/MergeNode'
import { PreviewNode } from './nodes/PreviewNode'
import { GroupNode } from './nodes/GroupNode'
import { ConnectionLine } from './ConnectionLine'
import { FocusModeToggle, type FocusMode } from './FocusModeToggle'
import { validateConnection } from './ConnectionValidator'
import type { ConnectionValidationResult } from './ConnectionValidator'

// ---------------------------------------------------------------------------
// Imports from the web app (pnpm workspace resolves across packages)
// ---------------------------------------------------------------------------
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../apps/web/src/components/ui/dialog'
import { Button } from '../../../apps/web/src/components/ui/button'
import { useNodeGraphStore } from '../../../apps/web/src/stores/nodeGraphStore'
import { useCanvasStore } from '../../../apps/web/src/stores/canvasStore'
import { useHistoryStore } from '../../../apps/web/src/stores/historyStore'
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type { FocusMode } from './FocusModeToggle'

export interface NodeEditorOverlayProps {
  focusMode: FocusMode
  onFocusModeChange: (mode: FocusMode) => void
}

// ---------------------------------------------------------------------------
// Icon lookup
// ---------------------------------------------------------------------------

const TOOLBAR_ICON_MAP: Record<string, LucideIcon> = {
  'message-square-text': MessageSquareText,
  'wand-sparkles': WandSparkles,
  palette: Palette,
  layers: Layers,
  eye: Eye,
}

function getToolbarIcon(iconName: string): LucideIcon {
  return TOOLBAR_ICON_MAP[iconName] || Plus
}

// ---------------------------------------------------------------------------
// Converter helpers
// ---------------------------------------------------------------------------

function toRFNode(
  n: { id: string; type: string; position: { x: number; y: number }; data: unknown; parentId?: string | null },
): Node {
  const rfNode: Node = {
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.data,
  }
  // Pass through parentId for group node support (D-07)
  if (n.parentId) {
    rfNode.parentId = n.parentId
    // Children of group nodes have extent: 'parent' so they're
    // visually contained within the group
    rfNode.extent = 'parent'
  }
  return rfNode
}

function toRFEdge(
  e: {
    id: string
    source: string
    target: string
    sourceHandle?: string
    targetHandle?: string
  },
): Edge {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    type: 'smoothstep' as const,
    animated: true,
    style: { stroke: 'var(--color-socket-output)', strokeWidth: 2 },
  } as Edge
}

// ---------------------------------------------------------------------------
// Inner component (must be inside ReactFlowProvider for hooks)
// ---------------------------------------------------------------------------

function OverlayInner({ focusMode, onFocusModeChange }: NodeEditorOverlayProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition, setViewport } = useReactFlow()
  const [rfNodes, setRfNodes] = useState<Node[]>(() =>
    useNodeGraphStore.getState().nodes.map(toRFNode),
  )
  const [rfEdges, setRfEdges] = useState<Edge[]>(() =>
    useNodeGraphStore.getState().edges.map(toRFEdge),
  )

  // Store subscriptions
  const storeNodes = useNodeGraphStore((s) => s.nodes)
  const storeEdges = useNodeGraphStore((s) => s.edges)
  const canvasViewport = useCanvasStore((s) => s.viewport)

  // Local UI state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [pendingDeleteNodes, setPendingDeleteNodes] = useState<Node[]>([])

  // ---------------------------------------------------------------------------
  // Node types (memoized)
  // ---------------------------------------------------------------------------

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      prompt: PromptNode,
      'text-to-image': TextToImageNode,
      style: StyleNode,
      merge: MergeNode,
      preview: PreviewNode,
      group: GroupNode,
    }),
    [],
  )

  // ---------------------------------------------------------------------------
  // Sync: Store -> ReactFlow
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // Sort: group nodes must appear before their children (Researched Pitfall 2)
    const sorted = [...storeNodes].sort((a, b) => {
      if (a.id === b.parentId) return -1  // a is b's parent
      if (b.id === a.parentId) return 1   // b is a's parent
      return 0
    })
    setRfNodes(sorted.map(toRFNode))
  }, [storeNodes])

  useEffect(() => {
    setRfEdges(storeEdges.map(toRFEdge))
  }, [storeEdges])

  // ---------------------------------------------------------------------------
  // Node/Edge change handlers (ReactFlow -> Store)
  // ---------------------------------------------------------------------------

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setRfNodes((nds) => {
      const next = applyNodeChanges(changes, nds)
      for (const change of changes) {
        if (change.type === 'position' && !change.dragging && change.position) {
          useNodeGraphStore.getState().setNodePosition(change.id, change.position)
        }
        if (change.type === 'select') {
          useNodeGraphStore.getState().selectNode(change.selected ? change.id : null)
        }
      }
      return next
    })
  }, [])

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setRfEdges((eds) => {
      const next = applyEdgeChanges(changes, eds)
      for (const change of changes) {
        if (change.type === 'remove') {
          useNodeGraphStore.getState().removeEdge(change.id)
        }
      }
      return next
    })
  }, [])

  // ---------------------------------------------------------------------------
  // Group collapse/expand handler
  // ---------------------------------------------------------------------------

  /**
   * Toggle group collapse. When collapsing:
   * - Hide all child nodes and their connected edges
   * - Update the store with the new collapsed state
   *
   * Reverses on expand. Per D-06/D-08 and RESEARCH.md Pitfall 4.
   */
  const toggleGroupCollapse = useCallback(
    (groupId: string) => {
      const store = useNodeGraphStore.getState()
      const groupNode = store.nodes.find((n) => n.id === groupId)
      if (!groupNode || groupNode.type !== 'group') return

      const groupData = groupNode.data as any
      const currentlyCollapsed = groupData.collapsed === true
      const newCollapsed = !currentlyCollapsed

      // Update the store
      store.setGroupCollapsed(groupId, newCollapsed)

      // Find child node IDs of this group
      const childIds = new Set(
        store.nodes
          .filter((n) => n.parentId === groupId)
          .map((n) => n.id),
      )

      // Update local rfNodes: hide/show children, update group node data
      setRfNodes((prev) =>
        prev.map((n) => {
          if (childIds.has(n.id)) {
            return { ...n, hidden: newCollapsed }
          }
          if (n.id === groupId) {
            return {
              ...n,
              data: { ...n.data, collapsed: newCollapsed },
              style: newCollapsed
                ? { ...(n.style || {}), width: 200, height: 60 }
                : n.style,
            }
          }
          return n
        }),
      )

      // Update edges: hide/show edges connected to children
      setRfEdges((prev) =>
        prev.map((e) => {
          if (childIds.has(e.source) || childIds.has(e.target)) {
            return { ...e, hidden: newCollapsed }
          }
          return e
        }),
      )
    },
    [],
  )

  // ---------------------------------------------------------------------------
  // Connection handlers
  // ---------------------------------------------------------------------------

  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      if (!connection.source || !connection.target) return false
      const result: ConnectionValidationResult = validateConnection(
        connection.source,
        connection.target,
        connection.sourceHandle ?? null,
        connection.targetHandle ?? null,
        storeEdges.map((e) => ({
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
        })),
      )
      return result.valid
    },
    [storeEdges],
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      if (
        !connection.source ||
        !connection.target ||
        !connection.sourceHandle ||
        !connection.targetHandle
      )
        return

      const result: ConnectionValidationResult = validateConnection(
        connection.source,
        connection.target,
        connection.sourceHandle,
        connection.targetHandle,
        storeEdges.map((e) => ({
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
        })),
      )

      if (result.valid) {
        useNodeGraphStore.getState().addEdge({
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
        })
      }
    },
    [storeEdges],
  )

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      useNodeGraphStore.getState().selectNode(node.id)
    },
    [],
  )

  // ---------------------------------------------------------------------------
  // Delete confirmation
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (focusMode !== 'nodes') return
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return

      const selectedId = useNodeGraphStore.getState().selectedNodeId
      if (!selectedId) return

      const node = rfNodes.find((n) => n.id === selectedId)
      if (node) {
        e.preventDefault()
        setPendingDeleteNodes([node])
        setDeleteDialogOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusMode, rfNodes])

  const confirmDelete = useCallback(() => {
    for (const node of pendingDeleteNodes) {
      useNodeGraphStore.getState().removeNode(node.id)
    }
    setDeleteDialogOpen(false)
    setPendingDeleteNodes([])
  }, [pendingDeleteNodes])

  const cancelDelete = useCallback(() => {
    setDeleteDialogOpen(false)
    setPendingDeleteNodes([])
  }, [])

  // ---------------------------------------------------------------------------
  // Drag-to-create from toolbar
  // ---------------------------------------------------------------------------

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()
      const nodeType = event.dataTransfer.getData('application/reactflow')
      if (!nodeType) return

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect()
      if (!reactFlowBounds) return

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      useNodeGraphStore.getState().addNode(nodeType as NodeType, position)
    },
    [screenToFlowPosition],
  )

  const onDragStart = useCallback(
    (event: DragEvent<HTMLButtonElement>, type: string) => {
      event.dataTransfer.setData('application/reactflow', type)
      event.dataTransfer.effectAllowed = 'move'
    },
    [],
  )

  // ---------------------------------------------------------------------------
  // Template selection handler
  // ---------------------------------------------------------------------------

  const handleTemplateSelect = useCallback(
    (templateId: string) => {
      import('./templates').then(({ applyTemplate }) => {
        const graph = applyTemplate(templateId)
        if (graph) {
          useHistoryStore.getState().captureSnapshot()
          useNodeGraphStore.getState().loadSerialized(graph)
        }
      })
      setTemplateDialogOpen(false)
    },
    [],
  )

  // ---------------------------------------------------------------------------
  // Viewport sync
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (focusMode === 'nodes') {
      setViewport({
        x: canvasViewport.x,
        y: canvasViewport.y,
        zoom: canvasViewport.zoom,
      })
    }
  }, [focusMode])

  // ---------------------------------------------------------------------------
  // Default edge options
  // ---------------------------------------------------------------------------

  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'smoothstep' as const,
      animated: true,
      style: { stroke: 'var(--color-socket-output)', strokeWidth: 2 },
    }),
    [],
  )

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      ref={reactFlowWrapper}
      className="absolute inset-0"
      style={{
        pointerEvents: focusMode === 'nodes' ? 'auto' : 'none',
        opacity: focusMode === 'canvas' ? 0.4 : 1,
        transition: 'opacity 150ms ease',
      }}
    >
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        isValidConnection={isValidConnection}
        connectionLineComponent={ConnectionLine}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView={false}
        deleteKeyCode={[]}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} color="var(--color-hairline)" />
        <Controls showInteractive={false} />

        {/* Focus Mode Toggle - top-left */}
        <div className="absolute top-4 left-4 z-10">
          <FocusModeToggle
            focusMode={focusMode}
            onChange={onFocusModeChange}
          />
        </div>

        {/* Node Palette Toolbar - top-right */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {nodeTypeDefinitions.map((def) => {
            const Icon = getToolbarIcon(def.icon)
            return (
              <button
                key={def.type}
                draggable
                onDragStart={(e) => onDragStart(e, def.type)}
                className="flex flex-col items-center gap-0.5 p-2 bg-white border border-[var(--color-hairline)] rounded-[var(--radius-md)] cursor-grab active:cursor-grabbing hover:bg-[var(--color-surface-secondary)] transition-colors"
                title={def.label}
              >
                <Icon size={16} />
                <span className="text-[10px] text-[var(--color-muted-foreground)]">
                  {def.label}
                </span>
              </button>
            )
          })}
          <div className="w-px h-8 bg-[var(--color-hairline)]" />

          {/* Group create button */}
          <button
            onClick={() => {
              // Create a group at a default position (center-ish of current viewport)
              useNodeGraphStore.getState().createGroup('New Group', {
                x: -150,
                y: -100,
              })
              // Capture snapshot for undo (D-10)
              useHistoryStore.getState().captureSnapshot()
            }}
            className="flex flex-col items-center gap-0.5 p-2 bg-white border border-[var(--color-hairline)] rounded-[var(--radius-md)] hover:bg-[var(--color-surface-secondary)] transition-colors cursor-pointer"
            title="Create Group"
          >
            <FolderKanban size={16} />
            <span className="text-[10px] text-[var(--color-muted-foreground)]">
              Group
            </span>
          </button>

          <div className="w-px h-8 bg-[var(--color-hairline)]" />
          <button
            onClick={() => setTemplateDialogOpen(true)}
            className="flex items-center gap-1 px-3 py-2 bg-white border border-[var(--color-hairline)] rounded-[var(--radius-md)] text-xs font-medium text-[var(--color-foreground)] hover:bg-[var(--color-surface-secondary)] transition-colors cursor-pointer"
          >
            <Plus size={14} />
            Quick Start
          </button>
        </div>
      </ReactFlow>

      {/* -- Delete Confirmation Dialog -- */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open: boolean) => {
          if (!open) cancelDelete()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Node</DialogTitle>
            <DialogDescription>
              This will remove the node and its connections. This action can be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelDelete}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -- Template Dialog -- */}
      {templateDialogOpen && (
        <TemplateDialog
          open={templateDialogOpen}
          onClose={() => setTemplateDialogOpen(false)}
          onSelect={handleTemplateSelect}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// TemplateDialog import (at bottom to avoid issues with module resolution
// before TemplateDialog.tsx exists in Task 3)
// ---------------------------------------------------------------------------

import { TemplateDialog } from './TemplateDialog'

// ---------------------------------------------------------------------------
// Root component (wraps inner component in ReactFlowProvider)
// ---------------------------------------------------------------------------

function NodeEditorOverlay(props: NodeEditorOverlayProps) {
  return (
    <ReactFlowProvider>
      <OverlayInner {...props} />
    </ReactFlowProvider>
  )
}

export default NodeEditorOverlay
export { NodeEditorOverlay }
