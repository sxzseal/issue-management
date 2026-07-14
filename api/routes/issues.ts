/**
 * `/api/issues` — 6 endpoints (list / create / get / patch / patch-status / delete).
 *
 * Storage split for the Markdown body: bodies whose UTF-8 byte length exceeds
 * {@link R2_BODY_INLINE_THRESHOLD_BYTES} live in R2 under `issues/<id>/body`
 * (with `body_r2_key` populated and D1 `body = NULL`); smaller bodies stay
 * inline in D1. See `api/lib/r2-body.ts` for the helpers.
 *
 * All routes require auth and return the standard `{ status_code, data,
 * message? }` envelope via `ok()` / `err()` / `noContent()`.
 */
import { Hono } from 'hono'
import type { Env } from '../index'
import { authGuard, type AuthGuardVariables } from '../middleware/auth-guard'
import { err, noContent, ok } from '../lib/response'
import {
  deleteBodyFromR2,
  issueBodyKey,
  readBodyFromR2,
  shouldOverflow,
  writeBodyToR2,
} from '../lib/r2-body'
import { TABLES } from '../db/schema'
import type { IssueRow, LabelRow } from '../db/types'
import type { Issue, IssueDetail, Label } from '../../src/lib/api-types'
import { ErrorCodes, ErrorMessages } from '../../src/lib/error-codes'
import {
  createIssueBodySchema,
  listIssuesQuerySchema,
  updateIssueBodySchema,
  updateIssueStatusBodySchema,
} from '../../src/lib/validators/issue'

// -----------------------------------------------------------------------------
// helpers
// -----------------------------------------------------------------------------

function nowIso(): string {
  return new Date().toISOString()
}

function newIssueId(): string {
  return `iss_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`
}

