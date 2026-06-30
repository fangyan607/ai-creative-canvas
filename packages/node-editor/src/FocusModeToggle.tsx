// ---------------------------------------------------------------------------
// FocusModeToggle — Segmented button group for Canvas/Node mode switch
// ---------------------------------------------------------------------------

export type FocusMode = 'canvas' | 'nodes'

export interface FocusModeToggleProps {
  focusMode: FocusMode
  onChange: (mode: FocusMode) => void
}

function FocusModeToggle({ focusMode, onChange }: FocusModeToggleProps) {
  return (
    <div className="inline-flex rounded-[var(--radius-pill)] overflow-hidden border border-[var(--color-hairline)] shadow-sm bg-white">
      <button
        className={`px-4 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
          focusMode === 'canvas'
            ? 'bg-[var(--color-ink)] text-white'
            : 'bg-white text-[var(--color-ink)] hover:bg-[var(--color-surface-secondary)]'
        }`}
        onClick={() => onChange('canvas')}
      >
        画布
      </button>
      <button
        className={`px-4 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
          focusMode === 'nodes'
            ? 'bg-[var(--color-ink)] text-white'
            : 'bg-white text-[var(--color-ink)] hover:bg-[var(--color-surface-secondary)]'
        }`}
        onClick={() => onChange('nodes')}
      >
        节点
      </button>
    </div>
  )
}

export default FocusModeToggle
export { FocusModeToggle }
