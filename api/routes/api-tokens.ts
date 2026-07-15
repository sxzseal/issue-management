/**
 * API token management — session-authenticated owner only.
 *
 * Mounted at `/api/settings/api-tokens/*` from `api/routes/index.ts`.
 *   GET  /              → list all tokens (active + revoked, newest first)
 *   POST /              → mint a new token (raw returned ONCE)
 *   POST /:id/revoke    → soft-revoke (sets revoked_at)
 *
 * Self-protection: API tokens are rejected on this router — a compromised
 * token must not be able to mint new tokens or revoke others. Only a real
 * browser session (JWT) can manage tokens.
 */
import { Hono } from 'hono'
import type { Env } from '../index'
import { authGuard, type AuthGuardVariables } from '../middleware/auth-guard'
import { ok, err } from '../lib/response'
import { ErrorCodes, ErrorMessages } from '../../src/lib/error-codes'
import { TABLES } from '../db/schema'
import type { ApiTokenRow } from '../db/types'
import type { ApiToken, CreatedApiToken } from '../../src/lib/api-types'
import { createApiTokenBodySchema } from '../../src/lib/validators/api-token'
import { generateApiToken } from '../lib/api-token'
import { rateLimit } from '../lib/rate-limit'

const app = new Hono<{ Bindings: Env; Variables: AuthGuardVariables }>()

/**
 * Per-IP rate limit for token minting. A session hijack would otherwise let
 * an attacker mint an unbounded number of no-expiry tokens before the owner
 * notices. Window is intentionally generous for the single-user product but
 * caps runaway automation.
 */
const MINT_RL_LIMIT = 10
const MINT_RL_WINDOW_SEC = 60 * 60

app.use('*', authGuard())

// Guard: API tokens cannot manage other API tokens. Runs after authGuard so
// `authKind` is populated; a browser session (JWT) is required for every
// endpoint below.
app.use('*', async (c, next) => {
  if (c.get('authKind') === 'api-token') {
    return err(c, ErrorCodes.FORBIDDEN, 'API token 无权管理 API token')
  }
  await next()
  return
})

function rowToApiToken(r: ApiTokenRow): ApiToken {
  return {
    id: r.id,
    name: r.name,
    prefix: r.prefix,
    created_at: r.created_at,
    last_used_at: r.last_used_at,
    revoked_at: r.revoked_at,
  }
}

function genTokenId(): string {
  return 'apitok_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}

// ---------------------------------------------------------------------------
// GET / — list (active + revoked, newest first)
// ---------------------------------------------------------------------------
app.get('/', async (c) => {
  const rs = await c.env.DB.prepare(
    `SELECT id, name, token_hash, prefix, created_at, last_used_at, revoked_at
       FROM ${TABLES.apiTokens}
      ORDER BY created_at DESC`,
  ).all<ApiTokenRow>()
  const list: ApiToken[] = (rs.results ?? []).map(rowToApiToken)
  return ok(c, list)
})

// ---------------------------------------------------------------------------
// POST / — mint a new token; raw returned exactly ONCE
// ---------------------------------------------------------------------------
app.post('/', async (c) => {
  const clientIp = c.req.header('CF-Connecting-IP') ?? 'unknown'
  const rl = await rateLimit(
    c.env.KV,
    `apitok:mint:${clientIp}`,
    MINT_RL_LIMIT,
    MINT_RL_WINDOW_SEC,
  )
  if (!rl.ok) {
    const minutes = Math.max(1, Math.ceil(rl.resetSec / 60))
    return err(c, ErrorCodes.RATE_LIMITED, `Token 铸造过于频繁，请 ${minutes} 分钟后再试`)
  }

  let rawBody: unknown
  try {
    rawBody = await c.req.json()
  } catch {
    return err(c, ErrorCodes.VALIDATION_FAILED, '请求体不是合法 JSON')
  }
  const parsed = createApiTokenBodySchema.safeParse(rawBody)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return err(
      c,
      ErrorCodes.VALIDATION_FAILED,
      first?.message ?? ErrorMessages[ErrorCodes.VALIDATION_FAILED],
    )
  }

  const { name } = parsed.data
  const { raw, hash, prefix } = await generateApiToken()
  const id = genTokenId()
  const createdAt = new Date().toISOString()

  await c.env.DB.prepare(
    `INSERT INTO ${TABLES.apiTokens} (id, name, token_hash, prefix, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(id, name, hash, prefix, createdAt)
    .run()

  console.warn(`api-token audit: minted id=${id} ip=${clientIp}`)

  const payload: CreatedApiToken = {
    id,
    name,
    prefix,
    created_at: createdAt,
    last_used_at: null,
    revoked_at: null,
    token: raw,
  }
  return ok(c, payload, { httpStatus: 201 })
})

// ---------------------------------------------------------------------------
// POST /:id/revoke — soft-revoke (idempotent)
//
// Returns UNAUTHORIZED (not NOT_FOUND) for unknown IDs so a session-holder
// cannot distinguish "never existed" from "already revoked" by response code
// and enumerate the historical token-ID space. Same principle as auth-guard.
// ---------------------------------------------------------------------------
app.post('/:id/revoke', async (c) => {
  const id = c.req.param('id')
  const row = await c.env.DB.prepare(
    `SELECT id, name, token_hash, prefix, created_at, last_used_at, revoked_at
       FROM ${TABLES.apiTokens} WHERE id = ? LIMIT 1`,
  )
    .bind(id)
    .first<ApiTokenRow>()

  if (!row) {
    return err(c, ErrorCodes.UNAUTHORIZED, ErrorMessages[ErrorCodes.UNAUTHORIZED])
  }

  if (row.revoked_at !== null) {
    return ok(c, rowToApiToken(row))
  }

  const revokedAt = new Date().toISOString()
  await c.env.DB.prepare(
    `UPDATE ${TABLES.apiTokens} SET revoked_at = ? WHERE id = ?`,
  )
    .bind(revokedAt, id)
    .run()

  console.warn(`api-token audit: revoked id=${id}`)
  return ok(c, rowToApiToken({ ...row, revoked_at: revokedAt }))
})

export default app
