// ---------------------------------------------------------------------------
// Tests for ExportDialog
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { TooltipProvider } from '@/components/ui/tooltip'

// Mock exportToBlob
vi.mock('@ac-canvas/excalidraw', () => ({
  exportToBlob: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'image/png' })),
}))

import { ExportDialog } from '../../components/ExportDialog'

describe('ExportDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all controls when open', () => {
    render(
      <MemoryRouter>
        <TooltipProvider>
          <ExportDialog open={true} onOpenChange={() => {}} />
        </TooltipProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('导出画布')).toBeInTheDocument()
    expect(screen.getByText('格式')).toBeInTheDocument()
    expect(screen.getByText('缩放')).toBeInTheDocument()
    expect(screen.getByText('背景')).toBeInTheDocument()
  })

  it('renders export and cancel buttons', () => {
    render(
      <MemoryRouter>
        <TooltipProvider>
          <ExportDialog open={true} onOpenChange={() => {}} />
        </TooltipProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('导出')).toBeInTheDocument()
    expect(screen.getByText('取消')).toBeInTheDocument()
  })

  it('calls onOpenChange when cancel is clicked', async () => {
    const onOpenChange = vi.fn()
    render(
      <MemoryRouter>
        <TooltipProvider>
          <ExportDialog open={true} onOpenChange={onOpenChange} />
        </TooltipProvider>
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByText('取消'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('shows format options', () => {
    render(
      <MemoryRouter>
        <TooltipProvider>
          <ExportDialog open={true} onOpenChange={() => {}} />
        </TooltipProvider>
      </MemoryRouter>,
    )

    // Select trigger should show default PNG
    const triggers = screen.getAllByRole('combobox')
    expect(triggers.length).toBeGreaterThanOrEqual(1)
  })

  it('closes when onOpenChange(false) is triggered', async () => {
    const onOpenChange = vi.fn()
    const { rerender } = render(
      <MemoryRouter>
        <TooltipProvider>
          <ExportDialog open={true} onOpenChange={onOpenChange} />
        </TooltipProvider>
      </MemoryRouter>,
    )

    // Rerender with open=false
    rerender(
      <MemoryRouter>
        <TooltipProvider>
          <ExportDialog open={false} onOpenChange={onOpenChange} />
        </TooltipProvider>
      </MemoryRouter>,
    )

    // Dialog content should not be in the document
    await waitFor(() => {
      expect(screen.queryByText('导出画布')).not.toBeInTheDocument()
    })
  })
})
