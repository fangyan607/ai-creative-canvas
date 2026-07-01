// ---------------------------------------------------------------------------
// CanvasPage — Canvas view route
//
// Contains the canvas view content that was previously in App.tsx:
// - CanvasWrapper + NodeEditorOverlay
// - Focus mode toggle (bottom-right)
// - Node palette toolbar (bottom-center)
// - Execution status indicator (bottom-left)
// - Adapter registration, ProviderStore init, SSE init
// - PropertyPanel rendered inline (will move to TabbedSidebar properties tab in Plan 02)
// - Auto-save logic wired to projectStore (Plan 02+)
// - ProgressPanel at the bottom of the canvas area
// ---------------------------------------------------------------------------

import { useState, useCallback, useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { AdapterRegistry } from '@ac-canvas/ai-core'
import { MockAdapter } from '@ac-canvas/ai-core/adapters/mock.adapter'
import { OpenAiAdapter } from '@ac-canvas/ai-core/adapters/openai.adapter'
import { StabilityAdapter } from '@ac-canvas/ai-core/adapters/stability.adapter'
import { initProviderStore } from '../stores/providerStoreSingleton'
import { CanvasWrapper } from '../components/CanvasWrapper'
import { ProgressPanel } from '../components/ProgressPanel'
import { ShortcutPanel } from '../components/ShortcutPanel'
import { useAutoExecute } from '../hooks/useAutoExecute'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useEngineStore } from '../stores/engineStore'
import { initSSE, useSSEProgress } from '../services/useSSEProgress'
import { useNodeGraphStore } from '../stores/nodeGraphStore'
import { useCanvasStore } from '../stores/canvasStore'
import { useHistoryStore } from '../stores/historyStore'
import { useProjectStore } from '../stores/projectStore'
import { projectService } from '../indexedb/projectService'
import { NodeEditorOverlay, PropertyPanel } from '@ac-canvas/node-editor'
import { nodeTypeDefinitions } from '@ac-canvas/shared'
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

const NODE_LABELS_CN: Record<string, string> = {
  prompt: '提示词',
  'text-to-image': '文生图',
  style: '风格',
  merge: '合并',
  preview: '预览',
}

// ---------------------------------------------------------------------------
// Auto-save debounce hook (180ms debounce per D-15)
// ---------------------------------------------------------------------------

function useProjectAutoSave(projectId: number | null) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const projectIdRef = useRef(projectId)
  projectIdRef.current = projectId

  const save = useCallback(async () => {
    const pid = projectIdRef.current
    if (pid === null) return

    useProjectStore.getState().setIsSaving(true)
    try {
      const canvasStr = JSON.stringify(useCanvasStore.getState().serialize())
      const graphStr = JSON.stringify(useNodeGraphStore.getState().serialize())

      await projectService.update(pid, {
        canvasState: canvasStr,
        nodeGraph: graphStr,
      })
    } finally {
      useProjectStore.getState().setIsSaving(false)
    }
  }, [])

  // Subscribe to store changes
  useEffect(() => {
    if (projectId === null) return

    const debounced = () => {
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(save, 180)
    }

    const u1 = useCanvasStore.subscribe(() => debounced())
    const u2 = useNodeGraphStore.subscribe(() => debounced())

    return () => {
      clearTimeout(debounceRef.current)
      u1()
      u2()
    }
  }, [projectId, save])

  // Persist projectId when it changes
  useEffect(() => {
    if (projectId !== null) {
      useProjectStore.getState().setProjectId(projectId)
    }
  }, [projectId])
}

