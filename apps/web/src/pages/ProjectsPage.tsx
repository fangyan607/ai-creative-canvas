// ---------------------------------------------------------------------------
// ProjectsPage — Full project management page with grid cards and CRUD.
//
// D-05: Grid card view with project name, timestamp, canvas thumbnail.
// D-06: Start page dialog for new project creation (blank + templates).
// D-07: Uses existing projectService for all CRUD operations.
//
// Layout: Full-height page with padding (p-8).
// Header: "项目" title + "新建项目" button.
// Body: Loading state, empty state, or 4-column grid of project cards.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, ImageIcon } from 'lucide-react'
import { exportToCanvas } from '@ac-canvas/excalidraw'
import { projectService, type ProjectRecord } from '../indexedb/projectService'
import { useCanvasStore } from '../stores/canvasStore'
import { useNodeGraphStore } from '../stores/nodeGraphStore'
import { useProjectStore } from '../stores/projectStore'
import { StartPageDialog } from '../components/StartPageDialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

// ---------------------------------------------------------------------------
// Thumbnail cache (project id -> data URL or null for error/empty)
// ---------------------------------------------------------------------------

const thumbnailCache = new Map<number, string | null>()

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProjectsPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [startOpen, setStartOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ProjectRecord | null>(null)
  const [thumbnails] = useState(() => thumbnailCache)
  const thumbnailRefs = useRef(new Map<string, Promise<void>>())

  // Load projects on mount
  const loadProjects = useCallback(async () => {
    setLoading(true)
    try {
      const list = await projectService.list()
      setProjects(list)
      // Trigger lazy thumbnail generation (in background)
      generateThumbnails(list)
    } catch {
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  // Handle create project
  const handleCreateProject = useCallback(
    async (name: string, templateId?: string) => {
      try {
        // Build initial canvas state
        const initialCanvas = useCanvasStore.getState().serialize()
        const initialNodeGraph = useNodeGraphStore.getState().serialize()

        // If a template was selected, load it into the stores
        if (templateId) {
          const { applyTemplate } = await import('@ac-canvas/node-editor')
          const templateGraph = applyTemplate(templateId)
          if (templateGraph) {
            useNodeGraphStore.getState().loadSerialized(templateGraph)
            // Clear canvas when using a template (node-graph-driven workflow)
            useCanvasStore.getState().loadSerialized({ elements: [], viewport: { x: 0, y: 0, zoom: 1 } })
          }
        }

        // Save the project
        const serialized = templateId
          ? useCanvasStore.getState().serialize()
          : initialCanvas
        const nodeGraph = templateId
          ? useNodeGraphStore.getState().serialize()
          : initialNodeGraph

        const id = await projectService.save({
          name,
          canvasState: JSON.stringify(serialized),
          viewport: JSON.stringify(serialized.viewport),
          nodeGraph: JSON.stringify(nodeGraph),
        })

        // Set as current project and navigate to canvas
        useProjectStore.getState().setCurrentProject(id, name)
        setStartOpen(false)
        navigate('/')
      } catch (err) {
        console.error('Failed to create project:', err)
      }
    },
    [navigate],
  )

  // Handle open project
  const handleOpenProject = useCallback(
    async (project: ProjectRecord) => {
      try {
        const loaded = await projectService.load(project.id!)
        if (!loaded) return

        // Parse and load canvas state
        const canvasState = JSON.parse(loaded.canvasState)
        useCanvasStore.getState().loadSerialized(canvasState)

        // Parse and load node graph if present
        if (loaded.nodeGraph) {
          const nodeGraph = JSON.parse(loaded.nodeGraph)
          useNodeGraphStore.getState().loadSerialized(nodeGraph)
        }

        // Set project in store
        useProjectStore.getState().setCurrentProject(loaded.id!, loaded.name)

        // Navigate to canvas
        navigate('/')
      } catch (err) {
        console.error('加载项目失败:', err)
      }
    },
    [navigate],
  )

  // Handle delete project
  const handleDeleteProject = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await projectService.delete(deleteTarget.id!)
      thumbnailCache.delete(deleteTarget.id!)
      setDeleteTarget(null)
      await loadProjects()
    } catch (err) {
      console.error('删除失败:', err)
    }
  }, [deleteTarget, loadProjects])

  // Generate thumbnails lazily
  const generateThumbnails = useCallback(
    async (list: ProjectRecord[]) => {
      for (const project of list) {
        const pid = project.id!
        if (thumbnailCache.has(pid)) continue

        // Use a ref to avoid duplicate generation for the same project
        const key = `thumb-${pid}`
        if (thumbnailRefs.current.has(key)) continue

        const promise = (async () => {
          try {
            if (!project.canvasState) {
              thumbnailCache.set(pid, null)
              return
            }
            const parsed = JSON.parse(project.canvasState)
            const elements = parsed.elements
            if (!elements || elements.length === 0) {
              thumbnailCache.set(pid, null)
              return
            }

            const canvas = await exportToCanvas({
              elements,
              appState: {
                viewBackgroundColor: '#f0f0f0',
                exportBackground: true,
              },
              files: null,
              exportPadding: 0,
              maxWidthOrHeight: 400,
            })

            // Scale down to thumbnail size
            const thumbCanvas = document.createElement('canvas')
            thumbCanvas.width = 320
            thumbCanvas.height = 180
            const ctx = thumbCanvas.getContext('2d')
            if (!ctx) {
              thumbnailCache.set(pid, null)
              return
            }
            ctx.drawImage(canvas, 0, 0, 320, 180)
            thumbnailCache.set(pid, thumbCanvas.toDataURL('image/webp', 0.6))
          } catch {
            thumbnailCache.set(pid, null)
          }
        })()

        thumbnailRefs.current.set(key, promise)
        // Fire and forget — thumbnails load in background
        promise.finally(() => {
          thumbnailRefs.current.delete(key)
          // Force re-render by updating state
          setProjects((prev) => [...prev])
        })
      }
    },
    [],
  )

  // Format date as relative or absolute
  const formatDate = (date: Date) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}小时前`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}天前`
    return d.toLocaleDateString('zh-CN')
  }

  return (
    <div className="h-full p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[28px] font-semibold leading-tight">项目</h1>
        <Button onClick={() => setStartOpen(true)}>
          <Plus size={16} />
          新建项目
        </Button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
          加载中...
        </div>
      )}

      {/* Empty state */}
      {!loading && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted">
            <ImageIcon size={28} className="text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">暂无项目</h2>
          <p className="text-sm text-muted-foreground">创建你的第一个项目开始创作</p>
          <Button onClick={() => setStartOpen(true)}>
            <Plus size={16} />
            新建项目
          </Button>
        </div>
      )}

      {/* Project grid */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {projects.map((project) => {
            const thumb = thumbnails.get(project.id!)
            return (
              <Card
                key={project.id}
                className="group cursor-pointer transition-shadow hover:shadow-md hover:border-accent"
                onClick={() => handleOpenProject(project)}
              >
                <CardContent className="p-0">
                  {/* Thumbnail area (16:9) */}
                  <div className="relative aspect-video bg-secondary overflow-hidden rounded-t-xl">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={project.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                        <ImageIcon size={24} />
                      </div>
                    )}

                    {/* Delete button (appears on hover) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteTarget(project)
                      }}
                      className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-md bg-background/80 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="删除项目"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Project info */}
                  <div className="p-3 space-y-1">
                    <h3 className="text-sm font-semibold truncate">{project.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(project.updatedAt)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Start page dialog */}
      <StartPageDialog
        open={startOpen}
        onOpenChange={setStartOpen}
        onCreateProject={handleCreateProject}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除项目</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            确定要删除「{deleteTarget?.name}」吗？此操作不可撤销。
          </DialogDescription>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProject}
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
