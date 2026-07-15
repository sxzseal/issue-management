import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { request } from '@/lib/request'
import type { IssueDetail, Comment, Label } from '@/lib/api-types'
import type { UpdateIssueBody } from '@/lib/validators/issue'
import type { CreateCommentBody } from '@/lib/validators/comment'
import type { CommentsData } from './types'

/**
 * PATCH /api/issues/:id — inline attribute edit (title / status / priority / project / labels / due_date).
 * Optimistic: patches the detail cache before the request resolves. Rolls back + toasts on error.
 * Also invalidates board + list caches since attrs affect them.
 */
export function useUpdateIssueMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { id: string; body: UpdateIssueBody }) =>
      request<IssueDetail>(`/api/issues/${payload.id}`, {
        method: 'PATCH',
        body: payload.body,
      }),
    onMutate: async ({ id, body }) => {
      await qc.cancelQueries({ queryKey: ['issue-detail', id] })
      const prev = qc.getQueryData<IssueDetail>(['issue-detail', id])
      if (prev) {
        // Resolve label_ids against the labels list cache so `issue.labels`
        // reflects the pending state — otherwise rapid toggles read stale
        // labels and race last-write-wins on the server.
        const { label_ids, ...scalarPatch } = body
        let nextLabels = prev.labels
        if (label_ids !== undefined) {
          const cached = qc.getQueryData<Label[]>(['labels', 'list']) ?? []
          const byId = new Map(cached.map((l) => [l.id, l]))
          nextLabels = label_ids
            .map(
              (lid) => byId.get(lid) ?? prev.labels.find((l) => l.id === lid),
            )
            .filter((l): l is Label => l !== undefined)
        }
        qc.setQueryData<IssueDetail>(['issue-detail', id], {
          ...prev,
          ...scalarPatch,
          labels: nextLabels,
          updated_at: new Date().toISOString(),
        })
      }
      return { prev }
    },
    onError: (_e, { id }, ctx) => {
      if (ctx?.prev) qc.setQueryData(['issue-detail', id], ctx.prev)
      toast.error('更新失败，已回滚')
    },
    onSuccess: (issue) => {
      qc.setQueryData(['issue-detail', issue.id], issue)
    },
    onSettled: (_data, _e, { id, body }) => {
      void qc.invalidateQueries({ queryKey: ['issue-detail', id] })
      // Scope broader invalidations to fields that actually affect those caches
      // so a rapid label-only edit doesn't refetch every list/board query.
      const affectsBoard =
        body.status !== undefined ||
        body.priority !== undefined ||
        body.project_id !== undefined
      const affectsList =
        affectsBoard ||
        body.title !== undefined ||
        body.due_date !== undefined ||
        body.label_ids !== undefined
      if (affectsBoard) {
        void qc.invalidateQueries({ queryKey: ['board'] })
      }
      if (affectsList) {
        void qc.invalidateQueries({ queryKey: ['issue-list'] })
      }
    },
  })
}

/** DELETE issue — used from Detail's ActionBar (AC-059 double-confirm handled at UI layer). */
export function useDeleteIssueMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      request<null>(`/api/issues/${id}`, { method: 'DELETE' }),
    onSuccess: (_r, id) => {
      qc.removeQueries({ queryKey: ['issue-detail', id] })
      void qc.invalidateQueries({ queryKey: ['issue-list'] })
      void qc.invalidateQueries({ queryKey: ['board'] })
      toast.success('已删除 issue')
    },
    onError: () => toast.error('删除失败'),
  })
}

/**
 * POST comment (AC-056):
 * - optimistic append with a temp id + `created_at: nowIso`
 * - on success replace temp with server row (via invalidate)
 * - on failure remove the optimistic row + toast (input preserved by UI layer)
 */
export function useCreateCommentMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { issueId: string; body: CreateCommentBody }) =>
      request<Comment>(`/api/issues/${payload.issueId}/comments`, {
        method: 'POST',
        body: payload.body,
      }),
    onMutate: async ({ issueId, body }) => {
      await qc.cancelQueries({
        queryKey: ['issue-detail', issueId, 'comments'],
      })
      const tempId = `tmp_${Math.random().toString(36).slice(2, 10)}`
      const now = new Date().toISOString()
      const optimistic: Comment = {
        id: tempId,
        issue_id: issueId,
        body: body.body,
        created_at: now,
      }
      const snapshots = qc.getQueriesData<CommentsData>({
        queryKey: ['issue-detail', issueId, 'comments'],
      })
      snapshots.forEach(([key, prev]) => {
        if (!prev) return
        qc.setQueryData<CommentsData>(key, {
          ...prev,
          total: prev.total + 1,
          // Append: newest at bottom in DESC/first-page ordering per AC-055
          // "最新靠近输入框" — composer at bottom (AC-052), so newest sits at end of list.
          list: [...prev.list, optimistic],
        })
      })
      return { snapshots, tempId }
    },
    onError: (_e, { issueId }, ctx) => {
      if (!ctx) return
      const snaps = qc.getQueriesData<CommentsData>({
        queryKey: ['issue-detail', issueId, 'comments'],
      })
      snaps.forEach(([key, prev]) => {
        if (!prev) return
        qc.setQueryData<CommentsData>(key, {
          ...prev,
          list: prev.list.filter((c) => c.id !== ctx.tempId),
          total: Math.max(0, prev.total - 1),
        })
      })
      toast.error('评论发布失败，请重试')
    },
    onSettled: (_r, _e, { issueId }) => {
      void qc.invalidateQueries({
        queryKey: ['issue-detail', issueId, 'comments'],
      })
      // updated_at bumps on the parent issue
      void qc.invalidateQueries({ queryKey: ['issue-detail', issueId] })
    },
  })
}

/** DELETE comment. */
export function useDeleteCommentMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { issueId: string; commentId: string }) =>
      request<null>(`/api/comments/${payload.commentId}`, { method: 'DELETE' }),
    onSuccess: (_r, { issueId }) => {
      void qc.invalidateQueries({
        queryKey: ['issue-detail', issueId, 'comments'],
      })
      toast.success('评论已删除')
    },
    onError: () => toast.error('删除评论失败'),
  })
}
