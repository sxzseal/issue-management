/**
 * Attachments R2 helper.
 *
 * Attachments live in R2 under `issues/<issue_id>/attachments/<attachment_id>`;
 * the D1 `attachments` table holds the metadata (filename, mime, size).
 *
 * Callers should always go through this module for key derivation and the
 * per-issue sweep on issue delete — the raw prefix is not repeated in route
 * code so the layout can change in one place.
 */
import type { R2Bucket } from '@cloudflare/workers-types/2023-07-01'

/** Single-file upload ceiling. Matches the frontend validator constant. */
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024

/**
 * MIME types safe to serve `Content-Disposition: inline` from a same-origin
 * endpoint. Anything else gets forced to `attachment` + `application/octet-stream`
 * so the browser downloads rather than renders — closes the stored-XSS surface
 * where a client uploads `text/html` and shares the `/api/attachments/…` link.
 *
 * SVG is intentionally excluded: it can contain `<script>` and is rendered
 * inline by browsers, so serving it with `inline` disposition is unsafe.
 */
const SAFE_INLINE_IMAGE_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
])

/** Length ceiling for the mime string stored in D1 (matches the CHECK). */
export const MAX_MIME_LENGTH = 255

/**
 * Normalize a client-supplied mime for storage. Empty / oversized / obviously
 * text-like values are collapsed to `application/octet-stream` so the download
 * path can trust what it reads.
 */
export function sanitizeStoredMime(raw: string | undefined | null): string {
  if (!raw) return 'application/octet-stream'
  const trimmed = raw.trim().toLowerCase()
  if (trimmed.length === 0 || trimmed.length > MAX_MIME_LENGTH) {
    return 'application/octet-stream'
  }
  // Basic shape: `type/subtype` — reject anything else.
  if (!/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(trimmed)) {
    return 'application/octet-stream'
  }
  return trimmed
}

/**
 * Compute the response headers for a download. Non-image / non-safe mimes are
 * demoted to octet-stream + `attachment` so browsers download rather than
 * render — this is the last line of defense against stored-XSS via HTML/SVG
 * upload.
 */
export function safeAttachmentHeaders(
  mime: string,
  filename: string,
  sizeBytes: number,
): Record<string, string> {
  const safeMime = sanitizeStoredMime(mime)
  const inlineOk = SAFE_INLINE_IMAGE_MIMES.has(safeMime)
  const disposition = inlineOk ? 'inline' : 'attachment'
  const outMime = inlineOk ? safeMime : 'application/octet-stream'
  return {
    'Content-Type': outMime,
    'Content-Length': String(sizeBytes),
    'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(filename)}`,
    'Cache-Control': 'private, max-age=3600',
    // Extra hardening: block MIME sniffing on downloaded content and prevent
    // Adobe Flash / PDF plugins from making cross-origin requests.
    'X-Content-Type-Options': 'nosniff',
  }
}

export function attachmentR2Key(issueId: string, attachmentId: string): string {
  return `issues/${issueId}/attachments/${attachmentId}`
}

export function attachmentPrefixForIssue(issueId: string): string {
  return `issues/${issueId}/attachments/`
}

/**
 * Canonical id shape — matches the `cmt_` / `at_` scheme used elsewhere but
 * with full 128-bit entropy (32 hex chars) so IDs are not enumerable even
 * without an ownership check on GET / DELETE. Format: `at_<32 lowercase hex>`.
 */
export function generateAttachmentId(): string {
  return 'at_' + crypto.randomUUID().replace(/-/g, '')
}

/** Validate the attachment id path parameter. */
export function isValidAttachmentId(id: string): boolean {
  return /^at_[a-f0-9]{32}$/.test(id)
}

/** Relative URL served by the Worker. */
export function attachmentUrl(id: string): string {
  return `/api/attachments/${id}`
}

/**
 * Delete every attachment blob under one issue. Best-effort — a partial
 * failure logs but does not throw, matching the R2-body sweep behavior in
 * `issues.ts` (D1 rows are already gone via FK CASCADE by the time this
 * runs, so anything left behind is R2 garbage, not an orphaned pointer).
 *
 * Uses R2's batch delete (`r2.delete(keys[])`) so a single sweep costs one
 * subrequest per page (up to 1000 keys) — critical for the Workers subrequest
 * budget when an issue has many attachments.
 */
export async function sweepIssueAttachments(
  r2: R2Bucket,
  issueId: string,
): Promise<{ deleted: number; failed: number }> {
  const prefix = attachmentPrefixForIssue(issueId)
  let cursor: string | undefined
  let deleted = 0
  let failed = 0
  do {
    const listed = await r2.list({ prefix, cursor, limit: 1000 })
    if (listed.objects.length > 0) {
      const keys = listed.objects.map((o) => o.key)
      try {
        await r2.delete(keys)
        deleted += keys.length
      } catch (e) {
        console.warn('[sweepIssueAttachments] batch delete failed:', e)
        failed += keys.length
      }
    }
    cursor = listed.truncated ? listed.cursor : undefined
  } while (cursor)
  return { deleted, failed }
}
