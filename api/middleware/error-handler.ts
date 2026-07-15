/**
 * Catch-all error middleware.
 *
 * Wraps `await next()` in try/catch and returns a standardized error envelope
 * for unhandled exceptions. Does NOT leak stack traces to clients. Logs via
 * `console.error` with the current request id when available.
 *
 * Domain error translations:
 *   - AuthError (from api/lib/auth) -> 40101 UNAUTHORIZED
 *   - anything else                 -> 50001 INTERNAL_ERROR
 */
import type { MiddlewareHandler } from 'hono'
import type { Env } from '../index'
import { AuthError } from '../lib/auth'
import { err } from '../lib/response'
import { ErrorCodes, ErrorMessages } from '../../src/lib/error-codes'

interface ErrorHandlerVariables {
  requestId?: string
}

export function errorHandler(): MiddlewareHandler<{
  Bindings: Env
  Variables: ErrorHandlerVariables
}> {
  return async (c, next) => {
    try {
      await next()
      return
    } catch (e) {
      const requestId = c.get('requestId') ?? 'unknown'
      const error =
        e instanceof Error
          ? { name: e.name, message: e.message }
          : { message: String(e) }

      console.error(
        JSON.stringify({
          level: 'error',
          ts: new Date().toISOString(),
          requestId,
          error,
        }),
      )

      if (e instanceof AuthError) {
        return err(
          c,
          ErrorCodes.UNAUTHORIZED,
          ErrorMessages[ErrorCodes.UNAUTHORIZED],
        )
      }

      return err(
        c,
        ErrorCodes.INTERNAL_ERROR,
        ErrorMessages[ErrorCodes.INTERNAL_ERROR],
      )
    }
  }
}
