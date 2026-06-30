// ---------------------------------------------------------------------------
// TextToImageNode — generation node showing model/size configuration
// ---------------------------------------------------------------------------

import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import { WandSparkles } from 'lucide-react'
import { nodeTypeDefinitions } from '@ac-canvas/shared'
import { BaseNode } from './BaseNode'

function TextToImageNodeComponent({ data, selected }: NodeProps) {
  const def = nodeTypeDefinitions.find(d => d.type === 'text-to-image')!
  const model = (data as any).model
  const width = (data as any).width
  const height = (data as any).height

  return (
    <BaseNode
      type="text-to-image"
      icon={WandSparkles}
      label="Text to Image"
      selected={selected}
      sockets={def.sockets}
      accentColor="var(--color-node-text-to-image)"
    >
      {model ? (
        <div className="text-xs text-[var(--color-muted-foreground)]">
          <span className="font-medium">{model}</span>
          {width && height && (
            <span> &middot; {width}x{height}</span>
          )}
        </div>
      ) : (
        <div className="text-xs text-[var(--color-muted-foreground)] italic">
          No model configured
        </div>
      )}
    </BaseNode>
  )
}

export const TextToImageNode = memo(TextToImageNodeComponent)
