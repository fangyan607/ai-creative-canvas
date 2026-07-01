// ---------------------------------------------------------------------------
// Tests for UIPreferencesStore
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach } from 'vitest'
import { useUIPreferencesStore } from '../../stores/stubs/uiPreferencesStore'

// Reset store before each test
beforeEach(() => {
  // Reset store state by calling setState with initial values
  useUIPreferencesStore.setState({
    theme: 'system',
    exportDefaults: { format: 'png', scale: 1, background: 'transparent' },
    sidebarCollapsed: false,
    activeTab: 'layers',
  })
})

describe('uiPreferencesStore', () => {
  it('initializes with default values', () => {
    const state = useUIPreferencesStore.getState()
    expect(state.theme).toBe('system')
    expect(state.sidebarCollapsed).toBe(false)
    expect(state.activeTab).toBe('layers')
    expect(state.exportDefaults).toEqual({
      format: 'png',
      scale: 1,
      background: 'transparent',
    })
  })

  it('setTheme changes the theme value', () => {
    const { setTheme } = useUIPreferencesStore.getState()
    setTheme('dark')
    expect(useUIPreferencesStore.getState().theme).toBe('dark')

    setTheme('light')
    expect(useUIPreferencesStore.getState().theme).toBe('light')

    setTheme('system')
    expect(useUIPreferencesStore.getState().theme).toBe('system')
  })

  it('toggleSidebar toggles the collapsed state', () => {
    const { toggleSidebar } = useUIPreferencesStore.getState()

    // Initial: false
    expect(useUIPreferencesStore.getState().sidebarCollapsed).toBe(false)

    toggleSidebar()
    expect(useUIPreferencesStore.getState().sidebarCollapsed).toBe(true)

    toggleSidebar()
    expect(useUIPreferencesStore.getState().sidebarCollapsed).toBe(false)
  })

  it('setExportDefaults updates individual fields', () => {
    const { setExportDefaults } = useUIPreferencesStore.getState()

    setExportDefaults({ format: 'jpg' })
    expect(useUIPreferencesStore.getState().exportDefaults).toEqual({
      format: 'jpg',
      scale: 1,
      background: 'transparent',
    })

    setExportDefaults({ scale: 2, background: 'white' })
    expect(useUIPreferencesStore.getState().exportDefaults).toEqual({
      format: 'jpg',
      scale: 2,
      background: 'white',
    })
  })

  it('setActiveTab changes the active tab', () => {
    const { setActiveTab } = useUIPreferencesStore.getState()

    setActiveTab('assets')
    expect(useUIPreferencesStore.getState().activeTab).toBe('assets')

    setActiveTab('properties')
    expect(useUIPreferencesStore.getState().activeTab).toBe('properties')

    setActiveTab('layers')
    expect(useUIPreferencesStore.getState().activeTab).toBe('layers')
  })

  it('persist middleware serializes to localStorage', () => {
    const { setTheme, setActiveTab, toggleSidebar } = useUIPreferencesStore.getState()

    setTheme('dark')
    setActiveTab('properties')
    toggleSidebar()

    // Check that Zustand persist saved to localStorage
    const raw = localStorage.getItem('ui-preferences')
    expect(raw).not.toBeNull()

    const parsed = JSON.parse(raw!)
    expect(parsed.state.theme).toBe('dark')
    expect(parsed.state.activeTab).toBe('properties')
    expect(parsed.state.sidebarCollapsed).toBe(true)
  })
})
