// ---------------------------------------------------------------------------
// PromptEditor — Visual prompt template editor with live preview and
// IndexedDB persistence.
//
// D-16: Visual prompt template editor with live preview, variable editing,
// and IndexedDB persistence.
// D-12: Phase 4 template system: Template interface, {{variable}} syntax.
// ---------------------------------------------------------------------------

import { useState, useCallback, useMemo } from 'react'
import { db, type PromptTemplateRecord } from '@/indexedb/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PromptEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templateId?: string  // For editing existing template (future use)
  onSaved?: () => void // Callback after successful save
}

// ---------------------------------------------------------------------------
// Helper: extract {{variable}} names from template text
// ---------------------------------------------------------------------------

function extractVariables(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g)
  return [...new Set(matches?.map((m) => m.slice(2, -2)) ?? [])]
}

// ---------------------------------------------------------------------------
// Helper: simple template render for preview (Handlebars-compatible)
// ---------------------------------------------------------------------------

function renderPreview(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return variables[key] ?? `{{${key}}}`
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PromptEditor({
  open,
  onOpenChange,
  templateId: _templateId,
  onSaved,
}: PromptEditorProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [template, setTemplate] = useState('')
  const [sampleValues, setSampleValues] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const variables = useMemo(() => extractVariables(template), [template])

  // Update sample value for a variable
  const setSampleValue = useCallback((variable: string, value: string) => {
    setSampleValues((prev) => ({ ...prev, [variable]: value }))
  }, [])

  // Compute live preview
  const preview = useMemo(() => {
    if (!template.trim()) return ''
    try {
      return renderPreview(template, sampleValues)
    } catch {
      setError('模板语法错误')
      return ''
    }
  }, [template, sampleValues])

  // Clear error when template changes
  const handleTemplateChange = useCallback((value: string) => {
    setTemplate(value)
    setError(null)
  }, [])

  // Reset form state when dialog opens
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setName('')
        setDescription('')
        setTemplate('')
        setSampleValues({})
        setError(null)
      }
      onOpenChange(newOpen)
    },
    [onOpenChange],
  )

  // Save template to IndexedDB
  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setError('请输入模板名称')
      return
    }
    if (!template.trim()) {
      setError('请输入模板内容')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const now = new Date()
      const record = {
        name: name.trim(),
        description: description.trim(),
        template: template.trim(),
        variables: JSON.stringify(variables),
        tags: JSON.stringify([]),
        createdAt: now,
        updatedAt: now,
      }

      await db.promptTemplates.put(record as any)

      handleOpenChange(false)
      onSaved?.()
    } catch {
      setError('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }, [name, description, template, variables, handleOpenChange, onSaved])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>提示词模板编辑器</DialogTitle>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden min-h-0">
          {/* Left panel: template editing */}
          <div className="flex flex-col gap-3 overflow-y-auto pr-1">
            {/* Template name */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">模板名称</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="模板名称"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">描述</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="模板描述（可选）"
              />
            </div>

            {/* Template text */}
            <div className="space-y-1 flex-1">
              <label className="text-xs text-muted-foreground">模板内容</label>
              <textarea
                value={template}
                onChange={(e) => handleTemplateChange(e.target.value)}
                placeholder="输入模板内容，使用 {{variable}} 语法"
                className="w-full h-[180px] rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm font-mono transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
                spellCheck={false}
              />
            </div>

            {/* Variables section */}
            {variables.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">
                  变量 ({variables.length})
                </label>
                <div className="space-y-1.5">
                  {variables.map((v) => (
                    <div key={v} className="flex items-center gap-2">
                      <span className="text-xs font-mono text-foreground min-w-[80px]">
                        {v}
                      </span>
                      <Input
                        value={sampleValues[v] ?? ''}
                        onChange={(e) => setSampleValue(v, e.target.value)}
                        placeholder="示例值"
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right panel: live preview */}
          <div className="flex flex-col gap-2 overflow-y-auto pr-1">
            <span className="text-xs text-muted-foreground font-medium">预览</span>
            <div className="flex-1 rounded-lg border border-border bg-card p-3 min-h-[120px]">
              {preview ? (
                <p className="text-sm text-foreground whitespace-pre-wrap">{preview}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  输入模板内容后在此处预览
                </p>
              )}
            </div>
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存模板'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
