/**
 * `/api/projects` CRUD sub-router.
 *
 * Endpoints (all behind authGuard):
 *   GET    /              — list all projects
 *   POST   /              — create project
 *   PATCH  /:id           — partial update
 *   DELETE /:id?cascade=  — delete, cascade = reject|reassign
 *
 * Contract source: `.loop/api-contracts.json` §7.3 / AC-111..114.
 * Error codes: 40101 / 40401 / 40901 / 40902 / 42201.
 */
import { Hono } from 'hono'
import type { Env } from '../index'
import { authGuard, type AuthGuardVariables } from '../middleware/auth-guard'
import { ok, err, noContent } from '../lib/response'
import { ErrorCodes, ErrorMessages } from '../../src/lib/error-codes'
import type { ProjectRow } from '../db/types'
import { TABLES } from '../db/schema'
import type { Project } from '../../src/lib/api-types'
import {
  createProjectBodySchema,
  updateProjectBodySchema,
  deleteProjectQuerySchema,
} from '../../src/lib/validators/project'

type Bindings = { Bindings: Env; Variables: AuthGuardVariables }

const app = new Hono<Bindings>()
app.use('*', authGuard())

function rowToProject(r: ProjectRow): Project {
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    is_inbox: r.is_inbox === 1,
    sort_order: r.sort_order,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }
}

function genProjectId(): string {
  return 'proj_' + crypto.randomUUID().replace(/-/g, '').slice(0, 10)
}

// ---------------------------------------------------------------------------
// GET / — list
// ---------------------------------------------------------------------------
app.get('/', async (c) => {
  const rs = await c.env.DB.prepare(
    `SELECT id, name, color, is_inbox, sort_order, created_at, updated_at
     FROM ${TABLES.projects}
     ORDER BY is_inbox DESC, sort_order ASC, name ASC`,
  ).all<ProjectRow>()
  const projects = (rs.results ?? []).map(rowToProject)
  return ok(c, projects)
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
  const parsed = createProjectBodySchema.safeParse(rawBody)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return err(c, ErrorCodes.VALIDATION_FAILED, first?.message ?? ErrorMessages[ErrorCodes.VALIDATION_FAILED])
  }
  const body = parsed.data

  const dup = await c.env.DB.prepare(
    `SELECT id FROM ${TABLES.projects} WHERE name = ?`,
  )
    .bind(body.name)
    .first<{ id: string }>()
  if (dup) {
    return err(c, ErrorCodes.NAME_CONFLICT, '项目名已存在')
  }

  let sortOrder: number
  if (typeof body.sort_order === 'number') {
    sortOrder = body.sort_order
  } else {
    const maxRow = await c.env.DB.prepare(
      `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next
       FROM ${TABLES.projects}
       WHERE is_inbox = 0`,
    ).first<{ next: number }>()
    sortOrder = maxRow?.next ?? 1
  }

  const id = genProjectId()
  const now = new Date().toISOString()

  await c.env.DB.prepare(
    `INSERT INTO ${TABLES.projects}
      (id, name, color, is_inbox, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, 0, ?, ?, ?)`,
  )
    .bind(id, body.name, body.color, sortOrder, now, now)
    .run()

  const project: Project = {
    id,
    name: body.name,
    color: body.color,
    is_inbox: false,
    sort_order: sortOrder,
    created_at: now,
    updated_at: now,
  }
  return ok(c, project, { httpStatus: 201 })
})

