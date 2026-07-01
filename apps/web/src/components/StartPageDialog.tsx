// ---------------------------------------------------------------------------
// StartPageDialog — Figma-style new project dialog.
//
// D-06: Shows "Blank Canvas" and template options in a gallery layout.
// Users enter a project name and pick a template (or blank) to create a
// new project. Opens from ProjectsPage "新建项目" button.
// ---------------------------------------------------------------------------

import { useState } from 'react'
import {
  LayoutDashboard,
  Image,
  Palette,
  type LucideIcon,
} from 'lucide-react'
import { TEMPLATES, type Template } from '@ac-canvas/node-editor'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Template card icon map
// ---------------------------------------------------------------------------

const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  'text-to-image': Image,
  'style-transfer': Palette,
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface StartPageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateProject: (name: string, templateId?: string) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StartPageDialog({
  open,
  onOpenChange,
  onCreateProject,
}: StartPageDialogProps) {
  const [projectName, setProjectName] = useState('未命名项目')
  const [selectedTemplate, setSelectedTemplate] = useState<string | undefined>(undefined)

  const handleCreate = () => {
    if (!projectName.trim()) return
    onCreateProject(projectName.trim(), selectedTemplate)
    setProjectName('未命名项目')
    setSelectedTemplate(undefined)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      // Reset state when closing
      setProjectName('未命名项目')
      setSelectedTemplate(undefined)
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新建项目</DialogTitle>
        </DialogHeader>

        {/* Gallery of options */}
        <div className="grid grid-cols-3 gap-3 py-4">
          {/* Blank Canvas */}
          <button
            onClick={() => setSelectedTemplate(undefined)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors text-center',
              selectedTemplate === undefined
                ? 'border-accent bg-accent/10'
                : 'border-border hover:border-accent/50 hover:bg-accent/5',
            )}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted">
              <LayoutDashboard size={24} className="text-foreground" />
            </div>
            <span className="text-sm font-medium">空白画布</span>
            <span className="text-xs text-muted-foreground">从空白画布开始创作</span>
          </button>

          {/* Template options */}
          {TEMPLATES.map((template: Template) => {
            const isSelected = selectedTemplate === template.id
            const Icon = TEMPLATE_ICONS[template.id] || Image
            return (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors text-center',
                  isSelected
                    ? 'border-accent bg-accent/10'
                    : 'border-border hover:border-accent/50 hover:bg-accent/5',
                )}
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted">
                  <Icon size={24} className="text-foreground" />
                </div>
                <span className="text-sm font-medium">{template.name}</span>
                <span className="text-xs text-muted-foreground">{template.description}</span>
              </button>
            )
          })}
        </div>

        {/* Project name input */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">项目名称</label>
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="未命名项目"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && projectName.trim()) {
                handleCreate()
              }
            }}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            取消
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!projectName.trim()}
          >
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
