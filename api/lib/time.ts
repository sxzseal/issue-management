/**
 * Time helpers — ISO 8601 UTC normalization + validation.
 *
 * All persisted timestamps in this project are strings in `YYYY-MM-DDTHH:MM:SSZ`
 * (or with millisecond fraction `.sss`). See AC-153.
 */

/** Current UTC ISO 8601 timestamp — YYYY-MM-DDTHH:MM:SSZ. */
export function nowIso(): string {
  return new Date().toISOString()
}

/** Convert any Date-compatible value to ISO 8601 UTC. Throws on invalid input. */
export function toIsoUtc(value: string | number | Date): string {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) throw new TimeError('invalid')
  return d.toISOString()
}

/** Validate an ISO 8601 UTC string ('YYYY-MM-DDTHH:MM:SS[.sss]Z'). */
export function isIsoUtc(value: unknown): value is string {
  if (typeof value !== 'string') return false
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(value)) return false
  const d = new Date(value)
  return !Number.isNaN(d.getTime())
}

export class TimeError extends Error {
  constructor(public readonly reason: 'invalid') {
    super(`time: ${reason}`)
    this.name = 'TimeError'
  }
}
