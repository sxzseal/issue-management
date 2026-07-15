import { queryOptions } from '@tanstack/react-query'
import { request } from '@/lib/request'
import type { ListData, ListParams } from './types'

/** Convert ListParams into the API's query params shape. */
function toApiQuery(p: ListParams): Record<string, string | number> {
  const q: Record<string, string | number> = {
    page: p.page,
    page_size: p.pageSize,
    sort: p.sort,
    order: p.order,
  }
  if (p.project_id) q.project_id = p.project_id
  if (p.status?.length) q.status = p.status.join(',')
  if (p.priority?.length) q.priority = p.priority.join(',')
  if (p.labels?.length) q.labels = p.labels.join(',')
  if (p.due_from) q.due_from = p.due_from
  if (p.due_to) q.due_to = p.due_to
  if (p.q) q.q = p.q
  return q
}

export const listQueries = {
  page: (params: ListParams) =>
    queryOptions({
      queryKey: ['issue-list', params] as const,
      queryFn: () =>
        request<ListData>('/api/issues', { query: toApiQuery(params) }),
      staleTime: 15_000,
    }),
}
