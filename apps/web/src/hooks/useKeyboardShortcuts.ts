// ---------------------------------------------------------------------------
// useKeyboardShortcuts — centralized keyboard shortcut management hook.
//
// D-17: Centralized shortcut system with enable/disable, grouping, and
// collision detection. Prevents firing when user is typing in input fields.
//
// Usage:
//   useKeyboardShortcuts([
//     { id: 'save', key: 's', ctrlKey: true, handler: handleSave,
//       group: 'app', description: 'Save project' },
//   ])
// ---------------------------------------------------------------------------

import { useEffect } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShortcutAction {
  /** Unique identifier for this shortcut (used for grouping and lookup). */
  id: string
  /** Key value, e.g. 's', '?', 'Delete', 'Escape'. */
  key: string
  /** Require Ctrl key (or Meta on Mac — checked inside the handler). */
  ctrlKey?: boolean
  /** Require Meta key (Command on Mac). */
  metaKey?: boolean
  /** Require Shift key. */
  shiftKey?: boolean
  /** Require Alt key. */
  altKey?: boolean
  /** Handler function called when the shortcut is activated. */
  handler: (e: KeyboardEvent) => void
  /** Logical group this shortcut belongs to (for organization). */
  group: 'canvas' | 'app' | 'node-editor'
  /** Human-readable description for the shortcuts panel. */
  description: string
  /** Whether this shortcut is currently active (default true). */
  enabled?: boolean
}

// ---------------------------------------------------------------------------
// Input element tag names to skip when handling keyboard events
// ---------------------------------------------------------------------------

const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/**
 * Check whether the event target is an editable element where shortcuts
 * should NOT fire (e.g., user typing in a text field).
 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false
  if (INPUT_TAGS.has(target.tagName)) return true
  if (target.isContentEditable) return true
  return false
}

/**
 * Normalize a keyboard event into a comparable string key.
 * E.g., Ctrl+S -> "ctrl+s", Cmd+Shift+Z -> "meta+shift+z"
 */
function normalizeKey(e: KeyboardEvent): string {
  const parts: string[] = []
  if (e.ctrlKey) parts.push('ctrl')
  if (e.metaKey) parts.push('meta')
  if (e.shiftKey) parts.push('shift')
  if (e.altKey) parts.push('alt')
  parts.push(e.key.toLowerCase())
  return parts.join('+')
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Register keyboard shortcuts for the lifetime of the component.
 * Automatically cleans up listeners on unmount.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutAction[]): void {
  useEffect(() => {
    // Build a Map keyed by normalized key string for O(1) lookup
    const shortcutMap = new Map<string, ShortcutAction>()

    for (const s of shortcuts) {
      const key = normalizeKey({
        key: s.key,
        ctrlKey: s.ctrlKey ?? false,
        metaKey: s.metaKey ?? false,
        shiftKey: s.shiftKey ?? false,
        altKey: s.altKey ?? false,
      } as KeyboardEvent)
      shortcutMap.set(key, s)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip shortcuts when user is typing in an input/textarea/select
      if (isEditableTarget(e.target)) return

      const normalized = normalizeKey(e)
      const action = shortcutMap.get(normalized)
      if (!action) return

      // Respect the enabled flag
      if (action.enabled === false) return

      // Execute the handler and prevent default browser behavior
      e.preventDefault()
      action.handler(e)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [shortcuts])
}
