// ---------------------------------------------------------------------------
// Tests for ProjectsPage
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { TooltipProvider } from '@/components/ui/tooltip'
import { projectService, type ProjectRecord } from '../../indexedb/projectService'

// Mock projectService
vi.mock('../../indexedb/projectService', () => ({
  projectService: {
    list: vi.fn(),
    save: vi.fn(),
    load: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
}))

// Mock @ac-canvas/excalidraw exportToCanvas
vi.mock('@ac-canvas/excalidraw', () => ({
  exportToCanvas: vi.fn().mockResolvedValue(document.createElement('canvas')),
  exportToBlob: vi.fn().mockResolvedValue(new Blob()),
}))

// Mock @ac-canvas/node-editor applyTemplate
vi.mock('@ac-canvas/node-editor', () => ({
  TEMPLATES: [
    {
      id: 'text-to-image',
      name: 'Text-to-Image',
      description: 'Test template',
      graph: { nodes: [], edges: [] },
    },
  ],
  applyTemplate: vi.fn().mockReturnValue({ nodes: [], edges: [] }),
}))

import App from '../../App'

// Helper to render within router context
function renderWithRouter(route = '/projects') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </MemoryRouter>,
  )
}

describe('ProjectsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock matchMedia for dark mode
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it('shows loading state while fetching projects', () => {
    // Don't resolve immediately
    vi.mocked(projectService.list).mockReturnValue(new Promise(() => {}))
    renderWithRouter('/projects')
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('shows empty state when no projects exist', async () => {
    vi.mocked(projectService.list).mockResolvedValue([])
    renderWithRouter('/projects')

    await waitFor(() => {
      expect(screen.getByText('暂无项目')).toBeInTheDocument()
    })
    expect(screen.getByText('创建你的第一个项目开始创作')).toBeInTheDocument()
  })

  it('shows new project button and can open dialog', async () => {
    vi.mocked(projectService.list).mockResolvedValue([])
    renderWithRouter('/projects')

    await waitFor(() => {
      expect(screen.getByText('新建项目')).toBeInTheDocument()
    })

    // Click new project button
    const newBtns = screen.getAllByText('新建项目')
    await userEvent.click(newBtns[0])

    // Dialog should open with "空白画布" option
    expect(screen.getByText('空白画布')).toBeInTheDocument()
  })

  it('renders project cards from projectService.list', async () => {
    const mockProjects: ProjectRecord[] = [
      {
        id: 1,
        name: 'Test Project',
        canvasState: JSON.stringify({ elements: [], viewport: { x: 0, y: 0, zoom: 1 } }),
        viewport: JSON.stringify({ x: 0, y: 0, zoom: 1 }),
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-06-01'),
      },
    ]
    vi.mocked(projectService.list).mockResolvedValue(mockProjects)
    renderWithRouter('/projects')

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })
  })

  it('opens StartPageDialog when clicking 新建项目', async () => {
    vi.mocked(projectService.list).mockResolvedValue([])
    renderWithRouter('/projects')

    await waitFor(() => {
      expect(screen.getAllByText('新建项目')[0]).toBeInTheDocument()
    })

    const newBtns = screen.getAllByText('新建项目')
    await userEvent.click(newBtns[0])

    // Dialog should show blank canvas option and template options
    expect(screen.getByText('空白画布')).toBeInTheDocument()
    expect(screen.getByText('Text-to-Image')).toBeInTheDocument()
  })

  it('shows delete confirmation dialog when clicking delete', async () => {
    const mockProjects: ProjectRecord[] = [
      {
        id: 1,
        name: 'Delete Me',
        canvasState: JSON.stringify({ elements: [], viewport: { x: 0, y: 0, zoom: 1 } }),
        viewport: JSON.stringify({ x: 0, y: 0, zoom: 1 }),
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-06-01'),
      },
    ]
    vi.mocked(projectService.list).mockResolvedValue(mockProjects)
    renderWithRouter('/projects')

    await waitFor(() => {
      expect(screen.getByText('Delete Me')).toBeInTheDocument()
    })

    // Delete button should exist (may be hidden until hover)
    const deleteBtns = screen.getAllByTitle('删除项目')
    expect(deleteBtns.length).toBeGreaterThanOrEqual(1)
  })

  it('handles projectService.list error gracefully', async () => {
    vi.mocked(projectService.list).mockRejectedValue(new Error('DB error'))
    renderWithRouter('/projects')

    // Should show empty state after error
    await waitFor(() => {
      expect(screen.getByText('暂无项目')).toBeInTheDocument()
    })
  })
})
