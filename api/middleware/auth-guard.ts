/**
 * Auth guard middleware — accepts either:
 *   • a session JWT (issued by POST /api/auth/login) — used by the web UI.
 *   • an API token (`imt_live_...`) — used by external AI / script clients
 *     that need long-lived access to the REST surface.
 *
 * The token kind is stashed at `c.get('authKind')`:
 *   'session'   — the request carries a JWT; `authJti` is also set so
 *                 `POST /api/auth/logout` can revoke without re-parsing.
 *   'api-token' — the request carries an API token; `authTokenId` is set
 *                 for downstream audit / self-protection (see api-tokens
 *                 route — API tokens cannot manage other API tokens).
 *
 * On any failure returns the canonical 40101 envelope. The underlying reason
 * (missing / expired / revoked / invalid / api-token-not-found) is NOT
 * surfaced to the client — leaking that would let an attacker distinguish
 * revoked tokens from expired ones. Reason is logged via `console.warn`.
 */
import type { MiddlewareHandler } from 'hono'
import type { Env } from '../index'
import { AuthError, authenticate } from '../lib/auth'
import { looksLikeApiToken, verifyApiToken } from '../lib/api-token'
import { err } from '../lib/response'
import { ErrorCodes, ErrorMessages } from '../../src/lib/error-codes'

export type AuthKind = 'session' | 'api-token'

export interface AuthGuardVariables {
  authKind: AuthKind
  /** Present only when authKind === 'session'. */
  authJti?: string
  /** Present only when authKind === 'api-token'. */
  authTokenId?: string
}

function extractBearer(header: string | undefined): string | null {
  if (!header) return null
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match ? (match[1] as string) : null
}

export function authGuard(): MiddlewareHandler<{
  Bindings: Env
  Variables: AuthGuardVariables
}> {
  return async (c, next) => {
    const header = c.req.header('Authorization')
    const bearer = extractBearer(header)
    if (!bearer) {
      console.warn('auth-guard rejected: missing bearer')
      return err(c, ErrorCodes.UNAUTHORIZED, ErrorMessages[ErrorCodes.UNAUTHORIZED])
    }

    if (looksLikeApiToken(bearer)) {
      const row = await verifyApiToken(c.env, bearer)
      if (!row) {
        console.warn('auth-guard rejected: api-token unknown or revoked')
        return err(c, ErrorCodes.UNAUTHORIZED, ErrorMessages[ErrorCodes.UNAUTHORIZED])
      }
      c.set('authKind', 'api-token')
      c.set('authTokenId', row.id)
      await next()
      return
    }

    try {
      const claims = await authenticate(c)
      c.set('authKind', 'session')
      c.set('authJti', claims.jti)
      await next()
      return
    } catch (e) {
      if (e instanceof AuthError) {
        console.warn('auth-guard rejected:', e.reason)
        return err(c, ErrorCodes.UNAUTHORIZED, ErrorMessages[ErrorCodes.UNAUTHORIZED])
      }
      throw e
    }
  }
}