function rowToLabel(row: LabelRow): Label {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function rowToIssue(row: IssueRow, labels: Label[]): Issue {
  return {
    id: row.id,
    project_id: row.project_id,
    title: row.title,
    body: row.body,
    body_r2_key: row.body_r2_key,
    status: row.status,
    priority: row.priority,
    due_date: row.due_date,
    external_ref: row.external_ref,
    source: row.source,
    source_name: row.source_name,
    labels,
    created_at: row.created_at,
    updated_at: row.updated_at,
    archived_at: row.archived_at,
  }
}

/** Fetch labels for a set of issue ids, grouped by issue_id. */
async function fetchLabelsForIssues(
  db: D1Database,
  issueIds: readonly string[],
): Promise<Map<string, Label[]>> {
  const out = new Map<string, Label[]>()
  if (issueIds.length === 0) {
    return out
  }
  const placeholders = issueIds.map(() => '?').join(',')
  const stmt = db
    .prepare(
      `SELECT il.issue_id AS issue_id, l.id AS id, l.name AS name, l.color AS color,
              l.created_at AS created_at, l.updated_at AS updated_at
         FROM ${TABLES.issueLabels} il
         JOIN ${TABLES.labels} l ON l.id = il.label_id
        WHERE il.issue_id IN (${placeholders})`,
    )
    .bind(...issueIds)
  const rs = await stmt.all<LabelRow & { issue_id: string }>()
  for (const row of rs.results ?? []) {
    const list = out.get(row.issue_id) ?? []
    list.push(rowToLabel(row))
    out.set(row.issue_id, list)
  }
  return out
}

/** Load a single issue row by id; null if not found. Full row includes `body`. */
async function loadIssueRow(db: D1Database, id: string): Promise<IssueRow | null> {
  const row = await db
    .prepare(`SELECT * FROM ${TABLES.issues} WHERE id = ?`)
    .bind(id)
    .first<IssueRow>()
  return row ?? null
}

/**
 * Meta-only load — `body` is projected to NULL. Used by PATCH and DELETE which
 * only need routing/ownership metadata + `body_r2_key`. Inline bodies can be up
 * to 4KiB (R2_BODY_INLINE_THRESHOLD_BYTES); this saves that per-request read
 * bandwidth + JSON serialization on hot mutation paths.
 */
async function loadIssueRowMeta(db: D1Database, id: string): Promise<IssueRow | null> {
  const row = await db
    .prepare(
      `SELECT id, project_id, title, NULL AS body, body_r2_key, status, priority,
              due_date, external_ref, source, source_name, created_at, updated_at, archived_at
         FROM ${TABLES.issues} WHERE id = ?`,
    )
    .bind(id)
    .first<IssueRow>()
  return row ?? null
}

/** Validated columns → SQL identifiers for ORDER BY. */
const SORT_COLUMNS = {
  created_at: 'created_at',
  updated_at: 'updated_at',
  due_date: 'due_date',
  priority: 'priority',
} as const

// -----------------------------------------------------------------------------
// router
// -----------------------------------------------------------------------------

const app = new Hono<{ Bindings: Env; Variables: AuthGuardVariables }>()
app.use('*', authGuard())

// -----------------------------------------------------------------------------
// GET /  — list with filters + pagination
// -----------------------------------------------------------------------------
app.get('/', async (c) => {
  // URL search params come in as strings; multi-value filters accept either
  // repeated params or a comma-separated single param.
  const url = new URL(c.req.url)
  const raw: Record<string, string | string[]> = {}
  for (const key of new Set(url.searchParams.keys())) {
    const values = url.searchParams.getAll(key)
    raw[key] = values.length > 1 ? values : values[0]!
  }
  if (typeof raw.status === 'string' && raw.status.includes(',')) {
    raw.status = raw.status.split(',').filter(Boolean)
  }
  if (typeof raw.priority === 'string' && raw.priority.includes(',')) {
    raw.priority = raw.priority.split(',').filter(Boolean)
  }
  if (typeof raw.labels === 'string') {
    raw.labels = raw.labels.split(',').filter(Boolean)
  }

  const parsed = listIssuesQuerySchema.safeParse(raw)
  if (!parsed.success) {
    return err(c, ErrorCodes.VALIDATION_FAILED, ErrorMessages[ErrorCodes.VALIDATION_FAILED])
  }
  const q = parsed.data

  const where: string[] = []
  const binds: unknown[] = []

  if (q.project_id) {
    where.push('project_id = ?')
    binds.push(q.project_id)
  }
  if (q.status !== undefined) {
    const statuses = Array.isArray(q.status) ? q.status : [q.status]
    if (statuses.length > 0) {
      where.push(`status IN (${statuses.map(() => '?').join(',')})`)
      binds.push(...statuses)
    }
  }
  if (q.priority !== undefined) {
    const priorities = Array.isArray(q.priority) ? q.priority : [q.priority]
    if (priorities.length > 0) {
      where.push(`priority IN (${priorities.map(() => '?').join(',')})`)
      binds.push(...priorities)
    }
  }
  if (q.due_from) {
    where.push('due_date >= ?')
    binds.push(q.due_from)
  }
  if (q.due_to) {
    where.push('due_date <= ?')
    binds.push(q.due_to)
  }
  if (q.labels && q.labels.length > 0) {
    // AND semantics per contract: issue must carry every requested label id.
    const placeholders = q.labels.map(() => '?').join(',')
    where.push(
      `id IN (SELECT issue_id FROM ${TABLES.issueLabels}
                WHERE label_id IN (${placeholders})
                GROUP BY issue_id
               HAVING COUNT(DISTINCT label_id) = ?)`,
    )
    binds.push(...q.labels, q.labels.length)
  }
  if (q.q) {
    // Prefix-only LIKE so `title` can use an index (SQLite cannot use an index
    // with a leading `%`). Only searches title — bodies above
    // R2_BODY_INLINE_THRESHOLD_BYTES live in R2 with `body IS NULL`, so a body
    // LIKE clause silently excludes overflowed rows. Introduce FTS5 when
    // full-text (mid-string) body search is required.
    where.push('title LIKE ?')
    binds.push(`${q.q}%`)
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
  const orderCol = SORT_COLUMNS[q.sort]
  const orderDir = q.order === 'asc' ? 'ASC' : 'DESC'
  const offset = (q.page - 1) * q.page_size

  // Explicit column list — omit `body` (potentially many KB per row when it
  // stays inline) since list views only render title/status/etc. Callers that
  // need body_full go through GET /:id.
  const LIST_COLS =
    'id, project_id, title, NULL AS body, body_r2_key, status, priority, ' +
    'due_date, external_ref, source, source_name, created_at, updated_at, archived_at'

  // Count + page share the same WHERE and have no data dependency — run in parallel.
  const countStmt = c.env.DB.prepare(
    `SELECT COUNT(*) AS c FROM ${TABLES.issues} ${whereSql}`,
  ).bind(...binds)
  const pageStmt = c.env.DB.prepare(
    `SELECT ${LIST_COLS} FROM ${TABLES.issues} ${whereSql} ORDER BY ${orderCol} ${orderDir} LIMIT ? OFFSET ?`,
  ).bind(...binds, q.page_size, offset)

  const [countRow, pageRs] = await Promise.all([
    countStmt.first<{ c: number }>(),
    pageStmt.all<IssueRow>(),
  ])
  const total = countRow?.c ?? 0
  const rows = pageRs.results ?? []

  const labelsByIssue = await fetchLabelsForIssues(
    c.env.DB,
    rows.map((r) => r.id),
  )
  const list: Issue[] = rows.map((r) => rowToIssue(r, labelsByIssue.get(r.id) ?? []))

  return ok(c, { list, total, page: q.page, page_size: q.page_size })
})

// -----------------------------------------------------------------------------
// POST /  — create
// -----------------------------------------------------------------------------
app.post('/', async (c) => {
  let json: unknown
  try {
    json = await c.req.json()
  } catch {
    return err(c, ErrorCodes.VALIDATION_FAILED, ErrorMessages[ErrorCodes.VALIDATION_FAILED])
  }
  const parsed = createIssueBodySchema.safeParse(json)
  if (!parsed.success) {
    return err(c, ErrorCodes.VALIDATION_FAILED, ErrorMessages[ErrorCodes.VALIDATION_FAILED])
  }
  const data = parsed.data

  // project must exist
  const projectRow = await c.env.DB.prepare(
    `SELECT id FROM ${TABLES.projects} WHERE id = ?`,
  )
    .bind(data.project_id)
    .first<{ id: string }>()
  if (!projectRow) {
    return err(c, ErrorCodes.NOT_FOUND, '项目不存在')
  }

  // Fetch full label rows in the same round-trip we already pay for validation,
  // so we can synthesize the response without re-reading after INSERT.
  let labelRows: LabelRow[] = []
  if (data.label_ids.length > 0) {
    const placeholders = data.label_ids.map(() => '?').join(',')
    const labelRs = await c.env.DB.prepare(
      `SELECT * FROM ${TABLES.labels} WHERE id IN (${placeholders})`,
    )
      .bind(...data.label_ids)
      .all<LabelRow>()
    labelRows = labelRs.results ?? []
    if (labelRows.length !== data.label_ids.length) {
      return err(c, ErrorCodes.NOT_FOUND, '标签不存在')
    }
  }

  const id = newIssueId()
  const now = nowIso()

  // body overflow decision
  let insertBody: string | null = null
  let insertBodyR2Key: string | null = null
  if (typeof data.body === 'string') {
    if (shouldOverflow(data.body)) {
      insertBodyR2Key = await writeBodyToR2(c.env.R2, issueBodyKey(id), data.body)
      insertBody = null
    } else {
      insertBody = data.body
    }
  }

  await c.env.DB.prepare(
    `INSERT INTO ${TABLES.issues}
      (id, project_id, title, body, body_r2_key, status, priority, due_date,
       external_ref, source, source_name, created_at, updated_at, archived_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 'manual', NULL, ?, ?, NULL)`,
  )
    .bind(
      id,
      data.project_id,
      data.title,
      insertBody,
      insertBodyR2Key,
      data.status,
      data.priority,
      data.due_date ?? null,
      now,
      now,
    )
    .run()

  if (data.label_ids.length > 0) {
    const statements = data.label_ids.map((labelId) =>
      c.env.DB
        .prepare(
          `INSERT INTO ${TABLES.issueLabels} (issue_id, label_id) VALUES (?, ?)`,
        )
        .bind(id, labelId),
    )
    await c.env.DB.batch(statements)
  }

  // Synthesize the response from values we already have — no extra SELECTs.
  const labels = labelRows.map(rowToLabel)
  const issue: Issue = {
    id,
    project_id: data.project_id,
    title: data.title,
    body: insertBody,
    body_r2_key: insertBodyR2Key,
    status: data.status,
    priority: data.priority,
    due_date: data.due_date ?? null,
    external_ref: null,
    source: 'manual',
    source_name: null,
    labels,
    created_at: now,
    updated_at: now,
    archived_at: null,
  }
  return ok(c, issue, { httpStatus: 201 })
})

// -----------------------------------------------------------------------------
// GET /:id  — detail with merged body_full
// -----------------------------------------------------------------------------
app.get('/:id', async (c) => {
  const id = c.req.param('id')
  const row = await loadIssueRow(c.env.DB, id)
  if (!row) {
    return err(c, ErrorCodes.NOT_FOUND, ErrorMessages[ErrorCodes.NOT_FOUND])
  }
  const labelsByIssue = await fetchLabelsForIssues(c.env.DB, [id])

  let bodyFull = ''
  if (row.body_r2_key) {
    const fromR2 = await readBodyFromR2(c.env.R2, row.body_r2_key)
    bodyFull = fromR2 ?? ''
  } else if (row.body !== null) {
    bodyFull = row.body
  }

  const detail: IssueDetail = {
    ...rowToIssue(row, labelsByIssue.get(id) ?? []),
    body_full: bodyFull,
  }
  return ok(c, detail)
})

// -----------------------------------------------------------------------------
// PATCH /:id  — full whitelisted update
// -----------------------------------------------------------------------------
app.patch('/:id', async (c) => {
  const id = c.req.param('id')

  let json: unknown
  try {
    json = await c.req.json()
  } catch {
    return err(c, ErrorCodes.VALIDATION_FAILED, ErrorMessages[ErrorCodes.VALIDATION_FAILED])
  }
  const parsed = updateIssueBodySchema.safeParse(json)
  if (!parsed.success) {
    return err(c, ErrorCodes.VALIDATION_FAILED, ErrorMessages[ErrorCodes.VALIDATION_FAILED])
  }
  const patch = parsed.data

  const existing = await loadIssueRowMeta(c.env.DB, id)
  if (!existing) {
    return err(c, ErrorCodes.NOT_FOUND, ErrorMessages[ErrorCodes.NOT_FOUND])
  }

  // Validate project_id change (if present)
  if (patch.project_id !== undefined && patch.project_id !== existing.project_id) {
    const projectRow = await c.env.DB.prepare(
      `SELECT id FROM ${TABLES.projects} WHERE id = ?`,
    )
      .bind(patch.project_id)
      .first<{ id: string }>()
    if (!projectRow) {
      return err(c, ErrorCodes.NOT_FOUND, '项目不存在')
    }
  }

  // Validate label_ids (if present)
  if (patch.label_ids !== undefined && patch.label_ids.length > 0) {
    const placeholders = patch.label_ids.map(() => '?').join(',')
    const labelRs = await c.env.DB.prepare(
      `SELECT id FROM ${TABLES.labels} WHERE id IN (${placeholders})`,
    )
      .bind(...patch.label_ids)
      .all<{ id: string }>()
    const foundCount = labelRs.results?.length ?? 0
    if (foundCount !== patch.label_ids.length) {
      return err(c, ErrorCodes.NOT_FOUND, '标签不存在')
    }
  }

  const sets: string[] = []
  const binds: unknown[] = []

  if (patch.project_id !== undefined) {
    sets.push('project_id = ?')
    binds.push(patch.project_id)
  }
  if (patch.title !== undefined) {
    sets.push('title = ?')
    binds.push(patch.title)
  }
  if (patch.status !== undefined) {
    sets.push('status = ?')
    binds.push(patch.status)
    sets.push('archived_at = ?')
    binds.push(patch.status === 'archived' ? nowIso() : null)
  }
  if (patch.priority !== undefined) {
    sets.push('priority = ?')
    binds.push(patch.priority)
  }
  if (patch.due_date !== undefined) {
    sets.push('due_date = ?')
    binds.push(patch.due_date ?? null)
  }

  // Body change: run overflow logic. Track any old R2 key to sweep AFTER
  // the DB update lands (so we never orphan a live pointer).
  let r2KeyToDelete: string | null = null
  if (patch.body !== undefined) {
    if (patch.body === null) {
      sets.push('body = ?')
      binds.push(null)
      sets.push('body_r2_key = ?')
      binds.push(null)
      if (existing.body_r2_key) {
        r2KeyToDelete = existing.body_r2_key
      }
    } else if (shouldOverflow(patch.body)) {
      const key = await writeBodyToR2(c.env.R2, issueBodyKey(id), patch.body)
      sets.push('body = ?')
      binds.push(null)
      sets.push('body_r2_key = ?')
      binds.push(key)
      // Same deterministic key → no sweep needed (put overwrote in place).
    } else {
      sets.push('body = ?')
      binds.push(patch.body)
      sets.push('body_r2_key = ?')
      binds.push(null)
      if (existing.body_r2_key) {
        r2KeyToDelete = existing.body_r2_key
      }
    }
  }

  // Always bump updated_at on any mutation attempt, including a label_ids-only
  // patch (label associations are written below outside the main UPDATE).
  const hasRealColumnPatch = sets.length > 0
  const hasLabelPatch = patch.label_ids !== undefined
  const updatedAt = nowIso()
  sets.push('updated_at = ?')
  binds.push(updatedAt)

  if (hasRealColumnPatch || hasLabelPatch) {
    await c.env.DB.prepare(
      `UPDATE ${TABLES.issues} SET ${sets.join(', ')} WHERE id = ?`,
    )
      .bind(...binds, id)
      .run()
  }

  // Replace label associations when label_ids is present (even if empty).
  if (patch.label_ids !== undefined) {
    await c.env.DB.prepare(
      `DELETE FROM ${TABLES.issueLabels} WHERE issue_id = ?`,
    )
      .bind(id)
      .run()
    if (patch.label_ids.length > 0) {
      const statements = patch.label_ids.map((labelId) =>
        c.env.DB
          .prepare(
            `INSERT INTO ${TABLES.issueLabels} (issue_id, label_id) VALUES (?, ?)`,
          )
          .bind(id, labelId),
      )
      await c.env.DB.batch(statements)
    }
  }

  if (r2KeyToDelete) {
    await deleteBodyFromR2(c.env.R2, r2KeyToDelete)
  }

  // Synthesize the updated row from `existing` + the patch — no second SELECT.
  const updated: IssueRow = {
    ...existing,
    ...(patch.project_id !== undefined ? { project_id: patch.project_id } : {}),
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.status !== undefined
      ? {
          status: patch.status,
          archived_at: patch.status === 'archived' ? updatedAt : null,
        }
      : {}),
    ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
    ...(patch.due_date !== undefined ? { due_date: patch.due_date ?? null } : {}),
    ...(patch.body !== undefined
      ? patch.body === null
        ? { body: null, body_r2_key: null }
        : shouldOverflow(patch.body)
          ? { body: null, body_r2_key: issueBodyKey(id) }
          : { body: patch.body, body_r2_key: null }
      : {}),
    updated_at: updatedAt,
  }
  const labelsByIssue = await fetchLabelsForIssues(c.env.DB, [id])
  return ok(c, rowToIssue(updated, labelsByIssue.get(id) ?? []))
})

// -----------------------------------------------------------------------------
// PATCH /:id/status  — lightweight status swap (board drag)
// -----------------------------------------------------------------------------
app.patch('/:id/status', async (c) => {
  const id = c.req.param('id')

  let json: unknown
  try {
    json = await c.req.json()
  } catch {
    return err(c, ErrorCodes.VALIDATION_FAILED, ErrorMessages[ErrorCodes.VALIDATION_FAILED])
  }
  const parsed = updateIssueStatusBodySchema.safeParse(json)
  if (!parsed.success) {
    return err(c, ErrorCodes.VALIDATION_FAILED, ErrorMessages[ErrorCodes.VALIDATION_FAILED])
  }
  const { status } = parsed.data

  const existing = await c.env.DB.prepare(
    `SELECT id FROM ${TABLES.issues} WHERE id = ?`,
  )
    .bind(id)
    .first<{ id: string }>()
  if (!existing) {
    return err(c, ErrorCodes.NOT_FOUND, ErrorMessages[ErrorCodes.NOT_FOUND])
  }

  const now = nowIso()
  const archivedAt = status === 'archived' ? now : null
  await c.env.DB.prepare(
    `UPDATE ${TABLES.issues} SET status = ?, archived_at = ?, updated_at = ? WHERE id = ?`,
  )
    .bind(status, archivedAt, now, id)
    .run()

  return ok(c, { id, status, updated_at: now })
})

// -----------------------------------------------------------------------------
// DELETE /:id
// -----------------------------------------------------------------------------
app.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const existing = await loadIssueRowMeta(c.env.DB, id)
  if (!existing) {
    return err(c, ErrorCodes.NOT_FOUND, ErrorMessages[ErrorCodes.NOT_FOUND])
  }

  // FK ON DELETE CASCADE handles comments + issue_labels.
  if (existing.body_r2_key) {
    await deleteBodyFromR2(c.env.R2, existing.body_r2_key)
  }
  await c.env.DB.prepare(`DELETE FROM ${TABLES.issues} WHERE id = ?`).bind(id).run()

  return noContent(c)
})

export default app
