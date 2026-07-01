import { db, type ProjectRecord } from './db'

export const projectService = {
  /** Create a new project. Returns the auto-generated id. */
  async save(project: Omit<ProjectRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const now = new Date()
    const id = await db.projects.add({
      ...project,
      createdAt: now,
      updatedAt: now,
    })
    if (id === undefined) throw new Error('Failed to create project')
    return id
  },

  /** Update an existing project. Updates updatedAt timestamp. */
  async update(id: number, data: Partial<Omit<ProjectRecord, 'id' | 'createdAt'>>): Promise<void> {
    await db.projects.update(id, {
      ...data,
      updatedAt: new Date(),
    })
  },

  /** Load a project by id. */
  async load(id: number): Promise<ProjectRecord | undefined> {
    return db.projects.get(id)
  },

  /** Delete a project by id. */
  async delete(id: number): Promise<void> {
    await db.projects.delete(id)
  },

  /** List all projects ordered by most recently updated first. */
  async list(): Promise<ProjectRecord[]> {
    return db.projects
      .orderBy('updatedAt')
      .reverse()
      .toArray()
  },

  /** Check browser storage quota (D-17). */
  async checkStorage(): Promise<{
    usage: number
    quota: number
    percentUsed: number
    isPersistent: boolean
  }> {
    let usage = 0
    let quota = 0
    let isPersistent = false

    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      usage = estimate.usage ?? 0
      quota = estimate.quota ?? 0
    }

    if ('storage' in navigator && 'persisted' in navigator.storage) {
      isPersistent = await navigator.storage.persisted()
    }

    return {
      usage,
      quota,
      percentUsed: quota > 0 ? (usage / quota) * 100 : 0,
      isPersistent,
    }
  },

  /** Request persistent storage (D-17). */
  async requestPersistentStorage(): Promise<boolean> {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      return navigator.storage.persist()
    }
    return false
  },
}
