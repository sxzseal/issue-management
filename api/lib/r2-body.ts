/**
 * Issue body R2 overflow helper.
 *
 * D1 rows can hold arbitrarily long TEXT, but keeping large Markdown bodies
 * inline bloats every list/detail query. We therefore push bodies larger than
 * {@link R2_BODY_INLINE_THRESHOLD_BYTES} (UTF-8 byte length) into R2 under
 * `issues/<id>/body` and leave the D1 `body` column NULL, storing only the
 * R2 key in `body_r2_key`.
 *
 * Threshold rationale: 4 KiB matches the typical SQLite page size and keeps
 * the inline preview well below the D1 row-size soft limit. The exact value
 * is an implementation detail — callers should always go through this module
 * (`shouldOverflow` / `readBodyFromR2` / `writeBodyToR2` / `deleteBodyFromR2`).
 */
import type { R2Bucket } from '@cloudflare/workers-types/2023-07-01'

export const R2_BODY_INLINE_THRESHOLD_BYTES = 4096 as const

/** Canonical R2 key for the (single) body object belonging to an issue. */
export function issueBodyKey(issueId: string): string {
  return `issues/${issueId}/body`
}

/** Return true if the body should be persisted to R2 (based on UTF-8 byte length). */
export function shouldOverflow(body: string): boolean {
  return (
    new TextEncoder().encode(body).byteLength > R2_BODY_INLINE_THRESHOLD_BYTES
  )
}

/** Read full body content from R2. Returns null if the object does not exist. */
export async function readBodyFromR2(
  r2: R2Bucket,
  key: string,
): Promise<string | null> {
  const obj = await r2.get(key)
  if (obj === null) {
    return null
  }
  return await obj.text()
}

/** Overwrite (or create) an R2 body object. Returns the key written. */
export async function writeBodyToR2(
  r2: R2Bucket,
  key: string,
  body: string,
): Promise<string> {
  await r2.put(key, body, {
    httpMetadata: { contentType: 'text/markdown' },
  })
  return key
}

/** Best-effort delete; ignores 404 / errors — R2 delete is idempotent anyway. */
export async function deleteBodyFromR2(
  r2: R2Bucket,
  key: string,
): Promise<void> {
  try {
    await r2.delete(key)
  } catch {
    // Swallow: object may not exist, or the network hiccuped — nothing to do.
  }
}
