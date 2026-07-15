/**
 * Comments sub-router (T011).
 *
 * Registers three endpoints spanning two path prefixes:
 *   - GET    /issues/:id/comments      list paginated
 *   - POST   /issues/:id/comments      create → 201
 *   - DELETE /comments/:id             hard delete → 204
 *
 * NOTE: main skill mounts this router at /api (not /api/comments) — the
 * paths declared below already include /issues/:id/comments and
 * /comments/:id, so the mount is:
 *   TODO(T011): api.route('/', commentsRoutes)
 */
import { Hono } from 'hono'
import type { Env } from '../index'
import { authGuard, type AuthGuardVariables } from '../middleware/auth-guard'
import { ok, err, noContent } from '../lib/response'
import { ErrorCodes, ErrorMessages } from '../../src/lib/error-codes'
import type { CommentRow } from '../db/types'
import type { Comment } from '../../src/lib/api-types'
import {
  createCommentBodySchema,
  listCommentsQuerySchema,
} from '../../src/lib/validators/comment'

const app = new Hono<{ Bindings: Env; Variables: AuthGuardVariables }>()

app.use('*', authGuard())

function rowToComment(r: CommentRow): Comment {
  return {
    id: r.id,
    issue_id: r.issue_id,
    body: r.body,
    created_at: r.created_at,
  }
}

// ---------------------------------------------------------------------------
// GET /issues/:id/comments — paginated list, DESC by created_at
// ---------------------------------------------------------------------------
app.get('/issues/:id/comments', async (c) => {
  const issueId = c.req.param('id')

  const issueRow = await c.env.DB.prepare('SELECT id FROM issues WHERE id = ?')
    .bind(issueId)
    .first<{ id: string }>()
  if (!issueRow) {
    return err(c, ErrorCodes.NOT_FOUND, 'issue 不存在')
  }

  const rawQuery = Object.fromEntries(new URL(c.req.url).searchParams.entries())
  const parsed = listCommentsQuerySchema.safeParse(rawQuery)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    const message =
      firstIssue?.message ?? ErrorMessages[ErrorCodes.VALIDATION_FAILED]
    return err(c, ErrorCodes.VALIDATION_FAILED, message)
  }
  const { page, page_size } = parsed.data
  const offset = (page - 1) * page_size

  // Count + page share the same WHERE and have no data dependency — run in parallel.
  const [listResult, countRow] = await Promise.all([
    c.env.DB.prepare(
      'SELECT * FROM comments WHERE issue_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    )
      .bind(issueId, page_size, offset)
      .all<CommentRow>(),
    c.env.DB.prepare('SELECT COUNT(*) AS n FROM comments WHERE issue_id = ?')
      .bind(issueId)
      .first<{ n: number }>(),
  ])
  const total = countRow?.n ?? 0

  return ok(c, {
    list: (listResult.results ?? []).map(rowToComment),
    total,
    page,
    page_size,
  })
})

// ---------------------------------------------------------------------------
// POST /issues/:id/comments — create → 201
// ---------------------------------------------------------------------------
app.post('/issues/:id/comments', async (c) => {
  const issueId = c.req.param('id')

  const issueRow = await c.env.DB.prepare('SELECT id FROM issues WHERE id = ?')
    .bind(issueId)
    .first<{ id: string }>()
  if (!issueRow) {
    return err(c, ErrorCodes.NOT_FOUND, 'issue 不存在')
  }

  let rawBody: unknown
  try {
    rawBody = await c.req.json()
  } catch {
    return err(
      c,
      ErrorCodes.VALIDATION_FAILED,
      ErrorMessages[ErrorCodes.VALIDATION_FAILED],
    )
  }

  const parsed = createCommentBodySchema.safeParse(rawBody)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    const message =
      firstIssue?.message ?? ErrorMessages[ErrorCodes.VALIDATION_FAILED]
    return err(c, ErrorCodes.VALIDATION_FAILED, message)
  }

  const id = 'cmt_' + crypto.randomUUID().replace(/-/g, '').slice(0, 10)
  const now = new Date().toISOString()

  await c.env.DB.prepare(
    'INSERT INTO comments (id, issue_id, body, created_at) VALUES (?, ?, ?, ?)',
  )
    .bind(id, issueId, parsed.data.body, now)
    .run()

  // Bump parent issue's updated_at so lists / activity surfaces reflect the
  // new comment. DELETE intentionally does NOT do this (see AC-131).
  await c.env.DB.prepare('UPDATE issues SET updated_at = ? WHERE id = ?')
    .bind(now, issueId)
    .run()

  const comment: Comment = {
    id,
    issue_id: issueId,
    body: parsed.data.body,
    created_at: now,
  }
  return ok(c, comment, { httpStatus: 201 })
})

// ---------------------------------------------------------------------------
// DELETE /comments/:id — hard delete → 204
// ---------------------------------------------------------------------------
app.delete('/comments/:id', async (c) => {
  const commentId = c.req.param('id')

  const row = await c.env.DB.prepare('SELECT id FROM comments WHERE id = ?')
    .bind(commentId)
    .first<{ id: string }>()
  if (!row) {
    return err(c, ErrorCodes.NOT_FOUND, '评论不存在')
  }

  await c.env.DB.prepare('DELETE FROM comments WHERE id = ?')
    .bind(commentId)
    .run()

  return noContent(c)
})

export default app
