// ---------------------------------------------------------------------------
// PreviewNode — output display node with thumbnail preview area
// ---------------------------------------------------------------------------

import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import { Eye } from 'lucide-react'
import { nodeTypeDefinitions } from '@ac-canvas/shared'
import { BaseNode } from './BaseNode'

function PreviewNodeComponent({ data, selected }: NodeProps) {
  const def = nodeTypeDefinitions.find(d => d.type === 'preview')!
  const generatedImageId = (data as any).generatedImageId

  return (
    <BaseNode
      type="preview"
      icon={Eye}
      label="Preview"
      selected={selected}
      sockets={def.sockets}
      accentColor="var(--color-node-preview)"
    >
      <div className="min-h-[100px] flex items-center justify-center border border-dashed border-[var(--color-hairline)] rounded-[var(--radius-md)]">
        {generatedImageId ? (
          <span className="text-[var(--color-success)] text-xs font-medium">
            Image generated
          </span>
        ) : (
          <span className="text-[var(--color-muted-foreground)] text-xs italic">
            No preview
          </span>
        )}
      </div>
    </BaseNode>
  )
}

export const PreviewNode = memo(PreviewNodeComponent)
