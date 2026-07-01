// ---------------------------------------------------------------------------
// TemplateDialog — Modal dialog for quick-start template selection.
// Heading: "天从人愿" (per UI-SPEC copy contract).
// Body: card grid with 2 template options (Text-to-Image, Style Transfer).
// ---------------------------------------------------------------------------

import { useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../apps/web/src/components/ui/dialog'
import { Button } from '../../../apps/web/src/components/ui/button'
import { TEMPLATES } from './templates'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TemplateDialogProps {
  open: boolean
  onClose: () => void
  onSelect: (templateId: string) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function TemplateDialog({ open, onClose, onSelect }: TemplateDialogProps) {
  const handleSelect = useCallback(
    (templateId: string) => {
      onSelect(templateId)
      onClose()
    },
    [onSelect, onClose],
  )

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>天从人愿</DialogTitle>
          <DialogDescription>
            Choose a quick-start template to begin. This will replace your
            current node layout. You can undo this with Ctrl+Z.
          </DialogDescription>
        </DialogHeader>

        {/* Template cards */}
        <div className="grid grid-cols-1 gap-3 py-2">
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => handleSelect(template.id)}
              className="px-4 py-3 bg-[var(--color-surface-secondary)] hover:bg-[var(--color-hairline-soft)] rounded-[var(--radius-md)] cursor-pointer text-left transition-colors"
            >
              <div className="text-sm font-semibold">{template.name}</div>
              <div className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                {template.description}
              </div>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default TemplateDialog
export { TemplateDialog }
