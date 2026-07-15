/**
 * Structured request logger middleware.
 *
 * Emits one JSON line to `console.log` per request completion. Assigns a
 * request id (upstream `X-Request-Id` if present, else `crypto.randomUUID()`),
 * exposes it back to the client via the same response header, and stashes it
 * at `c.get('requestId')` for downstream middleware / handlers.
 *
 * Sensitive headers (Authorization) are never logged.
 * Request/response bodies are never logged.
 */
import type { MiddlewareHandler } from 'hono'
import type { Env } from '../index'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

function pickLevel(status: number): LogLevel {
  if (status >= 500) {
    return 'error'
  }
  if (status >= 400) {
    return 'warn'
  }
  return 'info'
}

/**
 * Emit when the request's level rank is >= the configured `LOG_LEVEL` rank.
 * Unset LOG_LEVEL defaults to `info` — everything at info and above is emitted.
 */
function shouldEmit(level: LogLevel, envLevel: LogLevel | undefined): boolean {
  const threshold = envLevel ? LEVEL_RANK[envLevel] : LEVEL_RANK.info
  return LEVEL_RANK[level] >= threshold
}

function resolveIp(header: string | undefined, fallback: string | undefined): string {
  if (header && header.length > 0) {
    return header
  }
  if (fallback && fallback.length > 0) {
    const first = fallback.split(',')[0]?.trim()
    if (first && first.length > 0) {
      return first
    }
  }
  return 'unknown'
}

export interface RequestLoggerVariables {
  requestId: string
}

/**
 * Structured request logger.
 * - Adds `X-Request-Id` to the response (uses upstream value if present, else generates a UUIDv4-like id via crypto.randomUUID()).
 * - Logs one JSON line to console.log at request completion: { level, ts, method, path, status, durationMs, requestId, ip }.
 * - Sensitive headers (Authorization) are never logged.
 * - Level defaults to 'info'; skipped when env.LOG_LEVEL === 'error' unless the response is 5xx.
 */
export function requestLogger(): MiddlewareHandler<{
  Bindings: Env
  Variables: RequestLoggerVariables
}> {
  return async (c, next) => {
    const t0 = performance.now()
    const upstreamId = c.req.header('X-Request-Id') ?? c.req.header('x-request-id')
    const requestId = upstreamId && upstreamId.length > 0 ? upstreamId : crypto.randomUUID()
    c.set('requestId', requestId)
    c.header('X-Request-Id', requestId)

    await next()

    const status = c.res.status
    const level = pickLevel(status)
    if (!shouldEmit(level, c.env.LOG_LEVEL)) {
      return
    }

    const durationMs = Math.round(performance.now() - t0)
    const ip = resolveIp(c.req.header('CF-Connecting-IP'), c.req.header('X-Forwarded-For'))
    const path = new URL(c.req.url).pathname

    // structured request log — allowed console.log
    console.log(
      JSON.stringify({
        level,
        ts: new Date().toISOString(),
        method: c.req.method,
        path,
        status,
        durationMs,
        requestId,
        ip,
      }),
    )
  }
}
