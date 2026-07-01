// ---------------------------------------------------------------------------
// FocusModeToggle — Segmented button group for Canvas/Node mode switch
// Active button: bg-black text-white. Inactive: bg-white text-black.
// Keyboard hint text below each label.
// ---------------------------------------------------------------------------

export type FocusMode = 'canvas' | 'nodes'

export interface FocusModeToggleProps {
  focusMode: FocusMode
  onChange: (mode: FocusMode) => void
}

function FocusModeToggle({ focusMode, onChange }: FocusModeToggleProps) {
  return (
    <div className="inline-flex rounded-[var(--radius-pill)] overflow-hidden border border-[var(--color-hairline)]">
      <button
        className={`px-4 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
          focusMode === 'canvas'
            ? 'bg-[var(--color-ink)] text-white'
            : 'bg-white text-[var(--color-ink)] hover:bg-[var(--color-surface-secondary)]'
        }`}
        onClick={() => onChange('canvas')}
      >
        Canvas
        <span className="block text-[10px] opacity-60">Ctrl+Shift+C</span>
      </button>
      <button
        className={`px-4 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
          focusMode === 'nodes'
            ? 'bg-[var(--color-ink)] text-white'
            : 'bg-white text-[var(--color-ink)] hover:bg-[var(--color-surface-secondary)]'
        }`}
        onClick={() => onChange('nodes')}
      >
        Nodes
        <span className="block text-[10px] opacity-60">Ctrl+Shift+N</span>
      </button>
    </div>
  )
}

export default FocusModeToggle
export { FocusModeToggle }
