// ---------------------------------------------------------------------------
// Auth Middleware — JWT placeholder stub (deferred to v0.2 per D-08)
// ---------------------------------------------------------------------------
// BKND-03: JWT auth deferred to v0.2
// Future: verify JWT from Authorization: Bearer <token> header
// Future: use @hono/jwt middleware
// ---------------------------------------------------------------------------

import type { Context, Next } from 'hono'

export const authMiddleware = async (c: Context, next: Next): Promise<void> => {
  await next()
}
