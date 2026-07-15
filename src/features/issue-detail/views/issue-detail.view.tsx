/**
 * IssueDetailView — /issue/:id route body (T025).
 *
 * Layout:
 *   BreadcrumbActions
 *   ┌────────────── two columns ──────────────┐
 *   │ scroll area (title/meta/body/comments)  │ AttributePanel (hidden lg:block w-80)
 *   │ ─────────── CommentComposer ─────────── │
 *   └─────────────────────────────────────────┘
 *
 * Data:
 *   - `issueDetailQueries.byId(id)` for the top card
 *   - `issueDetailQueries.comments(id)` for the thread
 *
 * States:
 *   - 404 (RequestError statusCode 40401) → <NotFound />
 *   - loading → skeleton
 *   - error → ErrorState
 */
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { Clock, Globe, KeyRound } from 'lucide-react'

import { ErrorState, SkeletonList } from '@/features/_shared/state'
import { Separator } from '@/components/ui/separator'
import { TooltipProvider } from '@/components/ui/tooltip'
import { RequestError } from '@/lib/request'
import { cn } from '@/lib/utils'
import type { IssueDetail } from '@/lib/api-types'

import { issueDetailQueries } from '../queries'
import { relativeTime } from '../lib/relative-time'
import {
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useUpdateIssueMutation,
} from '../mutations'

import { AttributePanel } from './attribute-panel'
import { BodyMarkdown } from './body-markdown'
import { BreadcrumbActions } from './breadcrumb-actions'
import { CommentComposer } from './comment-composer'
import { CommentsList } from './comments-list'
import { InlineEditableTitle } from './inline-editable-title'
import { NotFound } from './not-found'

const NOT_FOUND_STATUS = 40401

function isNotFound(error: unknown): boolean {
  return error instanceof RequestError && error.statusCode === NOT_FOUND_STATUS
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return iso.slice(0, 10)
}

function MetaRow({ issue }: { issue: IssueDetail }) {
  const SourceIcon = issue.source === 'api' ? KeyRound : Globe
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
      <span className="font-mono text-xs">#{issue.id}</span>
      <span aria-hidden>·</span>
      <span>创建于 {formatDate(issue.created_at)}</span>
      <span aria-hidden>·</span>
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3.5 w-3.5" />
        更新 {relativeTime(issue.updated_at)}
      </span>
      <span aria-hidden>·</span>
      <span className="inline-flex items-center gap-1">
        <SourceIcon className="h-3.5 w-3.5" />
        {issue.source === 'api'
          ? issue.source_name
            ? `API Token · ${issue.source_name}`
            : 'API Token'
          : '手动'}
      </span>
      {issue.external_ref ? (
        <>
          <span aria-hidden>·</span>
          <span className="truncate font-mono text-xs">{issue.external_ref}</span>
        </>
      ) : null}
    </div>
  )
}

export function IssueDetailView() {
  const { id } = useParams<{ id: string }>()
  const issueId = id ?? ''

  const detail = useQuery({
    ...issueDetailQueries.byId(issueId),
    enabled: issueId.length > 0,
    retry: (failureCount, error) => {
      if (isNotFound(error)) return false
      return failureCount < 2
    },
  })

  const comments = useQuery({
    ...issueDetailQueries.comments(issueId),
    enabled: issueId.length > 0 && detail.isSuccess,
  })

  const updateIssue = useUpdateIssueMutation()
  const createComment = useCreateCommentMutation()
  const deleteComment = useDeleteCommentMutation()

  // 404 short-circuit — render standalone; no breadcrumb needs the loaded issue.
  if (detail.isError && isNotFound(detail.error)) {
    return <NotFound issueId={issueId || undefined} />
  }

  if (detail.isPending) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex h-12 flex-none items-center gap-2 border-b border-border bg-card/40 px-4" />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
            <SkeletonList rows={8} className="flex-1 min-h-0 overflow-y-auto p-6" />
          </div>
          <aside
            className={cn(
              'hidden lg:flex w-80 flex-none flex-col overflow-y-auto',
              'border-l border-border bg-card/30 p-4',
            )}
          >
            <SkeletonList rows={4} />
          </aside>
        </div>
      </div>
    )
  }

  if (detail.isError) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <ErrorState onRetry={() => void detail.refetch()} />
      </div>
    )
  }

  const issue = detail.data

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full min-h-0 overflow-hidden">
        <BreadcrumbActions issue={issue} />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6 space-y-6">
              <div>
                <InlineEditableTitle
                  value={issue.title}
                  onSave={(title) =>
                    updateIssue
                      .mutateAsync({ id: issue.id, body: { title } })
                      .then(() => undefined)
                  }
                />
                <MetaRow issue={issue} />
              </div>
              <BodyMarkdown>{issue.body_full}</BodyMarkdown>
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-sm font-semibold">
                    评论 · {comments.data?.total ?? 0}
                  </h2>
                  <Separator className="flex-1" />
                </div>
                {comments.isPending ? (
                  <SkeletonList rows={2} />
                ) : comments.isError ? (
                  <ErrorState onRetry={() => void comments.refetch()} />
                ) : (
                  <CommentsList
                    issueId={issue.id}
                    comments={comments.data?.list ?? []}
                    onDelete={(commentId) =>
                      deleteComment.mutate({ issueId: issue.id, commentId })
                    }
                  />
                )}
              </section>
            </div>
            <CommentComposer
              issueId={issue.id}
              onSubmit={(body) =>
                createComment
                  .mutateAsync({ issueId: issue.id, body: { body } })
                  .then(() => undefined)
              }
            />
          </div>
          <aside
            className={cn(
              'hidden lg:flex w-80 flex-none flex-col overflow-y-auto',
              'border-l border-border bg-card/30 p-4',
            )}
          >
            <AttributePanel issue={issue} />
          </aside>
        </div>
      </div>
    </TooltipProvider>
  )
}
