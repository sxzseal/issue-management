/**
 * Public webhook ingest — `POST /api/webhooks/issues`.
 *
 * NO `authGuard`: this route is called by external systems. Auth is the
 * shared HMAC secret verified over the raw request body.
 *
 * Contract of record: `.loop/api-contracts.json` §7.8 (flat body shape:
 * title / body / project_hint / priority / labels / due_date / external_ref)
 * — chosen over the T006 envelope schema (`webhookIngestBodySchema`).
 * See sa-T012 receipt deviation `webhook-contract-drift-resolution`.
 *
 * Headers consumed:
 *   X-Webhook-Signature — `sha256=<hex>` HMAC of the raw body
 *   X-Webhook-Event-Id  — idempotency key (required)
 *   X-Webhook-Source    — logical source name (required, e.g. "github", "linear")
 */
import { Hono } from 'hono'
import { z } from 'zod'
import type { Env } from '../index'
import { ok, err } from '../lib/response'
import { ErrorCodes } from '../../src/lib/error-codes'
import { verifyWebhookSignature } from '../lib/webhook-sig'
import {
  deleteBodyFromR2,
  issueBodyKey,
  shouldOverflow,
  writeBodyToR2,
} from '../lib/r2-body'
import {
  readIdempotencyRecord,
  writeIdempotencyRecord,
  type IdempotencyRecord,
} from '../lib/idempotency'
import { rateLimit } from '../lib/rate-limit'
import {
  issuePrioritySchema,
  type IssuePriority,
} from '../../src/lib/validators/issue'

// -----------------------------------------------------------------------------
// Body schema — flat shape from `.loop/api-contracts.json`
// (T006's `webhookIngestBodySchema` uses an envelope shape; contract wins.)
// -----------------------------------------------------------------------------
const flatWebhookIngestBodySchema = z
  .object({
    title: z.string().min(1).max(200),
    body: z.string().max(200000).optional().nullable(),
    project_hint: z.string().optional().nullable(),
    priority: issuePrioritySchema.optional(),
    labels: z.array(z.string().min(1).max(30)).optional(),
    due_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, '日期需为 YYYY-MM-DD')
      .optional()
      .nullable(),
    external_ref: z.string().min(1).max(120),
  })
  .strict()

type FlatWebhookIngestBody = z.infer<typeof flatWebhookIngestBodySchema>

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------
const RATE_LIMIT_PER_SOURCE = 30 // req / minute / source (per AC-142)
const RATE_LIMIT_WINDOW_SEC = 60
const DEFAULT_PRIORITY: IssuePriority = 'p2'
const INBOX_PROJECT_ID = 'proj_inbox'
const DEFAULT_LABEL_COLOR = '#64748b' // neutral slate — auto-created labels
/**
 * Cap for the raw request body persisted to `webhook_logs.payload`. Larger
 * bodies are truncated at write-time so an unauthenticated caller cannot
 * amplify DB writes by shipping a 200KB body per request.
 */
const LOG_PAYLOAD_MAX_BYTES = 1024

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function nowIso(): string {
  return new Date().toISOString()
}

function randomHexId(prefix: string, length: number): string {
  return prefix + crypto.randomUUID().replace(/-/g, '').slice(0, length)
}

/** Cap the persisted payload so unauthenticated callers can't amplify writes. */
function truncateForLog(payload: string): string {
  return payload.length > LOG_PAYLOAD_MAX_BYTES
    ? payload.slice(0, LOG_PAYLOAD_MAX_BYTES)
    : payload
}

/**
 * Audit-only write to `webhook_logs` for failures reached BEFORE signature
 * verification. Deliberately does NOT persist an idempotency record — an
 * unauthenticated attacker could otherwise poison the cache by guessing a
 * future event_id (see review H11). Payload is truncated to bound growth.
 */
async function logPreAuthFailure(
  env: Env,
  args: {
    source: string
    eventId: string
    payload: string
    httpStatus: number
    errorSummary: string
  },
): Promise<void> {
  const receivedAt = nowIso()
  const logId = randomHexId('whlg_', 12)
  try {
    await env.DB.prepare(
      `INSERT INTO webhook_logs
         (id, source, event_id, event_type, payload, http_status, error_summary, issue_id, received_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)
       ON CONFLICT(event_id) DO NOTHING`,
    )
      .bind(
        logId,
        args.source,
        args.eventId,
        'unknown',
        truncateForLog(args.payload),
        args.httpStatus,
        args.errorSummary,
        receivedAt,
      )
      .run()
  } catch (e) {
    console.warn('webhook-ingest: failed to write pre-auth webhook_logs', e)
  }
}

