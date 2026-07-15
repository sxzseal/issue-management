/**
 * API token primitives — long-lived bearer credentials for external AI / script
 * clients. The raw token has shape `imt_live_<64 hex chars>` (72 bytes total).
 *
 * Storage model: only the SHA-256 of the raw token is persisted, so a DB dump
 * cannot be replayed against the API. The raw string is surfaced to the user
 * exactly once at creation. Revocation is soft-delete (`revoked_at`) so past
 * `last_used_at` and provenance stay visible in the settings UI.
 */
import type { Env } from '../index'
import { TABLES } from '../db/schema'
import type { ApiTokenRow } from '../db/types'

export const TOKEN_PREFIX = 'imt_live_'
/** Length of the "prefix" column — enough entropy for humans to eyeball, small enough to fit in a table row without wrapping. */
const PREFIX_LEN = 16
const TOKEN_RANDOM_BYTES = 32
/** last_used_at is updated at most once per token per this window (KV TTL). */
const LAST_USED_TOUCH_TTL_SEC = 60
const LAST_USED_KV_PREFIX = 'apitok:touched:'

export interface GeneratedApiToken {
  raw: string
  hash: string
  prefix: string
}

/**
 * `token_hash` column is a lowercase hex SHA-256 of the raw token bytes.
 * SubtleCrypto.digest is the standard Workers primitive; no dependency.
 */
export async function hashToken(raw: string): Promise<string> {
  const bytes = new TextEncoder().encode(raw)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('')
}

export async function generateApiToken(): Promise<GeneratedApiToken> {
  const bytes = new Uint8Array(TOKEN_RANDOM_BYTES)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  const raw = `${TOKEN_PREFIX}${hex}`
  const hash = await hashToken(raw)
  return { raw, hash, prefix: raw.slice(0, PREFIX_LEN) }
}

/**
 * Cheap prefix check — the auth-guard uses this to branch between the JWT path
 * and the API-token path. Cheap enough to inline; still exported for tests.
 */
export function looksLikeApiToken(raw: string): boolean {
  return raw.startsWith(TOKEN_PREFIX)
}

/**
 * Look up a raw token, returning the row on match (and NULL on miss / revoked).
 *
 * Side-effect: throttled `last_used_at` update. Every hit within
 * LAST_USED_TOUCH_TTL_SEC of a prior hit is a KV-only no-op — this keeps the
 * hot-path off D1 for busy tokens without losing the "last seen" signal in
 * the settings UI. The update itself uses `Promise.allSettled` so a transient
 * KV/D1 write failure downgrades to a slightly stale UI on next refresh
 * rather than 500-ing an otherwise valid auth check.
 */
export async function verifyApiToken(
  env: Env,
  raw: string,
): Promise<ApiTokenRow | null> {
  const hash = await hashToken(raw)
  const row = await env.DB.prepare(
    `SELECT id, name, token_hash, prefix, created_at, last_used_at, revoked_at
       FROM ${TABLES.apiTokens}
      WHERE token_hash = ? AND revoked_at IS NULL
      LIMIT 1`,
  )
    .bind(hash)
    .first<ApiTokenRow>()

  if (!row) {
    return null
  }

  const touchedKey = `${LAST_USED_KV_PREFIX}${row.id}`
  const recentlyTouched = await env.KV.get(touchedKey)
  if (recentlyTouched === null) {
    const now = new Date().toISOString()
    // Best-effort: `allSettled` so a partial failure never rejects auth. The
    // KV throttle key + row's `last_used_at` are UI signals only; the token
    // itself is unaffected if either write drops.
    await Promise.allSettled([
      env.DB.prepare(
        `UPDATE ${TABLES.apiTokens} SET last_used_at = ? WHERE id = ?`,
      )
        .bind(now, row.id)
        .run(),
      env.KV.put(touchedKey, '1', { expirationTtl: LAST_USED_TOUCH_TTL_SEC }),
    ])
  }

  return row
}
