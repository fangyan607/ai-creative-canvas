// Stub — Phase 3/5 will implement AI Queue store
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface AIQueueStoreState {
  items: unknown[]
}

export const useAIQueueStore = create<AIQueueStoreState>()(
  immer(() => ({
    items: [],
  })),
)
