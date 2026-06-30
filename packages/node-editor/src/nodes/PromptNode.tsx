// ---------------------------------------------------------------------------
// PromptNode — text input node with textarea for prompt entry
// ---------------------------------------------------------------------------

import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import { MessageSquareText } from 'lucide-react'
import { nodeTypeDefinitions } from '@ac-canvas/shared'
import { BaseNode } from './BaseNode'

function PromptNodeComponent({ data, selected }: NodeProps) {
  const def = nodeTypeDefinitions.find(d => d.type === 'prompt')!
  return (
    <BaseNode
      type="prompt"
      icon={MessageSquareText}
      label="Prompt"
      selected={selected}
      sockets={def.sockets}
      accentColor="var(--color-node-prompt)"
    >
      <textarea
        className="w-full text-sm p-2 border border-[var(--color-hairline)] rounded-[var(--radius-md)] min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
        placeholder="Enter your prompt..."
        defaultValue={(data as any).prompt}
      />
    </BaseNode>
  )
}

export const PromptNode = memo(PromptNodeComponent)
