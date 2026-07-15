/**
 * CORS middleware factory.
 *
 * Wraps Hono's `cors()` with project defaults. Origin resolution is deferred
 * to request time so that `c.env.APP_URL` (the canonical browser origin) and
 * the optional `CORS_EXTRA_ORIGINS` allowlist are honored on every request.
 */
import type { MiddlewareHandler } from 'hono'
import { cors as honoCors } from 'hono/cors'
import type { Env } from '../index'

const ALLOWED_METHODS = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS']

const ALLOWED_HEADERS = ['Content-Type', 'Authorization', 'X-Request-Id']

const EXPOSE_HEADERS = ['X-Request-Id']

function parseExtraOrigins(raw: string | undefined): string[] {
  if (!raw) {
    return []
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/**
 * CORS defaults for the personal product:
 * - `env.APP_URL` is the canonical browser origin. Additional allowed origins
 *   are set via the `CORS_EXTRA_ORIGINS` env (comma-separated), if present.
 * - Credentials on (JWT via Authorization header + potential future cookie session).
 * - Preflight cache 10 min.
 * - Exposes `X-Request-Id` for the FE to correlate errors with logs.
 */
export function corsMiddleware(): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const allowList = new Set<string>()
    if (c.env.APP_URL) {
      allowList.add(c.env.APP_URL)
    }
    for (const origin of parseExtraOrigins(c.env.CORS_EXTRA_ORIGINS)) {
      allowList.add(origin)
    }

    const handler = honoCors({
      origin: (origin) => {
        if (!origin) {
          return null
        }
        return allowList.has(origin) ? origin : null
      },
      allowMethods: ALLOWED_METHODS,
      allowHeaders: ALLOWED_HEADERS,
      exposeHeaders: EXPOSE_HEADERS,
      credentials: true,
      maxAge: 600,
    })

    return handler(c, next)
  }
}