export function CanvasPage() {
  const [projectId, setProjectId] = useState<number | null>(null)
  const [shortcutOpen, setShortcutOpen] = useState(false)

  // Node editor state (fine-grained selectors per D-24)
  const focusMode = useNodeGraphStore(useShallow((s) => s.focusMode))
  const selectedNodeId = useNodeGraphStore(useShallow((s) => s.selectedNodeId))
  const setFocusMode = useNodeGraphStore((s) => s.setFocusMode)

  const isNodeMode = focusMode === 'nodes'

  useProjectAutoSave(projectId)
  useAutoExecute()
  useSSEProgress()

  // Keyboard shortcuts (D-17, D-18)
  useKeyboardShortcuts([
    {
      id: 'shortcuts',
      key: '?',
      handler: () => setShortcutOpen(true),
      group: 'app',
      description: '显示键盘快捷键',
    },
    {
      id: 'save',
      key: 's',
      ctrlKey: true,
      handler: () => {
        // Save is handled by useProjectAutoSave debounce — no manual trigger needed
      },
      group: 'app',
      description: '保存项目',
    },
    {
      id: 'execute',
      key: 'Enter',
      ctrlKey: true,
      handler: () => {
        // Reserved for future execution trigger (Phase 5)
      },
      group: 'app',
      description: '执行工作流',
    },
    {
      id: 'escape',
      key: 'Escape',
      handler: () => {
        // Deselect / return to canvas mode
        if (focusMode === 'nodes') {
          setFocusMode('canvas')
        }
      },
      group: 'canvas',
      description: '返回画布模式',
    },
  ])

  const handleProjectIdChange = useCallback((id: number) => {
    setProjectId(id)
  }, [])

  const handleFocusModeChange = useCallback((mode: 'canvas' | 'nodes') => {
    setFocusMode(mode)
  }, [setFocusMode])

  // Execution state (for status indicator)
  const isExecuting = useEngineStore((s) => s.isExecuting)
  const nodeErrors = useEngineStore(useShallow((s) => Object.keys(s.nodeErrors).length > 0 ? s.nodeErrors : {}))
  const errorCount = Object.keys(nodeErrors).length

  // Bootstrap: register AI adapters and initialize ProviderStore (Phase 5)
  useEffect(() => {
    const registry = AdapterRegistry.getInstance()
    registry.register(MockAdapter)
    registry.register(OpenAiAdapter)
    registry.register(StabilityAdapter)

    // Initialize ProviderStore with Dexie backend
    initProviderStore()

    // Initialize SSE connection for proxy mode (no-op in direct mode)
    initSSE()
  }, [])

  return (
    <div className="w-full h-full flex relative overflow-hidden">
      {/* Center area — contains canvas + node overlay stacked */}
      <div className="flex-1 relative">
        {/* Canvas — disabled when in node mode */}
        <CanvasWrapper disabled={isNodeMode} />

        {/* Node editor overlay — interactive only in node mode */}
        <NodeEditorOverlay
          focusMode={focusMode}
          onFocusModeChange={handleFocusModeChange}
        />

        {/* Focus mode toggle — bottom-right */}
        <div className="absolute bottom-5 right-[60px] z-10 flex gap-1">
          <button
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg border transition-colors shadow-sm min-w-[56px] ${
              focusMode === 'canvas'
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => handleFocusModeChange('canvas')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
            <span className="text-[10px] whitespace-nowrap">画布</span>
          </button>
          <button
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg border transition-colors shadow-sm min-w-[56px] ${
              focusMode === 'nodes'
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => handleFocusModeChange('nodes')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="3"/></svg>
            <span className="text-[10px] whitespace-nowrap">节点</span>
          </button>
        </div>

        {/* Node palette toolbar — bottom-center */}
        <div
          className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1"
          style={{ display: isNodeMode ? 'flex' : 'none' }}
        >
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl px-3 py-2 shadow-md">
          {nodeTypeDefinitions.map((def) => {
            const Icon = getToolbarIcon(def.icon)
            const cnLabel = NODE_LABELS_CN[def.type] || def.label
            return (
              <button
                key={def.type}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/reactflow', def.type)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg cursor-grab active:cursor-grabbing hover:bg-gray-50 transition-colors shadow-sm min-w-[56px]"
                title={def.label + ' — 拖拽到画布创建'}
              >
                <Icon size={18} />
                <span className="text-[10px] text-gray-600 whitespace-nowrap">{cnLabel}</span>
              </button>
            )
          })}
          <div className="w-px h-8 bg-gray-300" />
          <button
            onClick={() => {
              useNodeGraphStore.getState().createGroup('New Group', { x: -150, y: -100 })
              useHistoryStore.getState().captureSnapshot()
            }}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer shadow-sm min-w-[56px]"
            title="创建分组 — 点击创建空组"
          >
            <FolderKanban size={18} />
            <span className="text-[10px] text-gray-600 whitespace-nowrap">分组</span>
          </button>
          </div>
          <div className="text-[9px] text-gray-400 tracking-wide">拖拽按钮到画布创建节点</div>
        </div>

        {/* Execution status indicator — bottom-left */}
        <div className="absolute bottom-12 left-2.5 z-50 flex items-center gap-2">
          {isExecuting && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-[var(--color-hairline)] rounded-full text-[11px] text-[var(--color-muted-foreground)] shadow-sm">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Executing...</span>
            </div>
          )}
          {errorCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 border border-red-200 rounded-full text-[11px] text-red-600 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>{errorCount} error{errorCount > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right sidebar — PropertyPanel visible when a node is selected */}
      <PropertyPanel selectedNodeId={selectedNodeId} />

      {/* Execution progress panel — collapsible bottom panel */}
      <ProgressPanel />

      {/* Keyboard shortcut discovery panel */}
      <ShortcutPanel open={shortcutOpen} onOpenChange={setShortcutOpen} />
    </div>
  )
}
