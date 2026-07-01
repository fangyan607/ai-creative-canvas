// ---------------------------------------------------------------------------
// MergeNode — composition node with 2 input sockets and 1 output socket
// ---------------------------------------------------------------------------

import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import { Layers } from 'lucide-react'
import { nodeTypeDefinitions } from '@ac-canvas/shared'
import { BaseNode } from './BaseNode'

function MergeNodeComponent({ data, selected }: NodeProps) {
  const def = nodeTypeDefinitions.find(d => d.type === 'merge')!

  return (
    <BaseNode
      type="merge"
      icon={Layers}
      label="Merge"
      selected={selected}
      sockets={def.sockets}
      accentColor="var(--color-node-merge)"
    >
      <div className="text-xs text-[var(--color-muted-foreground)] text-center">
        2 inputs
      </div>
    </BaseNode>
  )
}

export const MergeNode = memo(MergeNodeComponent)
