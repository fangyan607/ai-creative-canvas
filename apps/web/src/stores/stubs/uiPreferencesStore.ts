// ---------------------------------------------------------------------------
// UIPreferencesStore — persisted user preferences (theme, sidebar, export
// defaults, active sidebar tab). Uses Zustand persist middleware with
// localStorage so values survive page reload.
//
// D-11: Dark mode with light/dark/system options.
// D-04: Collapsible sidebar (288px expanded / 44px icon-only).
// D-03: Left unified panel with tab switching (Layers/Assets/Properties).
// D-10: Export default preferences (format, scale, background).
// ---------------------------------------------------------------------------

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Theme = 'light' | 'dark' | 'system'
export type ExportFormat = 'png' | 'jpg'
export type ExportScale = 1 | 2 | 3
export type ExportBackground = 'transparent' | 'white'
export type SidebarTab = 'layers' | 'assets' | 'properties'

export interface ExportDefaults {
  format: ExportFormat
  scale: ExportScale
  background: ExportBackground
}

export interface UIPreferencesStoreState {
  /** Theme preference. 'system' follows OS prefers-color-scheme. */
  theme: Theme
  /** Default export configuration for the one-click export button. */
  exportDefaults: ExportDefaults
  /** Whether the left sidebar is collapsed to icon-only state. */
  sidebarCollapsed: boolean
  /** Currently active tab in the left sidebar. */
  activeTab: SidebarTab

  // Actions
  setTheme: (theme: Theme) => void
  setExportDefaults: (defaults: Partial<ExportDefaults>) => void
  toggleSidebar: () => void
  setActiveTab: (tab: SidebarTab) => void
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useUIPreferencesStore = create<UIPreferencesStoreState>()(
  persist(
    immer((set) => ({
      // Default values
      theme: 'system',
      exportDefaults: {
        format: 'png',
        scale: 1,
        background: 'transparent',
      },
      sidebarCollapsed: false,
      activeTab: 'layers',

      // Actions
      setTheme: (theme) =>
        set((state) => {
          state.theme = theme
        }),

      setExportDefaults: (defaults) =>
        set((state) => {
          if (defaults.format !== undefined) state.exportDefaults.format = defaults.format
          if (defaults.scale !== undefined) state.exportDefaults.scale = defaults.scale
          if (defaults.background !== undefined) state.exportDefaults.background = defaults.background
        }),

      toggleSidebar: () =>
        set((state) => {
          state.sidebarCollapsed = !state.sidebarCollapsed
        }),

      setActiveTab: (tab) =>
        set((state) => {
          state.activeTab = tab
        }),
    })),
    {
      name: 'ui-preferences',
    },
  ),
)
