/**
 * `/api/labels` CRUD sub-router.
 *
 * Endpoints (all behind authGuard):
 *   GET    /              — list all labels
 *   POST   /              — create label
 *   PATCH  /:id           — partial update
 *   DELETE /:id           — delete (issue_labels rows cascade via FK)
 *
 * Contract source: `.loop/api-contracts.json` §7.4 / AC-115.
 * Error codes: 40101 / 40401 / 40901 / 42201.
 */
import { Hono } from 'hono'
import type { Env } from '../index'
import { authGuard, type AuthGuardVariables } from '../middleware/auth-guard'
import { ok, err, noContent } from '../lib/response'
import { ErrorCodes, ErrorMessages } from '../../src/lib/error-codes'
import type { LabelRow } from '../db/types'
import { TABLES } from '../db/schema'
import type { Label } from '../../src/lib/api-types'
import {
  createLabelBodySchema,
  updateLabelBodySchema,
} from '../../src/lib/validators/label'

type Bindings = { Bindings: Env; Variables: AuthGuardVariables }

const app = new Hono<Bindings>()
app.use('*', authGuard())

function rowToLabel(r: LabelRow): Label {
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }
}

function genLabelId(): string {
  return 'lbl_' + crypto.randomUUID().replace(/-/g, '').slice(0, 10)
}

// ---------------------------------------------------------------------------
// GET / — list
// ---------------------------------------------------------------------------
app.get('/', async (c) => {
  const rs = await c.env.DB.prepare(
    `SELECT id, name, color, created_at, updated_at
     FROM ${TABLES.labels}
     ORDER BY name ASC`,
  ).all<LabelRow>()
  const labels = (rs.results ?? []).map(rowToLabel)
  return ok(c, labels)
})

// ---------------------------------------------------------------------------
// POST / — create
// ---------------------------------------------------------------------------
app.post('/', async (c) => {
  let rawBody: unknown
  try {
    rawBody = await c.req.json()
  } catch {
    return err(c, ErrorCodes.VALIDATION_FAILED, '请求体不是合法 JSON')
  }
  const parsed = createLabelBodySchema.safeParse(rawBody)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return err(c, ErrorCodes.VALIDATION_FAILED, first?.message ?? ErrorMessages[ErrorCodes.VALIDATION_FAILED])
  }
  const body = parsed.data

  const dup = await c.env.DB.prepare(
    `SELECT id FROM ${TABLES.labels} WHERE name = ?`,
  )
    .bind(body.name)
    .first<{ id: string }>()
  if (dup) {
    return err(c, ErrorCodes.NAME_CONFLICT, '标签名已存在')
  }

  const id = genLabelId()
  const now = new Date().toISOString()

  await c.env.DB.prepare(
    `INSERT INTO ${TABLES.labels} (id, name, color, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(id, body.name, body.color, now, now)
    .run()

  const label: Label = {
    id,
    name: body.name,
    color: body.color,
    created_at: now,
    updated_at: now,
  }
  return ok(c, label, { httpStatus: 201 })
})

// ---------------------------------------------------------------------------
// PATCH /:id — partial update
// ---------------------------------------------------------------------------
app.patch('/:id', async (c) => {
  const id = c.req.param('id')

  const existing = await c.env.DB.prepare(
    `SELECT id, name, color, created_at, updated_at
     FROM ${TABLES.labels}
     WHERE id = ?`,
  )
    .bind(id)
    .first<LabelRow>()
  if (!existing) {
    return err(c, ErrorCodes.NOT_FOUND, '标签不存在')
  }

  let rawBody: unknown
  try {
    rawBody = await c.req.json()
  } catch {
    return err(c, ErrorCodes.VALIDATION_FAILED, '请求体不是合法 JSON')
  }
  const parsed = updateLabelBodySchema.safeParse(rawBody)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return err(c, ErrorCodes.VALIDATION_FAILED, first?.message ?? ErrorMessages[ErrorCodes.VALIDATION_FAILED])
  }
  const body = parsed.data

  if (body.name !== undefined && body.name !== existing.name) {
    const dup = await c.env.DB.prepare(
      `SELECT id FROM ${TABLES.labels} WHERE name = ? AND id <> ?`,
    )
      .bind(body.name, id)
      .first<{ id: string }>()
    if (dup) {
      return err(c, ErrorCodes.NAME_CONFLICT, '标签名已存在')
    }
  }

  const sets: string[] = []
  const values: Array<string | number> = []
  if (body.name !== undefined) {
    sets.push('name = ?')
    values.push(body.name)
  }
  if (body.color !== undefined) {
    sets.push('color = ?')
    values.push(body.color)
  }

  const now = new Date().toISOString()
  sets.push('updated_at = ?')
  values.push(now)

  if (sets.length === 1) {
    await c.env.DB.prepare(
      `UPDATE ${TABLES.labels} SET updated_at = ? WHERE id = ?`,
    )
      .bind(now, id)
      .run()
  } else {
    values.push(id)
    await c.env.DB.prepare(
      `UPDATE ${TABLES.labels} SET ${sets.join(', ')} WHERE id = ?`,
    )
      .bind(...values)
      .run()
  }

  const updated = await c.env.DB.prepare(
    `SELECT id, name, color, created_at, updated_at
     FROM ${TABLES.labels}
     WHERE id = ?`,
  )
    .bind(id)
    .first<LabelRow>()
  if (!updated) {
    return err(c, ErrorCodes.INTERNAL_ERROR, ErrorMessages[ErrorCodes.INTERNAL_ERROR])
  }
  return ok(c, rowToLabel(updated))
})

// ---------------------------------------------------------------------------
// DELETE /:id — issue_labels rows cascade via FK ON DELETE CASCADE
// ---------------------------------------------------------------------------
app.delete('/:id', async (c) => {
  const id = c.req.param('id')

  const existing = await c.env.DB.prepare(
    `SELECT id FROM ${TABLES.labels} WHERE id = ?`,
  )
    .bind(id)
    .first<{ id: string }>()
  if (!existing) {
    return err(c, ErrorCodes.NOT_FOUND, '标签不存在')
  }

  await c.env.DB.prepare(`DELETE FROM ${TABLES.labels} WHERE id = ?`)
    .bind(id)
    .run()

  return noContent(c)
})

export default app
