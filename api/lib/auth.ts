/**
 * High-level authentication helper for Worker routes.
 *
 * Reads `Authorization: Bearer <token>`, verifies the HS256 signature, checks
 * the KV blacklist by `jti`, and returns the typed claims — or throws an
 * {@link AuthError} the caller (typically the auth-guard middleware) maps to
 * a 40101 envelope.
 */
import type { Context } from 'hono'
import type { Env } from '../index'
import { type JwtClaims, JwtError, verifyJwt } from './jwt'

/**
 * Minimal shape needed by {@link authenticate} / {@link revoke}. Any Hono
 * `Context` bound to `Bindings: Env` satisfies this, regardless of its
 * `Variables` shape — which is important because middleware often augments
 * `Variables` and Hono's `Context` is invariant in that slot.
 */
type EnvContext = Pick<Context<{ Bindings: Env }>, 'req' | 'env'>

export interface AuthContext {
  claims: JwtClaims
}

export type AuthErrorReason = 'missing' | 'invalid' | 'expired' | 'revoked'

export class AuthError extends Error {
  constructor(public readonly reason: AuthErrorReason) {
    super(`auth: ${reason}`)
    this.name = 'AuthError'
  }
}

/** KV key prefix for revoked jti entries. */
export const JWT_BLACKLIST_PREFIX = 'jwt:blacklist:'

/**
 * Verify the request's bearer token and confirm it has not been revoked.
 *
 * Failure modes surface as {@link AuthError}:
 *  - `missing`  — no Authorization header, or not `Bearer <token>`
 *  - `expired`  — token past `exp`
 *  - `invalid`  — malformed / bad signature / unsupported alg
 *  - `revoked`  — jti present in KV blacklist
 */
export async function authenticate(c: EnvContext): Promise<JwtClaims> {
  const header = c.req.header('Authorization')
  if (!header) {
    throw new AuthError('missing')
  }
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  if (!match) {
    throw new AuthError('missing')
  }
  const token = match[1] as string

  let claims: JwtClaims
  try {
    claims = await verifyJwt(c.env.JWT_SECRET, token)
  } catch (e) {
    if (e instanceof JwtError) {
      if (e.reason === 'expired') {
        throw new AuthError('expired')
      }
      throw new AuthError('invalid')
    }
    throw e
  }

  const blacklisted = await c.env.KV.get(JWT_BLACKLIST_PREFIX + claims.jti)
  if (blacklisted !== null) {
    throw new AuthError('revoked')
  }
  return claims
}

/** Cloudflare KV enforces a 60-second minimum for expirationTtl. */
const KV_MIN_TTL_SECONDS = 60

/**
 * Add the jti to the KV blacklist for the token's remaining lifetime. The TTL
 * is clamped to the 60-second KV minimum; a small over-retention is harmless
 * because {@link verifyJwt} already rejects tokens past `exp`.
 */
export async function revoke(c: EnvContext, claims: JwtClaims): Promise<void> {
  const now = Math.floor(Date.now() / 1000)
  const remaining = claims.exp - now
  const ttl = Math.max(KV_MIN_TTL_SECONDS, remaining)
  await c.env.KV.put(JWT_BLACKLIST_PREFIX + claims.jti, '1', { expirationTtl: ttl })
}
