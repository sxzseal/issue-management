/**
 * AuthedImg — render an `<img>` whose src requires a Bearer token.
 *
 * Attachment URLs (`/api/attachments/<id>`) are behind authGuard; the browser
 * won't send Authorization on a plain `<img src>`. So for those URLs we fetch
 * the blob ourselves and turn it into an `URL.createObjectURL` src. External
 * URLs (http[s]://…) render as a bare `<img>` — they don't need our token.
 *
 * Used by BodyMarkdown via ReactMarkdown's `components.img` override.
 */
import { useEffect, useState } from 'react'
import { ImageOff, ImageIcon } from 'lucide-react'
import { readAuthToken } from '@/features/auth/auth-store'
import { cn } from '@/lib/utils'

interface AuthedImgProps {
  src: string
  alt?: string
  title?: string
  className?: string
}

const ATTACHMENT_PREFIX = '/api/attachments/'

export function AuthedImg({ src, alt, title, className }: AuthedImgProps) {
  const needsAuth = src.startsWith(ATTACHMENT_PREFIX)
  const [state, setState] = useState<
    | { kind: 'loading' }
    | { kind: 'ready'; objectUrl: string }
    | { kind: 'error' }
  >(needsAuth ? { kind: 'loading' } : { kind: 'ready', objectUrl: src })

  useEffect(() => {
    if (!needsAuth) {
      setState({ kind: 'ready', objectUrl: src })
      return
    }
    let cancelled = false
    let createdUrl: string | null = null
    const controller = new AbortController()
    setState({ kind: 'loading' })
    ;(async () => {
      try {
        const token = readAuthToken()
        const res = await fetch(src, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const blob = await res.blob()
        if (cancelled) return
        createdUrl = URL.createObjectURL(blob)
        setState({ kind: 'ready', objectUrl: createdUrl })
      } catch (e) {
        if (cancelled || (e instanceof Error && e.name === 'AbortError')) return
        setState({ kind: 'error' })
      }
    })()
    return () => {
      cancelled = true
      controller.abort()
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [src, needsAuth])

  if (state.kind === 'loading') {
    return (
      <span
        className={cn(
          'my-2 inline-flex h-24 w-40 items-center justify-center rounded-md border border-dashed border-border bg-muted/40 text-muted-foreground',
          className,
        )}
        aria-label={alt ?? '图片加载中'}
        title={title}
      >
        <ImageIcon className="h-5 w-5 animate-pulse" />
      </span>
    )
  }
  if (state.kind === 'error') {
    return (
      <span
        className={cn(
          'my-2 inline-flex h-24 w-40 items-center justify-center gap-1 rounded-md border border-dashed border-destructive/40 bg-destructive/5 text-xs text-destructive',
          className,
        )}
        aria-label={alt ?? '图片加载失败'}
        title={title}
      >
        <ImageOff className="h-4 w-4" />
        加载失败
      </span>
    )
  }
  return (
    <img
      src={state.objectUrl}
      alt={alt ?? ''}
      title={title}
      className={cn('inline-block max-w-full rounded-md', className)}
      loading="lazy"
    />
  )
}