/**
 * Persist a `webhook_logs` row and an idempotency record in one place so error
 * branches and the success path share the same write pattern. Only called
 * AFTER signature verification passes.
 */
async function logIngestOutcome(
  env: Env,
  args: {
    source: string
    eventId: string
    eventType: string
    payload: string
    httpStatus: number
    errorSummary: string | null
    issueId: string | null
    outcome: 'success' | 'error'
  },
): Promise<void> {
  const receivedAt = nowIso()
  const logId = randomHexId('whlg_', 12)

  try {
    await env.DB.prepare(
      `INSERT INTO webhook_logs
         (id, source, event_id, event_type, payload, http_status, error_summary, issue_id, received_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(event_id) DO NOTHING`,
    )
      .bind(
        logId,
        args.source,
        args.eventId,
        args.eventType,
        truncateForLog(args.payload),
        args.httpStatus,
        args.errorSummary,
        args.issueId,
        receivedAt,
      )
      .run()
  } catch (e) {
    // Swallow — logging must never break the outbound response. Errors here
    // are surfaced by the outer error-handler middleware if severe.
    console.warn('webhook-ingest: failed to write webhook_logs', e)
  }

  const record: IdempotencyRecord = {
    eventId: args.eventId,
    source: args.source,
    storedAt: receivedAt,
    outcome: args.outcome,
    httpStatus: args.httpStatus,
    ...(args.issueId ? { issueId: args.issueId } : {}),
  }
  try {
    await writeIdempotencyRecord(env.KV, record)
  } catch (e) {
    console.warn('webhook-ingest: failed to write idempotency record', e)
  }
}

/**
 * Resolve a project by hint (id or name). Falls back to Inbox when the hint
 * is missing OR unrecognized (contract semantics: `project_hint` is advisory).
 */
async function resolveProjectId(env: Env, hint: string | null | undefined): Promise<string> {
  if (!hint || hint.trim().length === 0) {
    return INBOX_PROJECT_ID
  }
  const trimmed = hint.trim()
  const row = await env.DB.prepare(
    'SELECT id FROM projects WHERE id = ? OR name = ? LIMIT 1',
  )
    .bind(trimmed, trimmed)
    .first<{ id: string }>()
  return row?.id ?? INBOX_PROJECT_ID
}

/**
 * Upsert labels by name; return their ids in the same order as `names`.
 * Contract text says "v1 不自动建" but T012 spec instructs auto-creating
 * missing labels with a neutral color so webhook-authored issues are not
 * silently stripped of context. Recorded as a deviation in sa-T012.
 */
async function upsertLabelIds(env: Env, names: readonly string[]): Promise<string[]> {
  const unique = Array.from(new Set(names.map((n) => n.trim()).filter((n) => n.length > 0)))
  if (unique.length === 0) {
    return []
  }

  // One batch instead of N sequential round-trips. `ON CONFLICT(name) DO NOTHING`
  // keeps this safe even when the same label already exists.
  const timestamp = nowIso()
  await env.DB.batch(
    unique.map((name) =>
      env.DB
        .prepare(
          `INSERT INTO labels (id, name, color, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(name) DO NOTHING`,
        )
        .bind(randomHexId('lbl_', 10), name, DEFAULT_LABEL_COLOR, timestamp, timestamp),
    ),
  )

  const placeholders = unique.map(() => '?').join(',')
  const rs = await env.DB.prepare(
    `SELECT id, name FROM labels WHERE name IN (${placeholders})`,
  )
    .bind(...unique)
    .all<{ id: string; name: string }>()

  const byName = new Map((rs.results ?? []).map((r) => [r.name, r.id]))
  return unique
    .map((n) => byName.get(n))
    .filter((id): id is string => typeof id === 'string')
}

// -----------------------------------------------------------------------------
// Router
// -----------------------------------------------------------------------------
const app = new Hono<{ Bindings: Env }>()

