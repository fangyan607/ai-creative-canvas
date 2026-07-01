// ---------------------------------------------------------------------------
// Tests for useKeyboardShortcuts hook
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKeyboardShortcuts, type ShortcutAction } from '../../hooks/useKeyboardShortcuts'

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    // Clear any previous handlers by creating a fresh document
    document.body.innerHTML = '<div id="root"></div>'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('registers a shortcut and calls handler on matching keydown', () => {
    const handler = vi.fn()
    const shortcuts: ShortcutAction[] = [
      {
        id: 'test',
        key: 's',
        ctrlKey: true,
        handler,
        group: 'app',
        description: 'Test shortcut',
      },
    ]

    renderHook(() => useKeyboardShortcuts(shortcuts))

    // Simulate Ctrl+S
    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(event)

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does NOT call handler when target is an input element', () => {
    const handler = vi.fn()
    const shortcuts: ShortcutAction[] = [
      {
        id: 'test',
        key: 's',
        ctrlKey: true,
        handler,
        group: 'app',
        description: 'Test shortcut',
      },
    ]

    renderHook(() => useKeyboardShortcuts(shortcuts))

    // Create an input and dispatch the event on it
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })
    input.dispatchEvent(event)

    expect(handler).not.toHaveBeenCalled()
  })

  it('does NOT call handler when enabled is false', () => {
    const handler = vi.fn()
    const shortcuts: ShortcutAction[] = [
      {
        id: 'test',
        key: 's',
        ctrlKey: true,
        handler,
        group: 'app',
        description: 'Test shortcut',
        enabled: false,
      },
    ]

    renderHook(() => useKeyboardShortcuts(shortcuts))

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(event)

    expect(handler).not.toHaveBeenCalled()
  })

  it('cleans up event listener on unmount', () => {
    const handler = vi.fn()
    const shortcuts: ShortcutAction[] = [
      {
        id: 'test',
        key: 's',
        ctrlKey: true,
        handler,
        group: 'app',
        description: 'Test shortcut',
      },
    ]

    const { unmount } = renderHook(() => useKeyboardShortcuts(shortcuts))
    unmount()

    // After unmount, dispatching the keydown should not call handler
    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(event)

    expect(handler).not.toHaveBeenCalled()
  })
})
