/**
 * Fixed-window rate limiter using Cloudflare KV.
 *
 * Semantics: the first hit within a window PUTs `count=1` with
 * `expirationTtl = windowSec`. Subsequent hits read the counter and, if under
 * the limit, PUT `count+1`. TTL is **not** extended on plain increments — the
 * counter naturally expires `windowSec` after the first hit and the next hit
 * starts a fresh window.
 *
 * ⚠️ KV is eventually consistent across regions; concurrent hits at the same
 *    key can race and slightly under- or over-count. For a single-user personal
 *    product this is an acceptable soft ceiling, not a billing primitive.
 */
import type { KVNamespace } from '@cloudflare/workers-types/2023-07-01'

export interface RateLimitResult {
  ok: boolean
  count: number
  limit: number
  remaining: number
  /** Approximate seconds until this key resets. */
  resetSec: number
}

interface RateEntry {
  count: number
  /** Unix seconds when this window began; used to derive resetSec. */
  startedAt: number
  windowSec: number
}

async function readEntry(kv: KVNamespace, key: string): Promise<RateEntry | null> {
  const raw = await kv.get(key)
  if (raw === null) {
    return null
  }
  try {
    const parsed = JSON.parse(raw) as unknown
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as RateEntry).count === 'number' &&
      typeof (parsed as RateEntry).startedAt === 'number' &&
      typeof (parsed as RateEntry).windowSec === 'number'
    ) {
      return parsed as RateEntry
    }
  } catch {
    // Fall through — malformed entry is treated as absent.
  }
  return null
}

/**
 * Increment the counter at `key`. Returns `{ ok: false }` without incrementing
 * once `count >= limit`; the caller should return 42901.
 */
export async function rateLimit(
  kv: KVNamespace,
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000)
  const existing = await readEntry(kv, key)

  if (existing === null) {
    const entry: RateEntry = { count: 1, startedAt: now, windowSec }
    await kv.put(key, JSON.stringify(entry), { expirationTtl: windowSec })
    return { ok: true, count: 1, limit, remaining: limit - 1, resetSec: windowSec }
  }

  const resetSec = Math.max(0, existing.startedAt + existing.windowSec - now)
  if (existing.count >= limit) {
    return { ok: false, count: existing.count, limit, remaining: 0, resetSec }
  }

  const nextCount = existing.count + 1
  const nextEntry: RateEntry = {
    count: nextCount,
    startedAt: existing.startedAt,
    windowSec: existing.windowSec,
  }
  // Preserve the original window by using the remaining TTL (>=1s).
  const remainingTtl = Math.max(1, resetSec)
  await kv.put(key, JSON.stringify(nextEntry), { expirationTtl: remainingTtl })
  return {
    ok: nextCount <= limit,
    count: nextCount,
    limit,
    remaining: Math.max(0, limit - nextCount),
    resetSec,
  }
}

/**
 * Login-failure variant: once the counter reaches `limit`, subsequent calls
 * (and the call that tripped the limit) refresh the TTL to `freezeSec` and
 * pin the count at `limit`. This implements AC-006 — 5 wrong passwords → 15
 * minute freeze that resets its clock on every additional attempt.
 */
export async function rateLimitLoginFailure(
  kv: KVNamespace,
  key: string,
  limit: number,
  freezeSec: number,
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000)
  const existing = await readEntry(kv, key)

  if (existing === null) {
    const entry: RateEntry = { count: 1, startedAt: now, windowSec: freezeSec }
    await kv.put(key, JSON.stringify(entry), { expirationTtl: freezeSec })
    return { ok: true, count: 1, limit, remaining: limit - 1, resetSec: freezeSec }
  }

  if (existing.count >= limit) {
    // Freeze is active — refresh the TTL so the window keeps sliding forward.
    const pinned: RateEntry = { count: limit, startedAt: now, windowSec: freezeSec }
    await kv.put(key, JSON.stringify(pinned), { expirationTtl: freezeSec })
    return { ok: false, count: limit, limit, remaining: 0, resetSec: freezeSec }
  }

  const nextCount = existing.count + 1
  if (nextCount >= limit) {
    const pinned: RateEntry = { count: limit, startedAt: now, windowSec: freezeSec }
    await kv.put(key, JSON.stringify(pinned), { expirationTtl: freezeSec })
    return { ok: false, count: limit, limit, remaining: 0, resetSec: freezeSec }
  }

  const resetSec = Math.max(1, existing.startedAt + existing.windowSec - now)
  const nextEntry: RateEntry = {
    count: nextCount,
    startedAt: existing.startedAt,
    windowSec: existing.windowSec,
  }
  await kv.put(key, JSON.stringify(nextEntry), { expirationTtl: resetSec })
  return {
    ok: true,
    count: nextCount,
    limit,
    remaining: limit - nextCount,
    resetSec,
  }
}
