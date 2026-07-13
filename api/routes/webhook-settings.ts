/**
 * Webhook settings — logged-in operator only.
 *
 * Mounted at `/api/settings/webhooks/*` from `api/routes/index.ts`.
 *   GET  /recent           → recent inbound webhook log entries + masked secret
 *   POST /rotate-secret    → rotate the shared HMAC secret (returned once)
 *
 * Secret rotation model
 * ---------------------
 * Current webhook secret lives in KV at `webhook:secret:current`. The ingest
 * route reads that value with `env.WEBHOOK_SECRET` (deploy-time binding) as
 * a bootstrap fallback. This lets rotation take effect without a redeploy.
 * A rotated secret is only ever returned inline once — subsequent reads only
 * surface the masked form.
 */
import { Hono } from 'hono'
import type { Env } from '../index'
import { ok, err } from '../lib/response'
import { ErrorCodes } from '../../src/lib/error-codes'
import { authGuard, type AuthGuardVariables } from '../middleware/auth-guard'
import { recentWebhooksQuerySchema } from '../../src/lib/validators/webhook'
import type { WebhookLogRow } from '../db/types'
import type { WebhookLog } from '../../src/lib/api-types'

const SECRET_KV_KEY = 'webhook:secret:current'
const MASK_CHAR = '•' // bullet
const MASK_LENGTH = 12
const SECRET_PREFIX = 'wh_secret_'
const SECRET_BYTES = 32

function rowToWebhookLog(row: WebhookLogRow): WebhookLog {
  return {
    id: row.id,
    source: row.source,
    event_id: row.event_id,
    event_type: row.event_type,
    http_status: row.http_status,
    error_summary: row.error_summary,
    issue_id: row.issue_id,
    received_at: row.received_at,
  }
}

/**
 * Render a masked view of the current secret. Only the last 4 chars are
 * disclosed — matching the AC-072 UX contract
 * (`wh_secret_••••••••••••3f2a`).
 */
function maskSecret(secret: string): string {
  const tail = secret.slice(-4)
  return `${SECRET_PREFIX}${MASK_CHAR.repeat(MASK_LENGTH)}${tail}`
}

/**
 * Generate a fresh secret. 32 random bytes → 64 hex chars, `wh_secret_`
 * prefix so the value is self-describing in logs and copy dialogs.
 */
function generateSecret(): string {
  const bytes = new Uint8Array(SECRET_BYTES)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${SECRET_PREFIX}${hex}`
}

const app = new Hono<{ Bindings: Env; Variables: AuthGuardVariables }>()

app.use('*', authGuard())

// -----------------------------------------------------------------------------
// GET /recent  (mounted at /api/settings/webhooks/recent)
// -----------------------------------------------------------------------------
app.get('/recent', async (c) => {
  const parseResult = recentWebhooksQuerySchema.safeParse({
    limit: c.req.query('limit'),
  })
  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0]
    const summary = firstIssue
      ? `${firstIssue.path.join('.') || 'limit'}: ${firstIssue.message}`
      : 'limit 参数无效'
    return err(c, ErrorCodes.VALIDATION_FAILED, summary)
  }

  const { limit } = parseResult.data

  const rs = await c.env.DB.prepare(
    `SELECT id, source, event_id, event_type, payload, http_status, error_summary, issue_id, received_at
       FROM webhook_logs
      ORDER BY received_at DESC
      LIMIT ?`,
  )
    .bind(limit)
    .all<WebhookLogRow>()

  const list: WebhookLog[] = (rs.results ?? []).map(rowToWebhookLog)

  const currentSecret =
    (await c.env.KV.get(SECRET_KV_KEY)) ?? c.env.WEBHOOK_SECRET
  const secretMasked = maskSecret(currentSecret)

  return ok(c, { list, secret_masked: secretMasked })
})

// -----------------------------------------------------------------------------
// POST /rotate-secret (mounted at /api/settings/webhooks/rotate-secret)
// -----------------------------------------------------------------------------
app.post('/rotate-secret', async (c) => {
  const secret = generateSecret()
  await c.env.KV.put(SECRET_KV_KEY, secret) // persistent — no TTL
  const rotatedAt = new Date().toISOString()
  return ok(c, { secret, rotated_at: rotatedAt })
})

export default app
