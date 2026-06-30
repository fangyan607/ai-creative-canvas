// ---------------------------------------------------------------------------
// StyleNode — style reference node showing reference status
// ---------------------------------------------------------------------------

import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import { Palette } from 'lucide-react'
import { nodeTypeDefinitions } from '@ac-canvas/shared'
import { BaseNode } from './BaseNode'

function StyleNodeComponent({ data, selected }: NodeProps) {
  const def = nodeTypeDefinitions.find(d => d.type === 'style')!
  const styleReferenceId = (data as any).styleReferenceId

  return (
    <BaseNode
      type="style"
      icon={Palette}
      label="Style"
      selected={selected}
      sockets={def.sockets}
      accentColor="var(--color-node-style)"
    >
      <div className="text-xs">
        {styleReferenceId ? (
          <span className="text-[var(--color-success)]">Reference set</span>
        ) : (
          <span className="text-[var(--color-muted-foreground)] italic">
            No style reference
          </span>
        )}
      </div>
    </BaseNode>
  )
}

export const StyleNode = memo(StyleNodeComponent)
