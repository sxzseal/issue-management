/**
 * Attachment validators + shared constants.
 *
 * The upload byte cap is duplicated in `api/lib/attachments.ts` (Worker
 * runtime cannot import from `src/lib/*` cleanly here — the Worker tsconfig
 * paths differ from Vite's — so we keep the number in sync manually).
 */
import { z } from 'zod'

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Attachment id — `at_` + 32 lowercase hex chars (128-bit entropy).
 * Kept in sync with `generateAttachmentId` / `isValidAttachmentId` on the
 * Worker side.
 */
export const attachmentIdSchema = z
  .string()
  .regex(/^at_[a-f0-9]{32}$/, '附件 id 非法')

export type AttachmentIdSchema = z.infer<typeof attachmentIdSchema>
