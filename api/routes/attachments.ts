/**
 * Attachments sub-router — served under `/api/attachments`.
 *
 * Two endpoints:
 *   - GET    /:id  — stream the blob back with the stored mime + filename.
 *   - DELETE /:id  — best-effort R2 delete + row delete → 204.
 *
 * Upload lives on the issues router (`POST /api/issues/:id/attachments`)
 * because it needs the parent issue id in the path.
 *
 * Auth: `<img src="/api/attachments/…">` cannot carry the Authorization
 * header, so the frontend uses `<AuthedImg>` to fetch → blob URL. That
 * keeps this endpoint behind the same Bearer guard as every other API
 * without adding a signed-URL surface.
 *
 * Download safety: non-image / non-whitelist mimes are demoted to
 * `application/octet-stream` + `Content-Disposition: attachment` so a
 * client cannot pivot a `text/html` upload into a same-origin XSS.
 */
import { Hono } from 'hono'
import type { Env } from '../index'
import { authGuard, type AuthGuardVariables } from '../middleware/auth-guard'
import { err, noContent } from '../lib/response'
import { ErrorCodes } from '../../src/lib/error-codes'
import { TABLES } from '../db/schema'
import type { AttachmentRow } from '../db/types'
import { isValidAttachmentId, safeAttachmentHeaders } from '../lib/attachments'

const app = new Hono<{ Bindings: Env; Variables: AuthGuardVariables }>()

app.use('*', authGuard())

// ---------------------------------------------------------------------------
// GET /:id — stream the blob
// ---------------------------------------------------------------------------
app.get('/:id', async (c) => {
  const id = c.req.param('id')
  if (!isValidAttachmentId(id)) {
    return err(c, ErrorCodes.NOT_FOUND, '附件不存在')
  }
  const row = await c.env.DB.prepare(
    `SELECT id, issue_id, r2_key, filename, mime, size_bytes
     FROM ${TABLES.attachments} WHERE id = ?`,
  )
    .bind(id)
    .first<
      Pick<
        AttachmentRow,
        'id' | 'issue_id' | 'r2_key' | 'filename' | 'mime' | 'size_bytes'
      >
    >()
  if (!row) {
    return err(c, ErrorCodes.NOT_FOUND, '附件不存在')
  }

  const obj = await c.env.R2.get(row.r2_key)
  if (obj === null) {
    // DB row without an R2 object — treat as gone. Shouldn't happen unless
    // R2 was manually swept without cleaning the table.
    return err(c, ErrorCodes.NOT_FOUND, '附件已丢失')
  }

  return new Response(obj.body, {
    headers: safeAttachmentHeaders(row.mime, row.filename, row.size_bytes),
  })
})

// ---------------------------------------------------------------------------
// DELETE /:id — hard delete blob + row → 204
// ---------------------------------------------------------------------------
app.delete('/:id', async (c) => {
  const id = c.req.param('id')
  if (!isValidAttachmentId(id)) {
    return err(c, ErrorCodes.NOT_FOUND, '附件不存在')
  }
  const row = await c.env.DB.prepare(
    `SELECT id, r2_key FROM ${TABLES.attachments} WHERE id = ?`,
  )
    .bind(id)
    .first<{ id: string; r2_key: string }>()
  if (!row) {
    return err(c, ErrorCodes.NOT_FOUND, '附件不存在')
  }

  // R2 delete is idempotent — a transient failure here leaves an orphaned
  // blob (garbage), not an orphaned pointer, so we tolerate it.
  try {
    await c.env.R2.delete(row.r2_key)
  } catch (e) {
    console.warn('[attachments delete] R2 delete failed:', e)
  }

  await c.env.DB.prepare(`DELETE FROM ${TABLES.attachments} WHERE id = ?`)
    .bind(id)
    .run()

  return noContent(c)
})

export default app
