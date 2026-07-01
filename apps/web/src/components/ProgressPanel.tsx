// ---------------------------------------------------------------------------
// ProgressPanel — Collapsible execution progress panel.
//
// D-13: A collapsible panel at the bottom of the canvas view showing AI
// queue status: queued -> processing -> done/error per node.
//
// Two states:
//   Collapsed: 32px bar showing status summary (ready / executing / errors)
//   Expanded: Slides up to show node execution details
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useEngineStore } from '@/stores/engineStore'
import { useNodeGraphStore } from '@/stores/nodeGraphStore'
import { ExecutionLog } from '@/components/ExecutionLog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Status icon mapping
// ---------------------------------------------------------------------------

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-block w-2 h-2 rounded-full',
        status === 'done' && 'bg-green-500',
        status === 'executing' && 'bg-amber-400 animate-pulse',
        status === 'pending' && 'bg-gray-400',
        status === 'idle' && 'bg-gray-300',
        status === 'error' && 'bg-red-500',
      )}
    />
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProgressPanel() {
  const [expanded, setExpanded] = useState(false)
  const nodeStatus = useEngineStore(useShallow((s) => s.nodeStatus))
  const isExecuting = useEngineStore((s) => s.isExecuting)
  const queuedNodeIds = useEngineStore(useShallow((s) => s.queuedNodeIds))
  const nodeErrors = useEngineStore(useShallow((s) => s.nodeErrors))
  const nodes = useNodeGraphStore(useShallow((s) => s.nodes))

  // Compute status summary
  const statusValues = Object.values(nodeStatus)
  const doneCount = statusValues.filter((s) => s === 'done').length
  const errorCount = Object.keys(nodeErrors).length
  const totalCount = statusValues.length

  // Resolve node name from nodeGraphStore
  const getNodeName = (nodeId: string): string => {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return nodeId.slice(0, 8)
    const data = node.data as Record<string, unknown>
    const nodeType = data?.nodeType as string | undefined
    const LABEL_MAP: Record<string, string> = {
      prompt: '提示词',
      'text-to-image': '文生图',
      style: '风格',
      merge: '合并',
      preview: '预览',
      group: '分组',
    }
    return nodeType ? LABEL_MAP[nodeType] || nodeType : nodeId.slice(0, 8)
  }

  // Build summary text
  let summaryText = '就绪'
  if (isExecuting) {
    summaryText = `执行中 (${queuedNodeIds.length}个节点)`
  } else if (errorCount > 0) {
    summaryText = `${errorCount}个错误`
  } else if (doneCount > 0) {
    summaryText = `${doneCount}/${totalCount} 完成`
  }

  return (
    <Sheet open={expanded} onOpenChange={setExpanded}>
      {/* Collapsed bar */}
      <div
        className="h-8 flex items-center gap-2 px-4 bg-secondary border-t border-border text-xs text-muted-foreground cursor-pointer shrink-0 select-none"
        onClick={() => setExpanded(true)}
      >
        {isExecuting ? (
          <StatusDot status="executing" />
        ) : errorCount > 0 ? (
          <StatusDot status="error" />
        ) : doneCount > 0 ? (
          <StatusDot status="done" />
        ) : (
          <StatusDot status="idle" />
        )}
        <span>{summaryText}</span>
      </div>

      {/* Expanded sheet panel */}
      <SheetContent side="bottom" className="h-56 p-4">
        <SheetHeader>
          <SheetTitle>执行状态</SheetTitle>
        </SheetHeader>

        <div className="mt-2 space-y-1 overflow-y-auto max-h-[120px]">
          {Object.entries(nodeStatus).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              暂无执行记录
            </p>
          )}
          {Object.entries(nodeStatus).map(([nodeId, status]) => (
            <div
              key={nodeId}
              className="flex items-center gap-3 px-2 py-1.5 rounded-md text-sm hover:bg-accent/20"
            >
              <StatusDot status={status} />
              <span className="flex-1">{getNodeName(nodeId)}</span>
              <span className="text-xs text-muted-foreground">
                {status === 'done' && '已完成'}
                {status === 'executing' && '执行中'}
                {status === 'pending' && '等待中'}
                {status === 'idle' && '待执行'}
                {status === 'error' && '错误'}
              </span>
            </div>
          ))}
        </div>

        {/* Separator */}
        {Object.entries(nodeErrors).length > 0 && (
          <div className="mt-2 border-t border-border pt-2">
            <p className="text-xs font-medium text-red-500 mb-1">错误</p>
            {Object.entries(nodeErrors).map(([nodeId, msg]) => (
              <p key={nodeId} className="text-xs text-red-400 truncate">
                {getNodeName(nodeId)}: {msg}
              </p>
            ))}
          </div>
        )}

        {/* Embedded ExecutionLog */}
        <ExecutionLog />
      </SheetContent>
    </Sheet>
  )
}
