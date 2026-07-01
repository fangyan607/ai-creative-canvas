// ---------------------------------------------------------------------------
// Tests for AppShell layout
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'

// Mock CanvasWrapper and NodeEditorOverlay — they import Excalidraw which
// requires canvas API (not available in jsdom)
vi.mock('../../components/CanvasWrapper', () => ({
  CanvasWrapper: () => <div data-testid="canvas-wrapper">Canvas</div>,
}))

vi.mock('@ac-canvas/node-editor', () => ({
  NodeEditorOverlay: () => <div data-testid="node-editor-overlay" />,
  PropertyPanel: () => <div data-testid="property-panel" />,
  TEMPLATES: [],
  applyTemplate: () => null,
}))

// Mock @ac-canvas/excalidraw — ExportButton imports exportToBlob which uses
// canvas API (not available in jsdom)
vi.mock('@ac-canvas/excalidraw', () => ({
  exportToBlob: vi.fn().mockResolvedValue(new Blob()),
  exportToCanvas: vi.fn().mockResolvedValue(document.createElement('canvas')),
}))

// Mock projectStore — TopBar now reads from it instead of props
vi.mock('../../stores/projectStore', () => ({
  useProjectStore: vi.fn((selector) => {
    const state = {
      currentProjectName: '无标题项目',
      currentProjectId: null,
      isSaving: false,
      setProjectName: vi.fn(),
      setProjectId: vi.fn(),
      setIsSaving: vi.fn(),
      setCurrentProject: vi.fn(),
    }
    return selector ? selector(state) : state
  }),
}))

// Mock ExportButton — included in TopBar
vi.mock('../../components/ExportButton', () => ({
  ExportButton: () => <div data-testid="export-button">Export</div>,
}))

// Mock ProgressPanel — included in CanvasPage
vi.mock('../../components/ProgressPanel', () => ({
  ProgressPanel: () => <div data-testid="progress-panel" />,
}))

// Mock projectService — ProjectsPage imports it
vi.mock('../../indexedb/projectService', () => ({
  projectService: {
    list: vi.fn().mockResolvedValue([]),
    save: vi.fn(),
    load: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
}))

import App from '../../App'

// Helper to render within router context
function renderWithRouter(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </MemoryRouter>,
  )
}

describe('AppShell', () => {
  beforeEach(() => {
    // Mock matchMedia for dark mode system preference
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

  it('renders TopBar with app name and project name', () => {
    renderWithRouter('/')
    expect(screen.getByText('AI创意画布')).toBeInTheDocument()
    expect(screen.getByText('无标题项目')).toBeInTheDocument()
  })

  it('renders TabbedSidebar with three tab labels (labels appear in both expanded and collapsed state)', () => {
    renderWithRouter('/')
    // Tab labels appear in both expanded sidebar and tooltips (both in DOM)
    expect(screen.getAllByText('图层').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('素材').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('属性').length).toBeGreaterThanOrEqual(1)
  })

  it('renders canvas route content at index route', () => {
    renderWithRouter('/')
    expect(screen.getByTestId('canvas-wrapper')).toBeInTheDocument()
  })

  it('renders ProjectsPage at /projects', () => {
    renderWithRouter('/projects')
    expect(screen.getByText('暂无项目')).toBeInTheDocument()
  })

  it('renders SettingsPage at /settings', () => {
    renderWithRouter('/settings')
    expect(screen.getByText('设置')).toBeInTheDocument()
  })

  it('renders view switcher buttons in TopBar', () => {
    renderWithRouter('/')
    expect(screen.getByTitle('画布')).toBeInTheDocument()
    expect(screen.getByTitle('项目')).toBeInTheDocument()
    expect(screen.getByTitle('设置')).toBeInTheDocument()
  })

  it('shows save status text', () => {
    renderWithRouter('/')
    expect(screen.getByText('已保存')).toBeInTheDocument()
  })
})
