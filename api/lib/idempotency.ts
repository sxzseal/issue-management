/**
 * Event-id based idempotency dedup for inbound webhooks.
 *
 * Backed by Cloudflare KV. The route handler (T012) will:
 *   1. Read the record for `(source, eventId)`.
 *   2. If a record exists, replay the prior `httpStatus` without re-running
 *      side-effects — this is how `deduped: true` responses in
 *      `.loop/api-contracts.json` are produced.
 *   3. Otherwise, process the payload and write a new record with
 *      `WEBHOOK_IDEMPOTENCY_TTL_SEC` seconds of retention.
 *
 * See `.loop/acceptance-checklist.md` AC-141.
 */
import type { KVNamespace } from '@cloudflare/workers-types/2023-07-01'

export const WEBHOOK_IDEMPOTENCY_PREFIX = 'webhook:idem:' as const
export const WEBHOOK_IDEMPOTENCY_TTL_SEC: 604800 = 604800 // 60 * 60 * 24 * 7 — 7 days

export interface IdempotencyRecord {
  eventId: string
  source: string
  /** ISO 8601 UTC timestamp — caller-supplied, never defaulted here. */
  storedAt: string
  outcome: 'success' | 'error'
  /** The created / updated issue id — success only. */
  issueId?: string
  httpStatus: number
}

function idempotencyKey(source: string, eventId: string): string {
  return `${WEBHOOK_IDEMPOTENCY_PREFIX}${source}:${eventId}`
}

/**
 * Parse-guard for a stored record. Returns null for anything that does not
 * conform to `IdempotencyRecord` so corrupt / legacy entries are treated as
 * fresh rather than crashing the route.
 */
function parseRecord(raw: unknown): IdempotencyRecord | null {
  if (raw === null || typeof raw !== 'object') {
    return null
  }
  const rec = raw as Record<string, unknown>
  if (
    typeof rec.eventId !== 'string' ||
    typeof rec.source !== 'string' ||
    typeof rec.storedAt !== 'string' ||
    typeof rec.httpStatus !== 'number'
  ) {
    return null
  }
  if (rec.outcome !== 'success' && rec.outcome !== 'error') {
    return null
  }
  if (rec.issueId !== undefined && typeof rec.issueId !== 'string') {
    return null
  }
  const record: IdempotencyRecord = {
    eventId: rec.eventId,
    source: rec.source,
    storedAt: rec.storedAt,
    outcome: rec.outcome,
    httpStatus: rec.httpStatus,
  }
  if (typeof rec.issueId === 'string') {
    record.issueId = rec.issueId
  }
  return record
}

/**
 * Look up whether we've already processed this `(source, eventId)` pair.
 *
 * Returns `null` if never seen (fresh) or the record is corrupt; otherwise
 * the previous record so the route can replay the same HTTP status without
 * re-executing side-effects.
 */
export async function readIdempotencyRecord(
  kv: KVNamespace,
  source: string,
  eventId: string,
): Promise<IdempotencyRecord | null> {
  const raw = await kv.get(idempotencyKey(source, eventId), 'json')
  return parseRecord(raw)
}

/**
 * Persist the outcome of processing a webhook event.
 *
 * TTL is fixed at `WEBHOOK_IDEMPOTENCY_TTL_SEC`. Callers supply
 * `record.storedAt` so tests and route code stay in control of the clock.
 */
export async function writeIdempotencyRecord(
  kv: KVNamespace,
  record: IdempotencyRecord,
): Promise<void> {
  await kv.put(
    idempotencyKey(record.source, record.eventId),
    JSON.stringify(record),
    { expirationTtl: WEBHOOK_IDEMPOTENCY_TTL_SEC },
  )
}
