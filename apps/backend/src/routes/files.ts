// ---------------------------------------------------------------------------
// File Routes — POST /api/files/upload and GET /api/files/:fileId
// ---------------------------------------------------------------------------
// Uploads are saved to date-sharded subdirectories (YYYY-MM-DD) under the
// configured uploadDir. Download validates fileId as UUID before any file
// system access (T-06-02).
// ---------------------------------------------------------------------------

import { Hono } from 'hono'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'
import { config } from '../config'
import { fileMetadata, ALLOWED_TYPES, getExtension } from '../services/fileStore'

export const filesRouter = new Hono()

const UUID_PATTERN = /^[0-9a-f-]{36}$/

// POST /api/files/upload — multipart file upload
filesRouter.post('/upload', async (c) => {
  const body = await c.req.parseBody()
  const file = body['file']

  // Validate file presence
  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No file uploaded' }, 400)
  }

  // Validate file type
  if (!ALLOWED_TYPES.has(file.type)) {
    return c.json({
      error: `Unsupported file type: ${file.type}. Allowed: PNG, JPG, WebP`,
    }, 400)
  }

  // Validate file size
  if (file.size > config.maxFileSize) {
    return c.json({ error: 'File too large. Max 10MB' }, 400)
  }

  const fileId = crypto.randomUUID()
  const dateStr = new Date().toISOString().slice(0, 10)
  const subDir = path.join(config.uploadDir, dateStr)
  await mkdir(subDir, { recursive: true })

  const ext = getExtension(file.type)
  const filePath = path.join(subDir, `${fileId}${ext}`)

  // Write file to disk
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(filePath, buffer)

  // Store metadata
  fileMetadata.set(fileId, {
    id: fileId,
    originalName: file.name,
    mimeType: file.type,
    size: file.size,
    path: filePath,
    uploadedAt: Date.now(),
  })

  return c.json({
    fileId,
    url: `/api/files/${fileId}`,
    mimeType: file.type,
    size: file.size,
  }, 201)
})

// GET /api/files/:fileId — file download
filesRouter.get('/:fileId', async (c) => {
  const fileId = c.req.param('fileId')

  // T-06-02: Validate fileId is a UUID before any file system access
  if (!UUID_PATTERN.test(fileId)) {
    return c.json({ error: 'File not found' }, 404)
  }

  // Look up metadata
  const record = fileMetadata.get(fileId)
  if (!record) {
    return c.json({ error: 'File not found' }, 404)
  }

  // T-06-02: Path traversal prevention — verify resolved path is within uploads
  const resolvedPath = path.resolve(record.path)
  const resolvedUploadDir = path.resolve(config.uploadDir)
  if (!resolvedPath.startsWith(resolvedUploadDir)) {
    return c.json({ error: 'File not found' }, 404)
  }

  try {
    const buffer = await readFile(resolvedPath)
    return c.body(buffer, 200, {
      'Content-Type': record.mimeType,
      'Content-Disposition': `inline; filename="${record.originalName}"`,
    })
  } catch {
    return c.json({ error: 'File not found on disk' }, 404)
  }
})
