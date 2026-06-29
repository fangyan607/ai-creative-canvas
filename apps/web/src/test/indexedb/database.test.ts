import { describe, it, expect } from 'vitest'
import { db, AICreativeCanvasDB } from '../../indexedb/db'

describe('AICreativeCanvasDB', () => {
  it('Test 1: Database schema has single projects table', () => {
    const tableNames = db.tables.map((t) => t.name)
    expect(tableNames).toEqual(['projects'])
  })

  it('Test 2: projects table has correct schema (++id, name, createdAt, updatedAt)', () => {
    const projectTable = db.tables.find((t) => t.name === 'projects')
    expect(projectTable).toBeDefined()

    // Verify the schema includes expected fields
    const schema = projectTable!.schema
    expect(schema.primKey.name).toBe('id')
    expect(schema.primKey.auto).toBe(true)

    // Check indexes exist
    const indexNames = schema.indexes.map((idx) => idx.name)
    expect(indexNames).toContain('name')
    expect(indexNames).toContain('createdAt')
    expect(indexNames).toContain('updatedAt')
  })
})
