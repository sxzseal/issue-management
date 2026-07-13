import { queryOptions } from '@tanstack/react-query'
import { request } from '@/lib/request'
import type { Issue } from '@/lib/api-types'
import {
  BOARD_COLUMNS,
  BOARD_COLUMN_LABELS,
  type BoardColumn,
  type BoardData,
  type BoardParams,
} from './types'

interface IssueListResponse {
  list: Issue[]
  total: number
  page: number
  page_size: number
}

/**
 * Board fetches non-archived issues (up to page_size per request) in one shot
 * for the current project scope. We aggregate client-side into 4 columns keyed
 * by status. Archived column is expected to load on demand at the UI layer.
 */
export const boardQueries = {
  overview: (params: BoardParams = {}) =>
    queryOptions({
      queryKey: ['board', 'overview', params] as const,
      queryFn: async (): Promise<BoardData> => {
        const query: Record<string, string | number> = { page: 1, page_size: 100 }
        if (params.project_id) query.project_id = params.project_id
        const res = await request<IssueListResponse>('/api/issues', { query })
        const columns: BoardColumn[] = BOARD_COLUMNS.map((status) => {
          const issues = res.list.filter((issue) => issue.status === status)
          return {
            status,
            label: BOARD_COLUMN_LABELS[status],
            issues,
            count: issues.length,
          }
        })
        return { columns, total: res.total }
      },
      staleTime: 15_000,
    }),
}
