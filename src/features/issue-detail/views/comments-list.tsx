/**
 * CommentsList — list of comment rows (AC-055).
 *
 * Layout is a flex column; each item is a CommentItem. Comments arrive in
 * `created_at ASC` order (newest closest to the composer at the bottom).
 */
import type { Comment } from '@/lib/api-types'
import { CommentItem } from './comment-item'

interface CommentsListProps {
  issueId: string
  comments: Comment[]
  onDelete: (commentId: string) => void
}

export function CommentsList({ comments, onDelete }: CommentsListProps) {
  if (comments.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">还没有评论</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          isSelf
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
