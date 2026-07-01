// ---------------------------------------------------------------------------
// File Store — Shared model for file metadata and type utilities
// ---------------------------------------------------------------------------
// In-memory metadata store (MVP — no database). File content stored on disk
// at date-sharded subdirectories under config.uploadDir.
// ---------------------------------------------------------------------------

export interface FileRecord {
  id: string
  originalName: string
  mimeType: string
  size: number
  path: string
  uploadedAt: number
}

export const fileMetadata = new Map<string, FileRecord>()

export const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

export function getExtension(mimeType: string): string {
  if (mimeType === 'image/png') return '.png'
  if (mimeType === 'image/jpeg') return '.jpg'
  if (mimeType === 'image/webp') return '.webp'
  return '.png'
}
