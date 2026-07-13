import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'
import { request } from '@/lib/request'
import type { Issue, IssueStatus } from '@/lib/api-types'
import type { CreateIssueBody } from '@/lib/validators/issue'
import type { BoardData } from './types'

interface UpdateStatusPayload {
  id: string
  status: IssueStatus
}

interface UpdateStatusResponse {
  id: string
  status: IssueStatus
  updated_at: string
}

interface UpdateStatusContext {
  snapshots: Array<[QueryKey, BoardData | undefined]>
}

/**
 * PATCH status with optimistic update.
 * - Move card immediately to the new column (AC-024)
 * - On error, roll back and toast
 * - Always invalidate to refetch server truth
 */
export function useUpdateIssueStatusMutation() {
  const qc = useQueryClient()
  return useMutation<UpdateStatusResponse, Error, UpdateStatusPayload, UpdateStatusContext>({
    mutationFn: ({ id, status }) =>
      request<UpdateStatusResponse>(`/api/issues/${id}/status`, {
        method: 'PATCH',
        body: { status },
      }),
    onMutate: async ({ id, status }) => {
      // Snapshot every 'board' query — different project_id scopes each have their own cache entry
      await qc.cancelQueries({ queryKey: ['board'] })
      const snapshots = qc.getQueriesData<BoardData>({ queryKey: ['board'] })
      snapshots.forEach(([key, prev]) => {
        if (!prev) return
        const movingIssue = prev.columns
          .flatMap((col) => col.issues)
          .find((issue) => issue.id === id)
        if (!movingIssue) return
        const next: BoardData = {
          total: prev.total,
          columns: prev.columns.map((col) => {
            if (col.issues.some((issue) => issue.id === id)) {
              return {
                ...col,
                issues: col.issues.filter((issue) => issue.id !== id),
                count: col.count - 1,
              }
            }
            if (col.status === status) {
              return {
                ...col,
                issues: [{ ...movingIssue, status }, ...col.issues],
                count: col.count + 1,
              }
            }
            return col
          }),
        }
        qc.setQueryData(key, next)
      })
      return { snapshots }
    },
    onError: (_err, _payload, ctx) => {
      ctx?.snapshots.forEach(([key, prev]) => {
        if (prev) qc.setQueryData(key, prev)
      })
      toast.error('状态更新失败，已回滚')
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['board'] })
      void qc.invalidateQueries({ queryKey: ['issue-list'] })
    },
  })
}

/**
 * Create issue from board dialog (AC-014).
 * - On success insert into the target column and toast
 * - On error toast (server side validation surfaces via request<T>() throw)
 */
export function useCreateIssueMutation() {
  const qc = useQueryClient()
  return useMutation<Issue, Error, CreateIssueBody>({
    mutationFn: (body) => request<Issue>('/api/issues', { method: 'POST', body }),
    onSuccess: (issue) => {
      const boards = qc.getQueriesData<BoardData>({ queryKey: ['board'] })
      boards.forEach(([key, prev]) => {
        if (!prev) return
        const next: BoardData = {
          total: prev.total + 1,
          columns: prev.columns.map((col) =>
            col.status === issue.status
              ? { ...col, issues: [issue, ...col.issues], count: col.count + 1 }
              : col,
          ),
        }
        qc.setQueryData(key, next)
      })
      toast.success('已创建 issue')
      void qc.invalidateQueries({ queryKey: ['issue-list'] })
    },
    onError: () => {
      toast.error('创建失败，请重试')
    },
  })
}
