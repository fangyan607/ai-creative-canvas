// ---------------------------------------------------------------------------
// Backend Configuration — typed env-var reader
// ---------------------------------------------------------------------------

export interface BackendConfig {
  port: number
  uploadDir: string
  aiKeys: Record<string, string>
  maxFileSize: number
}

export const config: BackendConfig = {
  port: Number(process.env.PORT) || 3001,
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  aiKeys: {
    openai: process.env.AI_OPENAI_KEY || '',
    stability: process.env.AI_STABILITY_KEY || '',
  },
  maxFileSize: 10 * 1024 * 1024, // 10MB
}
