/**
 * BodyMarkdown — render an issue body_full or comment body as GFM markdown.
 *
 * AC-054 / AC-307: prose typography, whitespace preserved via wrapper spacing.
 */
import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

interface BodyMarkdownProps {
  children: string
  className?: string
  /** When true, hide the placeholder for empty content (used inside comment preview). */
  hideEmptyPlaceholder?: boolean
}

function BodyMarkdownImpl({ children, className, hideEmptyPlaceholder }: BodyMarkdownProps) {
  const text = children ?? ''
  if (!text.trim()) {
    if (hideEmptyPlaceholder) {
      return (
        <p className={cn('text-sm italic text-muted-foreground', className)}>
          还没有内容可预览
        </p>
      )
    }
    return (
      <p className={cn('text-sm italic text-muted-foreground', className)}>无描述</p>
    )
  }

  return (
    <article
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none',
        '[&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold',
        '[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold',
        '[&_p]:my-3 [&_p]:leading-relaxed',
        '[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6',
        '[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6',
        '[&_li]:my-1 [&_li]:leading-relaxed',
        '[&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:bg-muted/30 [&_blockquote]:px-4 [&_blockquote]:py-2 [&_blockquote]:text-muted-foreground',
        '[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm',
        '[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-1.5',
        '[&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-1.5 [&_th]:bg-muted/40',
        '[&_code]:rounded [&_code]:bg-muted/60 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs',
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </article>
  )
}

// Memoize so unrelated re-renders of the parent (attribute edits, mutations)
// don't re-parse a potentially 30KB+ issue body on every render.
export const BodyMarkdown = memo(BodyMarkdownImpl)
