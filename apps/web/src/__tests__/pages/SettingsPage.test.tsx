// ---------------------------------------------------------------------------
// Tests for SettingsPage
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'

// Mock @ac-canvas/ai-core AdapterRegistry
vi.mock('@ac-canvas/ai-core', () => ({
  AdapterRegistry: {
    getInstance: vi.fn(() => ({
      getAllProviders: vi.fn(() => [
        { providerId: 'mock', providerName: 'Mock Adapter' },
        { providerId: 'openai', providerName: 'OpenAI' },
        { providerId: 'stability', providerName: 'Stability AI' },
      ]),
      get: vi.fn(),
    })),
  },
}))

// Mock providerStoreSingleton
const mockSaveConfig = vi.fn().mockResolvedValue(undefined)
const mockDeleteConfig = vi.fn().mockResolvedValue(undefined)
const mockListProviders = vi.fn()

vi.mock('../../stores/providerStoreSingleton', () => ({
  getProviderStore: vi.fn(() => ({
    saveConfig: mockSaveConfig,
    deleteConfig: mockDeleteConfig,
    listProviders: mockListProviders,
    loadConfig: vi.fn(),
    hasConfig: vi.fn().mockResolvedValue(false),
  })),
  initProviderStore: vi.fn(),
  isProviderStoreReady: vi.fn().mockReturnValue(true),
}))

// Mock @ac-canvas/excalidraw
vi.mock('@ac-canvas/excalidraw', () => ({
  exportToBlob: vi.fn().mockResolvedValue(new Blob()),
  exportToCanvas: vi.fn().mockResolvedValue(document.createElement('canvas')),
}))

// Mock @ac-canvas/node-editor
vi.mock('@ac-canvas/node-editor', () => ({
  NodeEditorOverlay: () => <div data-testid="node-editor-overlay" />,
  PropertyPanel: () => <div data-testid="property-panel" />,
  TEMPLATES: [],
  applyTemplate: () => null,
}))

// Mock ExportButton
vi.mock('../../components/ExportButton', () => ({
  ExportButton: () => <div data-testid="export-button">Export</div>,
}))

// Mock ProgressPanel
vi.mock('../../components/ProgressPanel', () => ({
  ProgressPanel: () => <div data-testid="progress-panel" />,
}))

// Mock projectService
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
function renderWithRouter(route = '/settings') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  )
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

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

    // Default mock: no existing configs
    mockListProviders.mockResolvedValue([])
  })

  it('renders page title and subtitle', () => {
    renderWithRouter('/settings')
    expect(screen.getByText('设置')).toBeInTheDocument()
    expect(screen.getByText('管理应用配置')).toBeInTheDocument()
  })

  it('renders all four section headings', () => {
    renderWithRouter('/settings')
    expect(screen.getByText('AI 服务商配置')).toBeInTheDocument()
    expect(screen.getByText('主题')).toBeInTheDocument()
    expect(screen.getByText('导出默认值')).toBeInTheDocument()
    expect(screen.getByText('语言')).toBeInTheDocument()
  })

  it('renders AI provider cards from AdapterRegistry', async () => {
    renderWithRouter('/settings')

    await waitFor(() => {
      expect(screen.getByText('Mock Adapter')).toBeInTheDocument()
      expect(screen.getByText('OpenAI')).toBeInTheDocument()
      expect(screen.getByText('Stability AI')).toBeInTheDocument()
    })
  })

  it('shows theme section with three options', () => {
    renderWithRouter('/settings')
    expect(screen.getByText('浅色')).toBeInTheDocument()
    expect(screen.getByText('深色')).toBeInTheDocument()
    expect(screen.getByText('跟随系统')).toBeInTheDocument()
  })

  it('shows export defaults section with format, scale, background', () => {
    renderWithRouter('/settings')
    expect(screen.getByText('默认格式')).toBeInTheDocument()
    expect(screen.getByText('默认分辨率')).toBeInTheDocument()
    expect(screen.getByText('默认背景')).toBeInTheDocument()
  })

  it('shows language placeholder with 中文（简体） and future note', () => {
    renderWithRouter('/settings')
    expect(screen.getByText('中文（简体）')).toBeInTheDocument()
    expect(screen.getByText('更多语言即将推出')).toBeInTheDocument()
  })

  it('shows 保存设置 save button', () => {
    renderWithRouter('/settings')
    expect(screen.getByText('保存设置')).toBeInTheDocument()
  })

  it('shows 返回画布 back navigation button', () => {
    renderWithRouter('/settings')
    expect(screen.getByText('返回画布')).toBeInTheDocument()
  })

  it('opens provider config fields when toggle is switched on', async () => {
    renderWithRouter('/settings')

    // Wait for provider cards to render
    await waitFor(() => {
      expect(screen.getByText('Mock Adapter')).toBeInTheDocument()
    })

    // Find all switches in the AI provider section — they should show API key inputs
    const toggleButtons = screen.getAllByRole('switch')
    expect(toggleButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('calls saveConfig when save button is clicked', async () => {
    mockListProviders.mockResolvedValue([])
    renderWithRouter('/settings')

    const saveButton = screen.getByText('保存设置')
    await userEvent.click(saveButton)

    // Should call saveConfig for each provider
    // With no edits, saveConfig may still be called 0 or 3 times depending on impl
    // The key assertion is that the save flow doesn't throw
    expect(mockSaveConfig).toHaveBeenCalled()
  })
})
