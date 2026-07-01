// ---------------------------------------------------------------------------
// Tests for ShortcutPanel
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ShortcutPanel } from '../../components/ShortcutPanel'
import { shortcutRegistry } from '../../hooks/useKeyboardShortcuts'

describe('ShortcutPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear registry
    shortcutRegistry.length = 0
  })

  it('renders with title when open', () => {
    render(<ShortcutPanel open={true} onOpenChange={vi.fn()} />)
    expect(screen.getByText('键盘快捷键')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    const { container } = render(
      <ShortcutPanel open={false} onOpenChange={vi.fn()} />,
    )
    expect(container.textContent).not.toContain('键盘快捷键')
  })

  it('shows search input with placeholder', () => {
    render(<ShortcutPanel open={true} onOpenChange={vi.fn()} />)
    expect(
      screen.getByPlaceholderText('搜索快捷键...'),
    ).toBeInTheDocument()
  })

  it('renders shortcuts from registry grouped by category', () => {
    // Pre-populate the registry
    shortcutRegistry.push(
      {
        id: 'save',
        key: 's',
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        group: 'app',
        description: '保存项目',
      },
      {
        id: 'export',
        key: 'e',
        ctrlKey: true,
        metaKey: false,
        shiftKey: true,
        altKey: false,
        group: 'app',
        description: '导出画布',
      },
      {
        id: 'undo',
        key: 'z',
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        group: 'canvas',
        description: '撤销',
      },
    )

    render(<ShortcutPanel open={true} onOpenChange={vi.fn()} />)
    expect(screen.getByText('保存项目')).toBeInTheDocument()
    expect(screen.getByText('导出画布')).toBeInTheDocument()
    expect(screen.getByText('撤销')).toBeInTheDocument()
  })

  it('groups shortcuts by category with Chinese group labels', () => {
    shortcutRegistry.push(
      {
        id: 'save',
        key: 's',
        ctrlKey: true,
        group: 'app',
        description: '保存项目',
      },
      {
        id: 'undo',
        key: 'z',
        ctrlKey: true,
        group: 'canvas',
        description: '撤销',
      },
    )

    render(<ShortcutPanel open={true} onOpenChange={vi.fn()} />)
    expect(screen.getByText('应用')).toBeInTheDocument()
    expect(screen.getByText('画布')).toBeInTheDocument()
  })

  it('filters shortcuts by search input', async () => {
    const user = userEvent.setup()
    shortcutRegistry.push(
      {
        id: 'save',
        key: 's',
        ctrlKey: true,
        group: 'app',
        description: '保存项目',
      },
      {
        id: 'export',
        key: 'e',
        ctrlKey: true,
        shiftKey: true,
        group: 'app',
        description: '导出画布',
      },
    )

    render(<ShortcutPanel open={true} onOpenChange={vi.fn()} />)
    expect(screen.getByText('保存项目')).toBeInTheDocument()
    expect(screen.getByText('导出画布')).toBeInTheDocument()

    const searchInput = screen.getByPlaceholderText('搜索快捷键...')
    await user.type(searchInput, '导出')

    expect(screen.getByText('导出画布')).toBeInTheDocument()
    expect(screen.queryByText('保存项目')).not.toBeInTheDocument()
  })

  it('calls onOpenChange(false) when dialog is closed', async () => {
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(<ShortcutPanel open={true} onOpenChange={onOpenChange} />)

    // Click cancel/close button
    const closeButtons = screen.getAllByRole('button')
    // Find the close button (has XIcon)
    for (const btn of closeButtons) {
      if (btn.closest('[data-slot="dialog-close"]')) {
        await user.click(btn)
        break
      }
    }

    // If we didn't find the close button, try clicking backdrop
    expect(onOpenChange).toHaveBeenCalled()
  })
})
