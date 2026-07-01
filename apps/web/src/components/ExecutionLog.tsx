// ---------------------------------------------------------------------------
// ExecutionLog — Execution history panel showing node execution state.
//
// D-14: Shows node execution state as a scrollable log with timestamps,
// duration, output summary, error messages.
//
// For MVP, derives data from EngineStore's current state (nodeStatus,
// nodeErrors, lastExecutedAt) since a full history trail is not persisted.
// ---------------------------------------------------------------------------

import { useShallow } from 'zustand/react/shallow'
import { useEngineStore } from '@/stores/engineStore'
import { useNodeGraphStore } from '@/stores/nodeGraphStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Status badge styles
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
  done: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  executing: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  pending: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  idle: 'bg-gray-50 text-gray-400 dark:bg-gray-800/50 dark:text-gray-500',
  error: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
}

const STATUS_LABELS: Record<string, string> = {
  done: '完成',
  executing: '执行中',
  pending: '等待',
  idle: '就绪',
  error: '错误',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExecutionLog() {
  const nodeStatus = useEngineStore(useShallow((s) => s.nodeStatus))
  const nodeErrors = useEngineStore(useShallow((s) => s.nodeErrors))
  const lastExecutedAt = useEngineStore((s) => s.lastExecutedAt)
  const clearAll = useEngineStore((s) => s.clearAll)
  const nodes = useNodeGraphStore(useShallow((s) => s.nodes))
  const nodeEntries = Object.entries(nodeStatus)

  // Resolve node name
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

  return (
    <div className="mt-2 border-t border-border pt-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium text-muted-foreground">执行日志</p>
        <Button
          variant="ghost"
          size="xs"
          onClick={clearAll}
          className="text-xs text-muted-foreground"
        >
          清除
        </Button>
      </div>

      {/* Timestamp */}
      {lastExecutedAt && (
        <p className="text-[10px] text-muted-foreground mb-1">
          上次执行: {new Date(lastExecutedAt).toLocaleTimeString('zh-CN')}
        </p>
      )}

      {/* Log entries */}
      <div className="space-y-0.5 max-h-[80px] overflow-y-auto">
        {nodeEntries.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            暂无执行记录
          </p>
        )}
        {nodeEntries.map(([nodeId, status]) => (
          <div
            key={nodeId}
            className="flex items-center gap-2 px-1.5 py-1 rounded text-xs"
          >
            <span
              className={cn(
                'inline-block px-1.5 py-0.5 rounded font-medium',
                STATUS_STYLES[status] || STATUS_STYLES.idle,
              )}
            >
              {STATUS_LABELS[status] || status}
            </span>
            <span className="text-foreground">{getNodeName(nodeId)}</span>
            {nodeErrors[nodeId] && (
              <span className="text-red-500 truncate ml-auto max-w-[120px]">
                {nodeErrors[nodeId]}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
