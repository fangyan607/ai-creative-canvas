// ---------------------------------------------------------------------------
// StyleNode — style reference node showing reference status
// ---------------------------------------------------------------------------

import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import { Palette } from 'lucide-react'
import { nodeTypeDefinitions } from '@ac-canvas/shared'
import { useEngineStore } from '../../../../apps/web/src/stores/engineStore'
import { BaseNode } from './BaseNode'

function StyleNodeComponent({ id, data, selected }: NodeProps) {
  const def = nodeTypeDefinitions.find(d => d.type === 'style')!
  const status = useEngineStore((s) => s.nodeStatus[id])
  const styleReferenceId = (data as any).styleReferenceId

  return (
    <BaseNode
      type="style"
      icon={Palette}
      label="Style"
      selected={selected}
      status={status}
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
