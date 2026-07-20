/**
 * usePasteDropUpload — wire paste + drag/drop file upload onto a <textarea>.
 *
 * On file(s) detected we:
 *   1. Insert a placeholder token at the cursor: `![Uploading foo.png…]()`
 *   2. Upload each file sequentially via the caller-supplied mutation
 *   3. On success replace the placeholder with `![filename](url)` for images
 *      or `[filename](url)` for anything else
 *   4. On failure remove the placeholder and toast (mutation surfaces its own)
 *
 * The hook is textarea-driven — it takes a ref to the element and the current
 * value + setter, mirroring how <Textarea>-with-controlled-state gets used
 * across the app. No global state, no upload queue: multi-file dropped in
 * one gesture is uploaded one after another so the mutation's own toast /
 * error surface handles each independently.
 */
import { useCallback, useRef, type RefObject } from 'react'
import { toast } from 'sonner'
import type { Attachment } from '@/lib/api-types'
import { MAX_ATTACHMENT_BYTES, formatBytes } from '@/lib/validators/attachment'

export interface PasteDropUploadOptions {
  issueId: string
  textareaRef: RefObject<HTMLTextAreaElement | null>
  value: string
  onChange: (next: string) => void
  /** Caller-supplied uploader — usually `useUploadAttachmentMutation().mutateAsync`. */
  upload: (payload: { issueId: string; file: File }) => Promise<Attachment>
}

function markdownFor(a: Attachment): string {
  const isImage = a.mime.startsWith('image/')
  // Strip characters that would break the surrounding `[label](url)` — `[`, `]`
  // close the label, `(`, `)` close the URL, so any of them in a filename
  // corrupts the link when the markdown renderer parses it.
  const safeName = a.filename.replace(/[[\]()]/g, '')
  // Wrap the URL in angle brackets so any remaining special characters in the
  // path stay inside the link.
  return isImage ? `![${safeName}](<${a.url}>)` : `[${safeName}](<${a.url}>)`
}

function placeholderFor(id: string, filename: string): string {
  const safe = filename.replace(/[[\]()]/g, '')
  // Zero-width IDs keep the placeholder text visually clean while remaining
  // unique enough to replace deterministically.
  return `![Uploading ${safe}… ${id}]()`
}

export function usePasteDropUpload(options: PasteDropUploadOptions) {
  const { issueId, textareaRef, value, onChange, upload } = options
  // Track the latest value across async replaces (the hook's `value` prop is
  // stale inside the async chain; ref keeps our sequential edits consistent).
  const valueRef = useRef(value)
  valueRef.current = value

  // Per-hook counter for placeholder IDs — kept local (not module-scoped) so
  // remounts don't inherit sibling counters and tests get a fresh sequence.
  const seqRef = useRef(0)

  const insertAtCursor = useCallback(
    (text: string) => {
      const el = textareaRef.current
      const current = valueRef.current
      if (!el) {
        const next = current + text
        valueRef.current = next
        onChange(next)
        return { start: next.length, end: next.length }
      }
      const start = el.selectionStart ?? current.length
      const end = el.selectionEnd ?? current.length
      const next = current.slice(0, start) + text + current.slice(end)
      valueRef.current = next
      onChange(next)
      // Move cursor to the end of the inserted text on the next tick so React
      // has committed the value update.
      queueMicrotask(() => {
        const node = textareaRef.current
        if (!node) return
        const pos = start + text.length
        node.focus()
        node.setSelectionRange(pos, pos)
      })
      return { start, end: start + text.length }
    },
    [textareaRef, onChange],
  )

  const replaceToken = useCallback(
    (token: string, replacement: string) => {
      const current = valueRef.current
      const idx = current.indexOf(token)
      if (idx < 0) return
      const next =
        current.slice(0, idx) + replacement + current.slice(idx + token.length)
      valueRef.current = next
      onChange(next)
    },
    [onChange],
  )

  const uploadOne = useCallback(
    async (file: File) => {
      seqRef.current += 1
      const placeholderId = `up${seqRef.current}`
      const placeholder = placeholderFor(placeholderId, file.name)
      insertAtCursor(placeholder)
      try {
        const attachment = await upload({ issueId, file })
        replaceToken(placeholder, markdownFor(attachment))
      } catch {
        // Mutation toasts; just drop the placeholder.
        replaceToken(placeholder, '')
      }
    },
    [insertAtCursor, replaceToken, upload, issueId],
  )

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files)
      // Client-side size gate — bounce oversize files with one aggregated toast
      // instead of letting each hit the server and toast individually.
      const oversized = list.filter((f) => f.size > MAX_ATTACHMENT_BYTES)
      const accepted = list.filter((f) => f.size <= MAX_ATTACHMENT_BYTES)
      if (oversized.length > 0) {
        const cap = formatBytes(MAX_ATTACHMENT_BYTES)
        if (oversized.length === 1) {
          toast.error(`${oversized[0]!.name} 超过 ${cap}，已跳过`)
        } else {
          toast.error(`${oversized.length} 个文件超过 ${cap}，已跳过`)
        }
      }
      for (const f of accepted) {
        await uploadOne(f)
      }
    },
    [uploadOne],
  )

  const onPaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.files
      if (!items || items.length === 0) return
      e.preventDefault()
      void handleFiles(items)
    },
    [handleFiles],
  )

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLTextAreaElement>) => {
      if (!e.dataTransfer?.files || e.dataTransfer.files.length === 0) return
      e.preventDefault()
      void handleFiles(e.dataTransfer.files)
    },
    [handleFiles],
  )

  const onDragOver = useCallback((e: React.DragEvent<HTMLTextAreaElement>) => {
    if (e.dataTransfer?.types.includes('Files')) {
      e.preventDefault()
    }
  }, [])

  return { onPaste, onDrop, onDragOver, handleFiles }
}
