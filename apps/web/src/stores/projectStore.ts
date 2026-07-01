// ---------------------------------------------------------------------------
// ProjectStore — lightweight Zustand store for current project state.
//
// Stores the currently active project ID and name, and whether a save
// operation is in progress. Flat state so no immer needed.
// ---------------------------------------------------------------------------

import { create } from 'zustand'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProjectStoreState {
  /** ID of the currently open project, or null if no project is loaded. */
  currentProjectId: number | null
  /** Name of the currently open project. */
  currentProjectName: string
  /** Whether a save operation is currently in progress. */
  isSaving: boolean

  // Actions
  setCurrentProject: (id: number | null, name: string) => void
  setIsSaving: (saving: boolean) => void
  setProjectName: (name: string) => void
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useProjectStore = create<ProjectStoreState>()((set) => ({
  currentProjectId: null,
  currentProjectName: '无标题项目',
  isSaving: false,

  setCurrentProject: (id, name) =>
    set({ currentProjectId: id, currentProjectName: name }),

  setIsSaving: (saving) =>
    set({ isSaving: saving }),

  setProjectName: (name) =>
    set({ currentProjectName: name }),
}))
