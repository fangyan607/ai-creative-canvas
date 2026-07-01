// ---------------------------------------------------------------------------
// File Route Tests — POST /api/files/upload and GET /api/files/:fileId
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach } from 'vitest'
import { createApp } from '../../app'
import { fileMetadata } from '../../services/fileStore'
import { mkdir, unlink, rmdir } from 'node:fs/promises'
import path from 'node:path'
import { config } from '../../config'

const app = createApp()

describe('File Routes', () => {
  beforeEach(() => {
    // Clear metadata between tests
    fileMetadata.clear()
  })

  it('POST /api/files/upload without file returns 400', async () => {
    const formData = new FormData()
    // No file appended
    const res = await app.request('/api/files/upload', {
      method: 'POST',
      body: formData,
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('error', 'No file uploaded')
  })

  it('POST /api/files/upload with valid PNG returns 201', async () => {
    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    ])
    const file = new File([pngBytes], 'test.png', { type: 'image/png' })
    const formData = new FormData()
    formData.append('file', file)

    const res = await app.request('/api/files/upload', {
      method: 'POST',
      body: formData,
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toHaveProperty('fileId')
    expect(body).toHaveProperty('url')
    expect(body.url).toContain('/api/files/')
    expect(body).toHaveProperty('mimeType', 'image/png')
    expect(body).toHaveProperty('size', pngBytes.length)

    // Verify metadata was stored
    expect(fileMetadata.has(body.fileId)).toBe(true)
  })

  it('POST /api/files/upload with unsupported type returns 400', async () => {
    const textFile = new File(['hello'], 'test.txt', { type: 'text/plain' })
    const formData = new FormData()
    formData.append('file', textFile)

    const res = await app.request('/api/files/upload', {
      method: 'POST',
      body: formData,
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('error')
    expect(body.error).toContain('Unsupported file type')
  })

  it('POST /api/files/upload with oversize file returns 400', async () => {
    // Create a file larger than maxFileSize (10MB)
    const bigBuffer = new Uint8Array(config.maxFileSize + 1)
    const file = new File([bigBuffer], 'big.png', { type: 'image/png' })
    const formData = new FormData()
    formData.append('file', file)

    const res = await app.request('/api/files/upload', {
      method: 'POST',
      body: formData,
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('error')
    expect(body.error).toContain('File too large')
  })

  it('GET /api/files/:validFileId returns 200 with correct Content-Type', async () => {
    // First upload a file to get a valid fileId
    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    ])
    const file = new File([pngBytes], 'test.png', { type: 'image/png' })
    const formData = new FormData()
    formData.append('file', file)
    const uploadRes = await app.request('/api/files/upload', {
      method: 'POST',
      body: formData,
    })
    const { fileId } = await uploadRes.json()

    // Download the file
    const res = await app.request(`/api/files/${fileId}`, {
      method: 'GET',
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/png')
    expect(res.headers.get('Content-Disposition')).toContain('inline')
  })

  it('GET /api/files/non-existent-uuid returns 404', async () => {
    const res = await app.request('/api/files/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', {
      method: 'GET',
    })
    expect(res.status).toBe(404)
  })

  it('GET /api/files/not-a-uuid returns 404 (T-06-02)', async () => {
    const res = await app.request('/api/files/../../etc/passwd', {
      method: 'GET',
    })
    expect(res.status).toBe(404)
  })
})
