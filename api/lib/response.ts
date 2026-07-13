/**
 * Worker-side response envelope helpers.
 *
 * Every `/api/*` endpoint MUST return one of the envelopes below:
 *   success: { status_code: 0, data: T, message? }
 *   error:   { status_code: <non-zero>, data: null, message }
 *
 * See PRD 7.1 for the canonical business error codes (40001/40101/40301/40302/
 * 40401/40901/40902/42201/42901/50001).
 */
import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export interface ApiSuccess<T> {
  status_code: 0
  data: T
  message?: string
}

export interface ApiFailure {
  status_code: number
  data: null
  message: string
}

/**
 * Derive the HTTP status from a business status code by taking the leading
 * three digits (e.g. 40101 -> 401, 42901 -> 429, 50001 -> 500). Falls back
 * to 500 for out-of-range values.
 */
function deriveHttpStatus(statusCode: number): ContentfulStatusCode {
  if (!Number.isFinite(statusCode) || statusCode <= 0) {
    return 500
  }
  const head = Math.floor(statusCode / 100)
  if (head >= 100 && head <= 599) {
    return head as ContentfulStatusCode
  }
  return 500
}

/**
 * Success envelope. HTTP status defaults to 200; pass 201 for POST-created
 * resources or any other 2xx code as needed.
 */
export function ok<T>(
  c: Context,
  data: T,
  opts?: { httpStatus?: ContentfulStatusCode; message?: string },
): Response {
  const body: ApiSuccess<T> = opts?.message
    ? { status_code: 0, data, message: opts.message }
    : { status_code: 0, data }
  return c.json(body, opts?.httpStatus ?? 200)
}

/**
 * Error envelope. `statusCode` is the business code (e.g. 40101). `httpStatus`
 * defaults to the leading three digits of `statusCode` when not provided.
 */
export function err(
  c: Context,
  statusCode: number,
  message: string,
  httpStatus?: ContentfulStatusCode,
): Response {
  const body: ApiFailure = { status_code: statusCode, data: null, message }
  return c.json(body, httpStatus ?? deriveHttpStatus(statusCode))
}

/**
 * Standard 204 No Content — used by DELETE endpoints. Returns an empty body.
 */
export function noContent(c: Context): Response {
  return c.body(null, 204)
}