app.post('/webhooks/issues', async (c) => {
  const signatureHeader = c.req.header('X-Webhook-Signature') ?? null
  const eventId = c.req.header('X-Webhook-Event-Id')
  const source = c.req.header('X-Webhook-Source')

  // Load raw body ONCE — signature verifies over exact bytes.
  const rawBody = await c.req.text()

  // --- Header presence checks ---------------------------------------------
  if (!eventId || eventId.trim().length === 0) {
    // No eventId means we can't dedup or log meaningfully — bail early.
    return err(c, ErrorCodes.VALIDATION_FAILED, '缺少 X-Webhook-Event-Id')
  }
  if (!source || source.trim().length === 0) {
    return err(c, ErrorCodes.VALIDATION_FAILED, '缺少 X-Webhook-Source')
  }

  const trimmedSource = source.trim()
  const trimmedEventId = eventId.trim()

  // --- Signature verification FIRST ----------------------------------------
  // Verify HMAC before any side-effect writes (rate-limit counter, webhook_logs
  // row, or idempotency record). This prevents an unauthenticated caller from
  // (a) amplifying D1/KV writes by flooding requests, (b) poisoning the
  // idempotency cache by guessing a future event_id, or (c) filling
  // webhook_logs with attacker-controlled payload content.
  const currentSecret =
    (await c.env.KV.get('webhook:secret:current')) ?? c.env.WEBHOOK_SECRET
  const sigOk = await verifyWebhookSignature(currentSecret, rawBody, signatureHeader)
  if (!sigOk) {
    await logPreAuthFailure(c.env, {
      source: trimmedSource,
      eventId: trimmedEventId,
      payload: rawBody,
      httpStatus: 403,
      errorSummary: 'HMAC 签名校验失败',
    })
    return err(c, ErrorCodes.WEBHOOK_SIGNATURE_INVALID, '签名校验失败')
  }

  // --- Rate limit (per source, only after auth) ----------------------------
  const rl = await rateLimit(
    c.env.KV,
    `webhook:rate:${trimmedSource}`,
    RATE_LIMIT_PER_SOURCE,
    RATE_LIMIT_WINDOW_SEC,
  )
  if (!rl.ok) {
    await logIngestOutcome(c.env, {
      source: trimmedSource,
      eventId: trimmedEventId,
      eventType: 'unknown',
      payload: rawBody,
      httpStatus: 429,
      errorSummary: '限流：超过 30 次/分钟',
      issueId: null,
      outcome: 'error',
    })
    return err(c, ErrorCodes.RATE_LIMITED, '请求过于频繁')
  }

  // --- Idempotency replay --------------------------------------------------
  const existing = await readIdempotencyRecord(c.env.KV, trimmedSource, trimmedEventId)
  if (existing !== null) {
    // Replay the prior HTTP status without any side-effects. Prior outcome
    // (success vs error) already decided the code.
    if (existing.outcome === 'success') {
      return ok(
        c,
        { issue_id: existing.issueId ?? null, deduped: true },
        { httpStatus: 200 },
      )
    }
    // Error replays return the same error code family; use VALIDATION_FAILED
    // as a generic "the original request was rejected" signal since we did
    // not persist the original errorCode. This keeps the retry idempotent.
    const replayStatus: 403 | 429 | 422 =
      existing.httpStatus === 403 || existing.httpStatus === 429
        ? existing.httpStatus
        : 422
    return err(
      c,
      ErrorCodes.VALIDATION_FAILED,
      '事件已处理（之前拒绝，重放）',
      replayStatus,
    )
  }

  // --- Parse JSON ----------------------------------------------------------
  let parsedBody: unknown
  try {
    parsedBody = JSON.parse(rawBody)
  } catch {
    await logIngestOutcome(c.env, {
      source: trimmedSource,
      eventId: trimmedEventId,
      eventType: 'unknown',
      payload: rawBody,
      httpStatus: 422,
      errorSummary: '请求体不是合法 JSON',
      issueId: null,
      outcome: 'error',
    })
    return err(c, ErrorCodes.VALIDATION_FAILED, '请求体不是合法 JSON')
  }

  // --- Validate body -------------------------------------------------------
  const parseResult = flatWebhookIngestBodySchema.safeParse(parsedBody)
  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0]
    const summary = firstIssue
      ? `${firstIssue.path.join('.') || '(root)'}: ${firstIssue.message}`
      : '参数校验失败'
    await logIngestOutcome(c.env, {
      source: trimmedSource,
      eventId: trimmedEventId,
      eventType: 'issue.created',
      payload: rawBody,
      httpStatus: 422,
      errorSummary: summary,
      issueId: null,
      outcome: 'error',
    })
    return err(c, ErrorCodes.VALIDATION_FAILED, summary)
  }

  const body: FlatWebhookIngestBody = parseResult.data

  // --- external_ref conflict (distinct event id, same ref) -----------------
  const existingByRef = await c.env.DB.prepare(
    'SELECT id FROM issues WHERE external_ref = ? LIMIT 1',
  )
    .bind(body.external_ref)
    .first<{ id: string }>()
  if (existingByRef) {
    await logIngestOutcome(c.env, {
      source: trimmedSource,
      eventId: trimmedEventId,
      eventType: 'issue.created',
      payload: rawBody,
      httpStatus: 409,
      errorSummary: `external_ref 已存在: ${body.external_ref}`,
      issueId: existingByRef.id,
      outcome: 'error',
    })
    return err(c, ErrorCodes.NAME_CONFLICT, 'external_ref 已存在')
  }

  // --- Resolve project + labels -------------------------------------------
  const projectId = await resolveProjectId(c.env, body.project_hint)
  const labelIds = body.labels ? await upsertLabelIds(c.env, body.labels) : []

  // --- Insert issue --------------------------------------------------------
  // Bodies larger than the R2 threshold spill into R2; D1 keeps `body` NULL
  // and stores the R2 key so `GET /api/issues/:id` can merge on read.
  const issueId = randomHexId('iss_', 10)
  const timestamp = nowIso()
  const priority: IssuePriority = body.priority ?? DEFAULT_PRIORITY
  const rawIncomingBody = typeof body.body === 'string' ? body.body : null

  let inlineBody: string | null = rawIncomingBody
  let bodyR2Key: string | null = null
  if (rawIncomingBody !== null && shouldOverflow(rawIncomingBody)) {
    try {
      bodyR2Key = await writeBodyToR2(
        c.env.R2,
        issueBodyKey(issueId),
        rawIncomingBody,
      )
      inlineBody = null
    } catch (e) {
      const summary =
        e instanceof Error ? `R2 body write failed: ${e.message}` : 'R2 body write failed'
      await logIngestOutcome(c.env, {
        source: trimmedSource,
        eventId: trimmedEventId,
        eventType: 'issue.created',
        payload: rawBody,
        httpStatus: 500,
        errorSummary: summary,
        issueId: null,
        outcome: 'error',
      })
      return err(c, ErrorCodes.INTERNAL_ERROR, '写入 issue body 失败')
    }
  }

  try {
    // Batch the issue INSERT with its label associations so a failure on the
    // labels leg rolls back the issue row instead of leaving an orphan.
    const stmts = [
      c.env.DB.prepare(
        `INSERT INTO issues
           (id, project_id, title, body, body_r2_key, status, priority, due_date,
            external_ref, source, source_name, created_at, updated_at, archived_at)
         VALUES (?, ?, ?, ?, ?, 'todo', ?, ?, ?, 'webhook', ?, ?, ?, NULL)`,
      ).bind(
        issueId,
        projectId,
        body.title,
        inlineBody,
        bodyR2Key,
        priority,
        body.due_date ?? null,
        body.external_ref,
        trimmedSource,
        timestamp,
        timestamp,
      ),
      ...labelIds.map((labelId) =>
        c.env.DB.prepare(
          `INSERT INTO issue_labels (issue_id, label_id) VALUES (?, ?)
           ON CONFLICT(issue_id, label_id) DO NOTHING`,
        ).bind(issueId, labelId),
      ),
    ]
    await c.env.DB.batch(stmts)
  } catch (e) {
    if (bodyR2Key) {
      await deleteBodyFromR2(c.env.R2, bodyR2Key)
    }
    const summary = e instanceof Error ? e.message : 'DB insert failed'
    await logIngestOutcome(c.env, {
      source: trimmedSource,
      eventId: trimmedEventId,
      eventType: 'issue.created',
      payload: rawBody,
      httpStatus: 500,
      errorSummary: summary,
      issueId: null,
      outcome: 'error',
    })
    return err(c, ErrorCodes.INTERNAL_ERROR, '写入 issue 失败')
  }

  // --- Log success + idempotency ------------------------------------------
  await logIngestOutcome(c.env, {
    source: trimmedSource,
    eventId: trimmedEventId,
    eventType: 'issue.created',
    payload: rawBody,
    httpStatus: 201,
    errorSummary: null,
    issueId,
    outcome: 'success',
  })

  return ok(c, { issue_id: issueId, deduped: false }, { httpStatus: 201 })
})

export default app
