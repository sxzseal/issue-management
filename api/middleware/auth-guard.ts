/**
 * Auth guard middleware.
 *
 * Verifies `Authorization: Bearer <token>`, checks the KV blacklist, and on
 * success stashes the jti at `c.get('authJti')` so downstream handlers (e.g.
 * POST /api/auth/logout) can revoke without re-parsing the token.
 *
 * On failure returns the canonical 40101 envelope. The underlying reason
 * (expired vs. revoked vs. invalid) is intentionally NOT surfaced to the
 * client — leaking that would let an attacker distinguish revoked tokens
 * from expired ones. Reason is logged via `console.warn` for observability.
 */
import type { MiddlewareHandler } from 'hono'
import type { Env } from '../index'
import { AuthError, authenticate } from '../lib/auth'
import { err } from '../lib/response'
import { ErrorCodes, ErrorMessages } from '../../src/lib/error-codes'

export interface AuthGuardVariables {
  authJti: string
}

export function authGuard(): MiddlewareHandler<{
  Bindings: Env
  Variables: AuthGuardVariables
}> {
  return async (c, next) => {
    try {
      const claims = await authenticate(c)
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
