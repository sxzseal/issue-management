import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

const COPY_FEEDBACK_MS = 1400

/**
 * Copy a string to the clipboard with the standard "已复制" success / "复制失败"
 * error toasts and a short `copied` flag callers can render as a
 * checkmark/label swap. Consolidates the 4 near-identical hand-rolled copies
 * this codebase used to have.
 *
 * `copied` auto-resets after `COPY_FEEDBACK_MS`; the timeout is cleaned up on
 * unmount so late setState warnings don't fire.
 */
export function useCopyToClipboard(): {
  copied: boolean
  copy: (text: string, successMessage?: string) => Promise<void>
} {
  const [copied, setCopied] = useState<boolean>(false)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const copy = useCallback(async (text: string, successMessage = '已复制到剪贴板') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success(successMessage)
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = window.setTimeout(() => {
        setCopied(false)
        timeoutRef.current = null
      }, COPY_FEEDBACK_MS)
    } catch {
      toast.error('复制失败，请手动选中')
    }
  }, [])

  return { copied, copy }
}
