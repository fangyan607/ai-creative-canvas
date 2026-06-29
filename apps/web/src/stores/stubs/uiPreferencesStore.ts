// Stub — Phase 7 will implement UIPreferences store
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface UIPreferencesStoreState {
  theme: 'light' | 'dark'
}

export const useUIPreferencesStore = create<UIPreferencesStoreState>()(
  immer(() => ({
    theme: 'light',
  })),
)
