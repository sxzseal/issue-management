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
import {
  MAX_ATTACHMENT_BYTES,
  attachmentR2Key,
  attachmentUrl,
  generateAttachmentId,
  sanitizeStoredMime,
  sweepIssueAttachments,
} from '../lib/attachments'
import { TABLES } from '../db/schema'
import type { IssueRow, LabelRow, AttachmentRow } from '../db/types'
import type {
  Issue,
  IssueDetail,
  Label,
  Attachment,
} from '../../src/lib/api-types'
import { ErrorCodes, ErrorMessages } from '../../src/lib/error-codes'
import {
  bulkCreateIssueBodySchema,
  bulkDeleteIssueBodySchema,
  bulkIssueLabelsBodySchema,
  bulkUpdateIssueBodySchema,
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
async function loadIssueRow(
  db: D1Database,
  id: string,
): Promise<IssueRow | null> {
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
async function loadIssueRowMeta(
  db: D1Database,
  id: string,
): Promise<IssueRow | null> {
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
    return err(
      c,
      ErrorCodes.VALIDATION_FAILED,
      ErrorMessages[ErrorCodes.VALIDATION_FAILED],
    )
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
  const list: Issue[] = rows.map((r) =>
    rowToIssue(r, labelsByIssue.get(r.id) ?? []),
  )

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
    return err(
      c,
      ErrorCodes.VALIDATION_FAILED,
      ErrorMessages[ErrorCodes.VALIDATION_FAILED],
    )
  }
  const parsed = createIssueBodySchema.safeParse(json)
  if (!parsed.success) {
    return err(
      c,
      ErrorCodes.VALIDATION_FAILED,
      ErrorMessages[ErrorCodes.VALIDATION_FAILED],
    )
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

  // Provenance: browser session → 'manual'; API token → 'api'. The badge on
  // the board / list / detail views branches on this. authKind is set by
  // authGuard; the fallback keeps this handler defensive if that changes.
  const source: 'manual' | 'api' =
    c.get('authKind') === 'api-token' ? 'api' : 'manual'
  const sourceName = source === 'api' ? (c.get('authTokenId') ?? null) : null

  // body overflow decision
  let insertBody: string | null = null
  let insertBodyR2Key: string | null = null
  if (typeof data.body === 'string') {
    if (shouldOverflow(data.body)) {
      insertBodyR2Key = await writeBodyToR2(
        c.env.R2,
        issueBodyKey(id),
        data.body,
      )
      insertBody = null
    } else {
      insertBody = data.body
    }
  }

  await c.env.DB.prepare(
    `INSERT INTO ${TABLES.issues}
      (id, project_id, title, body, body_r2_key, status, priority, due_date,
       external_ref, source, source_name, created_at, updated_at, archived_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, NULL)`,
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
      source,
      sourceName,
      now,
      now,
    )
    .run()

  if (data.label_ids.length > 0) {
    const statements = data.label_ids.map((labelId) =>
      c.env.DB.prepare(
        `INSERT INTO ${TABLES.issueLabels} (issue_id, label_id) VALUES (?, ?)`,
      ).bind(id, labelId),
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
    source,
    source_name: sourceName,
    labels,
    created_at: now,
    updated_at: now,
    archived_at: null,
  }
  return ok(c, issue, { httpStatus: 201 })
})

// -----------------------------------------------------------------------------
// POST /bulk  — batch create, one row per title, shared metadata
// -----------------------------------------------------------------------------
app.post('/bulk', async (c) => {
  let json: unknown
  try {
    json = await c.req.json()
  } catch {
    return err(
      c,
      ErrorCodes.VALIDATION_FAILED,
      ErrorMessages[ErrorCodes.VALIDATION_FAILED],
    )
  }
  const parsed = bulkCreateIssueBodySchema.safeParse(json)
  if (!parsed.success) {
    return err(
      c,
      ErrorCodes.VALIDATION_FAILED,
      ErrorMessages[ErrorCodes.VALIDATION_FAILED],
    )
  }
  const data = parsed.data

  const projectRow = await c.env.DB.prepare(
    `SELECT id FROM ${TABLES.projects} WHERE id = ?`,
  )
    .bind(data.project_id)
    .first<{ id: string }>()
  if (!projectRow) {
    return err(c, ErrorCodes.NOT_FOUND, '项目不存在')
  }

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

  const source: 'manual' | 'api' =
    c.get('authKind') === 'api-token' ? 'api' : 'manual'
  const sourceName = source === 'api' ? (c.get('authTokenId') ?? null) : null
  const now = nowIso()
  const labels = labelRows.map(rowToLabel)

  const statements: D1PreparedStatement[] = []
  const issues: Issue[] = []

  for (const title of data.titles) {
    const id = newIssueId()
    statements.push(
      c.env.DB.prepare(
        `INSERT INTO ${TABLES.issues}
          (id, project_id, title, body, body_r2_key, status, priority, due_date,
           external_ref, source, source_name, created_at, updated_at, archived_at)
         VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, NULL, ?, ?, ?, ?, NULL)`,
      ).bind(
        id,
        data.project_id,
        title,
        data.status,
        data.priority,
        data.due_date ?? null,
        source,
        sourceName,
        now,
        now,
      ),
    )
    for (const labelId of data.label_ids) {
      statements.push(
        c.env.DB.prepare(
          `INSERT INTO ${TABLES.issueLabels} (issue_id, label_id) VALUES (?, ?)`,
        ).bind(id, labelId),
      )
    }
    issues.push({
      id,
      project_id: data.project_id,
      title,
      body: null,
      body_r2_key: null,
      status: data.status,
      priority: data.priority,
      due_date: data.due_date ?? null,
      external_ref: null,
      source,
      source_name: sourceName,
      labels,
      created_at: now,
      updated_at: now,
      archived_at: null,
    })
  }

  await c.env.DB.batch(statements)

  return ok(c, { issues }, { httpStatus: 201 })
})

// -----------------------------------------------------------------------------
// PATCH /bulk  — shared patch across N issues (status/priority/due_date/project_id)
//
// Body columns (per-item body / label associations) are intentionally excluded:
// - `body` has R2 overflow semantics that require per-item work
// - `label_ids` needs add/remove/replace semantics — see POST /bulk/labels
// -----------------------------------------------------------------------------
app.patch('/bulk', async (c) => {
  let json: unknown
  try {
    json = await c.req.json()
  } catch {
    return err(
      c,
      ErrorCodes.VALIDATION_FAILED,
      ErrorMessages[ErrorCodes.VALIDATION_FAILED],
    )
  }
  const parsed = bulkUpdateIssueBodySchema.safeParse(json)
  if (!parsed.success) {
    return err(
      c,
      ErrorCodes.VALIDATION_FAILED,
      ErrorMessages[ErrorCodes.VALIDATION_FAILED],
    )
  }
  const { ids, patch } = parsed.data
  const uniqueIds = Array.from(new Set(ids))

  // Existence check: all requested ids must resolve to real rows.
  const idPlaceholders = uniqueIds.map(() => '?').join(',')
  const foundRs = await c.env.DB.prepare(
    `SELECT id FROM ${TABLES.issues} WHERE id IN (${idPlaceholders})`,
  )
    .bind(...uniqueIds)
    .all<{ id: string }>()
  const foundIds = new Set((foundRs.results ?? []).map((r) => r.id))
  if (foundIds.size !== uniqueIds.length) {
    const missing = uniqueIds.filter((id) => !foundIds.has(id))
    return err(c, ErrorCodes.NOT_FOUND, `未找到 issue: ${missing.join(', ')}`)
  }

  // project_id target must exist too, when changing.
  if (patch.project_id !== undefined) {
    const projectRow = await c.env.DB.prepare(
      `SELECT id FROM ${TABLES.projects} WHERE id = ?`,
    )
      .bind(patch.project_id)
      .first<{ id: string }>()
    if (!projectRow) {
      return err(c, ErrorCodes.NOT_FOUND, '项目不存在')
    }
  }

  const sets: string[] = []
  const binds: unknown[] = []
  const now = nowIso()

  if (patch.status !== undefined) {
    sets.push('status = ?')
    binds.push(patch.status)
    sets.push('archived_at = ?')
    binds.push(patch.status === 'archived' ? now : null)
  }
  if (patch.priority !== undefined) {
    sets.push('priority = ?')
    binds.push(patch.priority)
  }
  if (patch.due_date !== undefined) {
    sets.push('due_date = ?')
    binds.push(patch.due_date ?? null)
  }
  if (patch.project_id !== undefined) {
    sets.push('project_id = ?')
    binds.push(patch.project_id)
  }
  sets.push('updated_at = ?')
  binds.push(now)

  await c.env.DB.prepare(
    `UPDATE ${TABLES.issues} SET ${sets.join(', ')} WHERE id IN (${idPlaceholders})`,
  )
    .bind(...binds, ...uniqueIds)
    .run()

  return ok(c, { ids: uniqueIds, patch, updated_at: now })
})

// -----------------------------------------------------------------------------
// POST /bulk/labels  — attach/detach labels across N issues
//
// mode:
//   - add:     INSERT OR IGNORE — no-op for pairs already present
//   - remove:  DELETE WHERE (issue_id, label_id) IN cartesian(ids, label_ids)
//   - replace: DELETE all label assocs on the target issues, then re-insert
//              exactly the provided label_ids (final state == label_ids)
// -----------------------------------------------------------------------------
app.post('/bulk/labels', async (c) => {
  let json: unknown
  try {
    json = await c.req.json()
  } catch {
    return err(
      c,
      ErrorCodes.VALIDATION_FAILED,
      ErrorMessages[ErrorCodes.VALIDATION_FAILED],
    )
  }
  const parsed = bulkIssueLabelsBodySchema.safeParse(json)
  if (!parsed.success) {
    return err(
      c,
      ErrorCodes.VALIDATION_FAILED,
      ErrorMessages[ErrorCodes.VALIDATION_FAILED],
    )
  }
  const { ids, label_ids, mode } = parsed.data
  const uniqueIds = Array.from(new Set(ids))
  const uniqueLabelIds = Array.from(new Set(label_ids))

  const idPlaceholders = uniqueIds.map(() => '?').join(',')
  const foundIssuesRs = await c.env.DB.prepare(
    `SELECT id FROM ${TABLES.issues} WHERE id IN (${idPlaceholders})`,
  )
    .bind(...uniqueIds)
    .all<{ id: string }>()
  const foundIssueIds = new Set((foundIssuesRs.results ?? []).map((r) => r.id))
  if (foundIssueIds.size !== uniqueIds.length) {
    const missing = uniqueIds.filter((id) => !foundIssueIds.has(id))
    return err(c, ErrorCodes.NOT_FOUND, `未找到 issue: ${missing.join(', ')}`)
  }

  const labelPlaceholders =
    uniqueLabelIds.length > 0 ? uniqueLabelIds.map(() => '?').join(',') : ''

  // Label-existence check is only meaningful for the modes that INSERT a
  // (issue_id, label_id) row (FK-checked at write time). `remove` is
  // idempotent — a since-deleted label id has no row to strip (FK CASCADE
  // handled that), so a round-trip 404 here just blocks otherwise valid
  // batches.
  if ((mode === 'add' || mode === 'replace') && uniqueLabelIds.length > 0) {
    const foundLabelsRs = await c.env.DB.prepare(
      `SELECT id FROM ${TABLES.labels} WHERE id IN (${labelPlaceholders})`,
    )
      .bind(...uniqueLabelIds)
      .all<{ id: string }>()
    const foundLabelIds = new Set(
      (foundLabelsRs.results ?? []).map((r) => r.id),
    )
    if (foundLabelIds.size !== uniqueLabelIds.length) {
      const missing = uniqueLabelIds.filter((id) => !foundLabelIds.has(id))
      return err(c, ErrorCodes.NOT_FOUND, `标签不存在: ${missing.join(', ')}`)
    }
  }

  const now = nowIso()
  const statements: D1PreparedStatement[] = []

  if (mode === 'replace') {
    statements.push(
      c.env.DB.prepare(
        `DELETE FROM ${TABLES.issueLabels} WHERE issue_id IN (${idPlaceholders})`,
      ).bind(...uniqueIds),
    )
  } else if (mode === 'remove') {
    statements.push(
      c.env.DB.prepare(
        `DELETE FROM ${TABLES.issueLabels}
          WHERE issue_id IN (${idPlaceholders})
            AND label_id IN (${labelPlaceholders})`,
      ).bind(...uniqueIds, ...uniqueLabelIds),
    )
  }

  if (mode === 'add' || mode === 'replace') {
    // Pack (issue, label) pairs into multi-row VALUES clauses. D1 caps each
    // statement at 100 bound parameters; with 2 params per row that's up to
    // 50 pairs per INSERT. Worst case (100 issues × 10 labels = 1000 pairs)
    // becomes 20 INSERTs instead of 1000 — well under any per-batch ceiling.
    // `OR IGNORE` keeps `add` idempotent and covers the race where `replace`
    // re-inserts a pair the same batch's DELETE just cleared.
    const PAIRS_PER_STATEMENT = 50
    const pairs: Array<[string, string]> = []
    for (const issueId of uniqueIds) {
      for (const labelId of uniqueLabelIds) {
        pairs.push([issueId, labelId])
      }
    }
    for (let i = 0; i < pairs.length; i += PAIRS_PER_STATEMENT) {
      const chunk = pairs.slice(i, i + PAIRS_PER_STATEMENT)
      const values = chunk.map(() => '(?, ?)').join(', ')
      const binds = chunk.flat()
      statements.push(
        c.env.DB.prepare(
          `INSERT OR IGNORE INTO ${TABLES.issueLabels} (issue_id, label_id) VALUES ${values}`,
        ).bind(...binds),
      )
    }
  }

  // Bump updated_at on every touched issue so cache invalidation is honest.
  statements.push(
    c.env.DB.prepare(
      `UPDATE ${TABLES.issues} SET updated_at = ? WHERE id IN (${idPlaceholders})`,
    ).bind(now, ...uniqueIds),
  )

  await c.env.DB.batch(statements)

  return ok(c, {
    ids: uniqueIds,
    mode,
    label_ids: uniqueLabelIds,
    updated_at: now,
  })
})

// -----------------------------------------------------------------------------
// DELETE /bulk  — batch delete. Body: { ids: string[] }.
//
// R2 body objects are swept for every row that carried one. FK ON DELETE
// CASCADE handles comments + issue_labels.
// -----------------------------------------------------------------------------
app.delete('/bulk', async (c) => {
  let json: unknown
  try {
    json = await c.req.json()
  } catch {
    return err(
      c,
      ErrorCodes.VALIDATION_FAILED,
      ErrorMessages[ErrorCodes.VALIDATION_FAILED],
    )
  }
  const parsed = bulkDeleteIssueBodySchema.safeParse(json)
  if (!parsed.success) {
    return err(
      c,
      ErrorCodes.VALIDATION_FAILED,
      ErrorMessages[ErrorCodes.VALIDATION_FAILED],
    )
  }
  const uniqueIds = Array.from(new Set(parsed.data.ids))
  const idPlaceholders = uniqueIds.map(() => '?').join(',')

  const foundRs = await c.env.DB.prepare(
    `SELECT id, body_r2_key FROM ${TABLES.issues} WHERE id IN (${idPlaceholders})`,
  )
    .bind(...uniqueIds)
    .all<{ id: string; body_r2_key: string | null }>()
  const rows = foundRs.results ?? []
  if (rows.length !== uniqueIds.length) {
    const foundSet = new Set(rows.map((r) => r.id))
    const missing = uniqueIds.filter((id) => !foundSet.has(id))
    return err(c, ErrorCodes.NOT_FOUND, `未找到 issue: ${missing.join(', ')}`)
  }

  await c.env.DB.prepare(
    `DELETE FROM ${TABLES.issues} WHERE id IN (${idPlaceholders})`,
  )
    .bind(...uniqueIds)
    .run()

  // R2 sweep after DB commit — D1 delete already succeeded; whatever slips
  // through is R2 garbage, not an orphaned pointer. Use allSettled so a
  // transient R2 failure doesn't surface as a 500 on rows that are already
  // gone (which would prompt clients to retry and receive 404).
  const r2Keys = rows
    .map((r) => r.body_r2_key)
    .filter((k): k is string => k !== null)
  if (r2Keys.length > 0) {
    const settled = await Promise.allSettled(
      r2Keys.map((key) => deleteBodyFromR2(c.env.R2, key)),
    )
    const failed = settled.filter((s) => s.status === 'rejected').length
    if (failed > 0) {
      console.warn(
        `[issues bulk delete] R2 sweep left ${failed}/${r2Keys.length} orphaned object(s)`,
      )
    }
  }

  // Attachment sweep per deleted issue — parallel, best-effort.
  const swept = await Promise.allSettled(
    uniqueIds.map((id) => sweepIssueAttachments(c.env.R2, id)),
  )
  const sweptFailed = swept.filter((s) => s.status === 'rejected').length
  if (sweptFailed > 0) {
    console.warn(
      `[issues bulk delete] attachment sweep failed for ${sweptFailed}/${uniqueIds.length} issue(s)`,
    )
  }

  return ok(c, { ids: uniqueIds, deleted: rows.length })
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
    return err(
      c,
      ErrorCodes.VALIDATION_FAILED,
      ErrorMessages[ErrorCodes.VALIDATION_FAILED],
    )
  }
  const parsed = updateIssueBodySchema.safeParse(json)
  if (!parsed.success) {
    return err(
      c,
      ErrorCodes.VALIDATION_FAILED,
      ErrorMessages[ErrorCodes.VALIDATION_FAILED],
    )
  }
  const patch = parsed.data

  const existing = await loadIssueRowMeta(c.env.DB, id)
  if (!existing) {
    return err(c, ErrorCodes.NOT_FOUND, ErrorMessages[ErrorCodes.NOT_FOUND])
  }

  // Validate project_id change (if present)
  if (
    patch.project_id !== undefined &&
    patch.project_id !== existing.project_id
  ) {
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
        c.env.DB.prepare(
          `INSERT INTO ${TABLES.issueLabels} (issue_id, label_id) VALUES (?, ?)`,
        ).bind(id, labelId),
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
    ...(patch.due_date !== undefined
      ? { due_date: patch.due_date ?? null }
      : {}),
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
    return err(
      c,
      ErrorCodes.VALIDATION_FAILED,
      ErrorMessages[ErrorCodes.VALIDATION_FAILED],
    )
  }
  const parsed = updateIssueStatusBodySchema.safeParse(json)
  if (!parsed.success) {
    return err(
      c,
      ErrorCodes.VALIDATION_FAILED,
      ErrorMessages[ErrorCodes.VALIDATION_FAILED],
    )
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

  // FK ON DELETE CASCADE handles comments + issue_labels + attachments rows.
  // R2 sweep for the body + any attachment blobs is our responsibility.
  if (existing.body_r2_key) {
    await deleteBodyFromR2(c.env.R2, existing.body_r2_key)
  }
  await c.env.DB.prepare(`DELETE FROM ${TABLES.issues} WHERE id = ?`)
    .bind(id)
    .run()

  // Sweep after the DB commit — anything left is R2 garbage, not an orphan pointer.
  await sweepIssueAttachments(c.env.R2, id).catch((e) => {
    console.warn('[issues delete] attachment sweep failed:', e)
  })

  return noContent(c)
})

// ---------------------------------------------------------------------------
// POST /:id/attachments — upload one file (multipart/form-data, field "file")
// GET  /:id/attachments — list all attachments on an issue, newest first
// ---------------------------------------------------------------------------
function rowToAttachment(r: AttachmentRow): Attachment {
  return {
    id: r.id,
    issue_id: r.issue_id,
    filename: r.filename,
    mime: r.mime,
    size_bytes: r.size_bytes,
    uploaded_at: r.uploaded_at,
    url: attachmentUrl(r.id),
  }
}

app.post('/:id/attachments', async (c) => {
  const issueId = c.req.param('id')

  const issueRow = await c.env.DB.prepare(
    `SELECT id FROM ${TABLES.issues} WHERE id = ?`,
  )
    .bind(issueId)
    .first<{ id: string }>()
  if (!issueRow) {
    return err(c, ErrorCodes.NOT_FOUND, 'issue 不存在')
  }

  // Cheap pre-check via Content-Length. Real bytes are counted after read too
  // (client can lie about the header — we still bail before writing to R2).
  const contentLength = Number(c.req.header('content-length') ?? '0')
  if (contentLength > MAX_ATTACHMENT_BYTES) {
    return err(
      c,
      ErrorCodes.VALIDATION_FAILED,
      `文件大小超过限制（最大 ${Math.floor(MAX_ATTACHMENT_BYTES / (1024 * 1024))} MB）`,
    )
  }

  let form: FormData
  try {
    form = await c.req.formData()
  } catch {
    return err(
      c,
      ErrorCodes.VALIDATION_FAILED,
      '请求体必须为 multipart/form-data',
    )
  }
  const file = form.get('file')
  if (!(file instanceof File)) {
    return err(c, ErrorCodes.VALIDATION_FAILED, '缺少 file 字段')
  }
  if (file.size === 0) {
    return err(c, ErrorCodes.VALIDATION_FAILED, '文件为空')
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return err(
      c,
      ErrorCodes.VALIDATION_FAILED,
      `文件大小超过限制（最大 ${Math.floor(MAX_ATTACHMENT_BYTES / (1024 * 1024))} MB）`,
    )
  }

  const filename = (file.name || 'file').slice(0, 255)
  const mime = sanitizeStoredMime(file.type)
  const id = generateAttachmentId()
  const r2_key = attachmentR2Key(issueId, id)
  const uploaded_at = new Date().toISOString()

  const buffer = await file.arrayBuffer()
  await c.env.R2.put(r2_key, buffer, {
    httpMetadata: { contentType: mime },
  })

  try {
    await c.env.DB.prepare(
      `INSERT INTO ${TABLES.attachments}
       (id, issue_id, r2_key, filename, size_bytes, mime, uploaded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(id, issueId, r2_key, filename, file.size, mime, uploaded_at)
      .run()
  } catch (e) {
    // Roll back the R2 write if the row insert fails so we don't leak a blob.
    await c.env.R2.delete(r2_key).catch(() => {})
    throw e
  }

  const attachment: Attachment = {
    id,
    issue_id: issueId,
    filename,
    mime,
    size_bytes: file.size,
    uploaded_at,
    url: attachmentUrl(id),
  }
  return ok(c, attachment, { httpStatus: 201 })
})

app.get('/:id/attachments', async (c) => {
  const issueId = c.req.param('id')
  const issueRow = await c.env.DB.prepare(
    `SELECT id FROM ${TABLES.issues} WHERE id = ?`,
  )
    .bind(issueId)
    .first<{ id: string }>()
  if (!issueRow) {
    return err(c, ErrorCodes.NOT_FOUND, 'issue 不存在')
  }
  const rs = await c.env.DB.prepare(
    `SELECT * FROM ${TABLES.attachments}
     WHERE issue_id = ? ORDER BY uploaded_at DESC`,
  )
    .bind(issueId)
    .all<AttachmentRow>()
  return ok(c, {
    list: (rs.results ?? []).map(rowToAttachment),
    total: rs.results?.length ?? 0,
  })
})

export default app
