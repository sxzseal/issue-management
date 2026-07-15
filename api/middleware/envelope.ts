/**
 * Envelope invariant middleware — DIAGNOSTIC only.
 *
 * When `env.LOG_LEVEL === 'debug'`, inspect every JSON response and warn if:
 *   1. Payload is not shaped as `{ status_code: number, data, message? }` (AC-151)
 *   2. Known time fields fail their format guard (AC-153):
 *        - `due_date` must be `YYYY-MM-DD`
 *        - `created_at` / `updated_at` / `archived_at` / `received_at` /
 *          `storedAt` / `rotated_at` / `expires_at` must be ISO 8601 UTC
 *
 * Never mutates the response — a rogue payload still ships, but we surface
 * the drift so the offending route can be fixed. Skipped for 204 No Content
 * and any non-JSON response.
 */
import type { MiddlewareHandler } from 'hono'
import type { Env } from '../index'
import { isIsoUtc } from '../lib/time'

interface EnvelopeShape {
  status_code: number
  data: unknown
  message?: string
}

function looksLikeEnvelope(x: unknown): x is EnvelopeShape {
  return (
    typeof x === 'object' &&
    x !== null &&
    'status_code' in x &&
    typeof (x as { status_code: unknown }).status_code === 'number' &&
    'data' in x
  )
}

export function envelopeInvariant(): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    await next()
    if (c.env.LOG_LEVEL !== 'debug') return
    if (c.res.status === 204) return
    const ct = c.res.headers.get('content-type') ?? ''
    if (!ct.includes('application/json')) return
    // Clone before reading — original stream is single-use.
    const cloned = c.res.clone()
    let payload: unknown
    try {
      payload = await cloned.json()
    } catch {
      // diagnostic-only console.warn — allowed
      console.warn(
        '[envelope] non-JSON body on application/json response',
        c.req.path,
      )
      return
    }
    if (!looksLikeEnvelope(payload)) {
      // diagnostic-only console.warn — allowed
      console.warn(
        '[envelope] response missing envelope shape',
        c.req.path,
        payload,
      )
      return
    }
    validateTimeFields(payload.data, c.req.path)
  }
}

const ISO_FIELDS = new Set([
  'created_at',
  'updated_at',
  'archived_at',
  'received_at',
  'storedAt',
  'rotated_at',
  'expires_at',
])
const DATE_ONLY_FIELDS = new Set(['due_date'])

function validateTimeFields(node: unknown, path: string): void {
  if (node === null || node === undefined) return
  if (Array.isArray(node)) {
    node.forEach((item) => validateTimeFields(item, path))
    return
  }
  if (typeof node !== 'object') return
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (v === null || v === undefined) continue
    if (ISO_FIELDS.has(k) && typeof v === 'string' && !isIsoUtc(v)) {
      // diagnostic-only console.warn — allowed
      console.warn(
        `[envelope] field ${k}=${JSON.stringify(v)} not ISO 8601 UTC at ${path}`,
      )
    }
    if (
      DATE_ONLY_FIELDS.has(k) &&
      typeof v === 'string' &&
      !/^\d{4}-\d{2}-\d{2}$/.test(v)
    ) {
      // diagnostic-only console.warn — allowed
      console.warn(
        `[envelope] field ${k}=${JSON.stringify(v)} not YYYY-MM-DD at ${path}`,
      )
    }
    if (typeof v === 'object') validateTimeFields(v, path)
  }
}
