// ---------------------------------------------------------------------------
// ShortcutPanel — Searchable modal panel listing all registered keyboard
// shortcuts.
//
// D-18: Shortcut discovery panel accessible via ? key.
// Reads from shortcutRegistry static array populated by useKeyboardShortcuts.
// ---------------------------------------------------------------------------

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { shortcutRegistry, type ShortcutDefinition } from '@/hooks/useKeyboardShortcuts'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Group label mapping
// ---------------------------------------------------------------------------

const GROUP_LABELS: Record<string, string> = {
  app: '应用',
  canvas: '画布',
  'node-editor': '节点编辑',
}

const DEFAULT_GROUP_LABEL = '其他'

// ---------------------------------------------------------------------------
// Helper: format key combination as display string
// ---------------------------------------------------------------------------

function formatKeyCombo(s: ShortcutDefinition): string {
  const parts: string[] = []
  if (s.ctrlKey) parts.push('Ctrl')
  if (s.metaKey) parts.push('Cmd')
  if (s.shiftKey) parts.push('Shift')
  if (s.altKey) parts.push('Alt')
  parts.push(s.key === '?' ? '?' : s.key.charAt(0).toUpperCase() + s.key.slice(1))
  return parts.join(' + ')
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ShortcutPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShortcutPanel({ open, onOpenChange }: ShortcutPanelProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return shortcutRegistry
    const q = search.toLowerCase()
    return shortcutRegistry.filter(
      (s) =>
        s.description.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.key.toLowerCase().includes(q),
    )
  }, [search])

  const grouped = useMemo(() => {
    const map = new Map<string, ShortcutDefinition[]>()
    for (const s of filtered) {
      const label = GROUP_LABELS[s.group] || DEFAULT_GROUP_LABEL
      if (!map.has(label)) map.set(label, [])
      map.get(label)!.push(s)
    }
    return map
  }, [filtered])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>键盘快捷键</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索快捷键..."
          className="mb-2"
          autoFocus
        />

        {/* Shortcut list */}
        <div className="flex-1 overflow-y-auto -mx-4 px-4">
          {grouped.size === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              无匹配结果
            </p>
          ) : (
            Array.from(grouped.entries()).map(([groupLabel, items]) => (
              <div key={groupLabel} className="mb-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {groupLabel}
                </h3>
                <div className="space-y-1">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm text-foreground">
                        {item.description}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground bg-muted rounded-sm px-1.5 py-0.5 whitespace-nowrap">
                        {formatKeyCombo(item)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
