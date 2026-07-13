import { queryOptions } from '@tanstack/react-query'
import { request } from '@/lib/request'
import type { IssueDetail } from '@/lib/api-types'
import type { CommentsData } from './types'

export const issueDetailQueries = {
  byId: (id: string) =>
    queryOptions({
      queryKey: ['issue-detail', id] as const,
      queryFn: () => request<IssueDetail>(`/api/issues/${id}`),
      staleTime: 10_000,
    }),

  comments: (id: string, page = 1, pageSize = 50) =>
    queryOptions({
      queryKey: ['issue-detail', id, 'comments', { page, pageSize }] as const,
      queryFn: () =>
        request<CommentsData>(`/api/issues/${id}/comments`, {
          query: { page, page_size: pageSize },
        }),
      staleTime: 10_000,
    }),
}