// ---------------------------------------------------------------------------
// PATCH /:id — partial update
// ---------------------------------------------------------------------------
app.patch('/:id', async (c) => {
  const id = c.req.param('id')

  const existing = await c.env.DB.prepare(
    `SELECT id, name, color, is_inbox, sort_order, created_at, updated_at
     FROM ${TABLES.projects}
     WHERE id = ?`,
  )
    .bind(id)
    .first<ProjectRow>()
  if (!existing) {
    return err(c, ErrorCodes.NOT_FOUND, '项目不存在')
  }

  let rawBody: unknown
  try {
    rawBody = await c.req.json()
  } catch {
    return err(c, ErrorCodes.VALIDATION_FAILED, '请求体不是合法 JSON')
  }
  const parsed = updateProjectBodySchema.safeParse(rawBody)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return err(c, ErrorCodes.VALIDATION_FAILED, first?.message ?? ErrorMessages[ErrorCodes.VALIDATION_FAILED])
  }
  const body = parsed.data

  if (existing.is_inbox === 1 && body.name !== undefined && body.name !== existing.name) {
    return err(c, ErrorCodes.VALIDATION_FAILED, 'Inbox 项目名不可修改')
  }

  if (body.name !== undefined && body.name !== existing.name) {
    const dup = await c.env.DB.prepare(
      `SELECT id FROM ${TABLES.projects} WHERE name = ? AND id <> ?`,
    )
      .bind(body.name, id)
      .first<{ id: string }>()
    if (dup) {
      return err(c, ErrorCodes.NAME_CONFLICT, '项目名已存在')
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
  if (body.sort_order !== undefined) {
    sets.push('sort_order = ?')
    values.push(body.sort_order)
  }

  const now = new Date().toISOString()
  sets.push('updated_at = ?')
  values.push(now)

  if (sets.length === 1) {
    // Only updated_at added — nothing else changed, but still bump timestamp.
    await c.env.DB.prepare(
      `UPDATE ${TABLES.projects} SET updated_at = ? WHERE id = ?`,
    )
      .bind(now, id)
      .run()
  } else {
    values.push(id)
    await c.env.DB.prepare(
      `UPDATE ${TABLES.projects} SET ${sets.join(', ')} WHERE id = ?`,
    )
      .bind(...values)
      .run()
  }

  const updated = await c.env.DB.prepare(
    `SELECT id, name, color, is_inbox, sort_order, created_at, updated_at
     FROM ${TABLES.projects}
     WHERE id = ?`,
  )
    .bind(id)
    .first<ProjectRow>()
  if (!updated) {
    return err(c, ErrorCodes.INTERNAL_ERROR, ErrorMessages[ErrorCodes.INTERNAL_ERROR])
  }
  return ok(c, rowToProject(updated))
})

// ---------------------------------------------------------------------------
// DELETE /:id — reject | reassign
// ---------------------------------------------------------------------------
app.delete('/:id', async (c) => {
  const id = c.req.param('id')

  const queryParsed = deleteProjectQuerySchema.safeParse({
    cascade: c.req.query('cascade') ?? undefined,
  })
  if (!queryParsed.success) {
    const first = queryParsed.error.issues[0]
    return err(c, ErrorCodes.VALIDATION_FAILED, first?.message ?? ErrorMessages[ErrorCodes.VALIDATION_FAILED])
  }
  const { cascade } = queryParsed.data

  const existing = await c.env.DB.prepare(
    `SELECT id, is_inbox FROM ${TABLES.projects} WHERE id = ?`,
  )
    .bind(id)
    .first<{ id: string; is_inbox: 0 | 1 }>()
  if (!existing) {
    return err(c, ErrorCodes.NOT_FOUND, '项目不存在')
  }
  if (existing.is_inbox === 1) {
    return err(c, ErrorCodes.VALIDATION_FAILED, 'Inbox 项目不可删除')
  }

  const countRow = await c.env.DB.prepare(
    `SELECT COUNT(*) AS n FROM ${TABLES.issues} WHERE project_id = ?`,
  )
    .bind(id)
    .first<{ n: number }>()
  const n = countRow?.n ?? 0

  if (n > 0) {
    if (cascade === 'reject') {
      return err(c, ErrorCodes.CONSTRAINT_CONFLICT, '项目下存在 issue，删除失败')
    }
    // reassign
    const now = new Date().toISOString()
    await c.env.DB.prepare(
      `UPDATE ${TABLES.issues}
       SET project_id = 'proj_inbox', updated_at = ?
       WHERE project_id = ?`,
    )
      .bind(now, id)
      .run()
  }

  await c.env.DB.prepare(`DELETE FROM ${TABLES.projects} WHERE id = ?`)
    .bind(id)
    .run()

  return noContent(c)
})

export default app
