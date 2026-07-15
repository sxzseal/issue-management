/**
 * Auth routes: POST /login (master password → 30-day JWT) and POST /logout
 * (jti → KV blacklist).
 *
 * Personal single-user product: `env.APP_PASSWORD` holds the plaintext master
 * password (`wrangler secret put APP_PASSWORD`); we constant-time compare
 * against the submitted password. Per-IP failure counter lives at
 * `login:fail:<ip>` and — per AC-006 — freezes for 15 minutes after 5 wrong
 * attempts.
 */
import { Hono } from 'hono'
import type { Env } from '../index'
import { loginBodySchema } from '../../src/lib/validators/auth'
import { ErrorCodes, ErrorMessages } from '../../src/lib/error-codes'
import { ok, err } from '../lib/response'
import { signJwt, randomJti } from '../lib/jwt'
import { authenticate, revoke, AuthError } from '../lib/auth'
import { rateLimitLoginFailure } from '../lib/rate-limit'

const LOGIN_FAIL_KEY_PREFIX = 'login:fail:'
const LOGIN_FAIL_LIMIT = 5
const LOGIN_FREEZE_SEC = 15 * 60
const JWT_TTL_SEC = 30 * 24 * 3600

const app = new Hono<{ Bindings: Env }>()

/**
 * Constant-time equality over UTF-8 encoded strings. Returns false immediately
 * on length mismatch (the length itself is not a secret here — password length
 * is bounded by the schema), otherwise XORs every byte to avoid short-circuit.
 */
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const ab = enc.encode(a)
  const bb = enc.encode(b)
  if (ab.length !== bb.length) {
    return false
  }
  let diff = 0
  for (let i = 0; i < ab.length; i += 1) {
    diff |= (ab[i] as number) ^ (bb[i] as number)
  }
  return diff === 0
}

app.post('/login', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return err(c, ErrorCodes.VALIDATION_FAILED, ErrorMessages[ErrorCodes.VALIDATION_FAILED])
  }

  const parsed = loginBodySchema.safeParse(body)
  if (!parsed.success) {
    return err(c, ErrorCodes.VALIDATION_FAILED, ErrorMessages[ErrorCodes.VALIDATION_FAILED])
  }
  const { password } = parsed.data

  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
  const failKey = `${LOGIN_FAIL_KEY_PREFIX}${ip}`

  // Single "enforce + record" call: `rateLimitLoginFailure` both blocks when
  // the freeze is active AND increments the per-attempt counter. On a
  // successful password we clear the key below, so legitimate logins do not
  // pollute the counter.
  const rl = await rateLimitLoginFailure(c.env.KV, failKey, LOGIN_FAIL_LIMIT, LOGIN_FREEZE_SEC)
  if (!rl.ok) {
    const minutes = Math.max(1, Math.ceil(rl.resetSec / 60))
    return err(c, ErrorCodes.RATE_LIMITED, `尝试过多，请 ${minutes} 分钟后再试`)
  }

  if (!safeEqual(password, c.env.APP_PASSWORD)) {
    return err(c, ErrorCodes.UNAUTHORIZED, '密码错误')
  }

  // Success — clear the failure counter, then issue a 30-day JWT.
  await c.env.KV.delete(failKey)

  const now = Math.floor(Date.now() / 1000)
  const exp = now + JWT_TTL_SEC
  const jti = randomJti()
  const token = await signJwt(c.env.JWT_SECRET, { sub: 'owner', iat: now, exp, jti })
  const expires_at = new Date(exp * 1000).toISOString()
  return ok(c, { token, expires_at })
})

app.post('/logout', async (c) => {
  try {
    const claims = await authenticate(c)
    await revoke(c, claims)
    return ok(c, null)
  } catch (e) {
    if (e instanceof AuthError) {
      return err(c, ErrorCodes.UNAUTHORIZED, ErrorMessages[ErrorCodes.UNAUTHORIZED])
    }
    throw e
  }
})

export default app
