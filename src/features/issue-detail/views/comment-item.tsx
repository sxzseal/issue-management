/**
 * CommentItem — single comment row (AC-055 / AC-307).
 *
 * v1 has a single-user context, so every comment is authored by "me": we
 * mark it with a primary-tinted border, self avatar, and a 「作者」badge.
 * Optimistic (temp id) comments render at reduced opacity and hide the
 * delete affordance until the server confirms.
 */
import { MoreHorizontal, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Comment } from '@/lib/api-types'
import { relativeTime } from '../lib/relative-time'

interface CommentItemProps {
  comment: Comment
  isSelf?: boolean
  onDelete?: (id: string) => void
}

export function CommentItem({
  comment,
  isSelf = true,
  onDelete,
}: CommentItemProps) {
  const isOptimistic = comment.id.startsWith('tmp_')

  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-md p-3',
        isSelf
          ? 'border-l-4 border-l-primary/60 bg-primary/[0.03] dark:bg-primary/[0.06]'
          : 'bg-muted/30',
        isOptimistic && 'opacity-70',
      )}
    >
      <div
        aria-hidden
        className={cn(
          'grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-medium',
          isSelf
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground',
        )}
      >
        {isSelf ? '我' : '?'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">me</span>
          {isSelf ? (
            <Badge
              variant="secondary"
              className="h-4 px-1.5 text-[10px] font-normal text-muted-foreground"
            >
              作者
            </Badge>
          ) : null}
          <span className="text-muted-foreground" aria-hidden>
            ·
          </span>
          <span
            className="text-xs text-muted-foreground"
            title={comment.created_at.replace('T', ' ').slice(0, 16)}
          >
            {relativeTime(comment.created_at)}
          </span>
          {!isOptimistic && onDelete ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="删除"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => onDelete(comment.id)}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {comment.body}
        </p>
      </div>
    </div>
  )
}
