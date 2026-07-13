import type { Issue, IssueStatus, IssuePriority } from '@/lib/api-types'

export type SortField = 'created_at' | 'updated_at' | 'due_date' | 'priority'
export type SortOrder = 'asc' | 'desc'

export interface ListParams {
  project_id?: string
  /** empty array === all statuses (omitted from URL) */
  status?: IssueStatus[]
  priority?: IssuePriority[]
  /** label ids */
  labels?: string[]
  /** YYYY-MM-DD */
  due_from?: string
  /** YYYY-MM-DD */
  due_to?: string
  q?: string
  sort: SortField
  order: SortOrder
  /** 1-based */
  page: number
  pageSize: 20 | 50 | 100
}

export const DEFAULT_LIST_PARAMS: ListParams = {
  sort: 'updated_at',
  order: 'desc',
  page: 1,
  pageSize: 20,
}

export interface ListData {
  list: Issue[]
  total: number
  page: number
  page_size: number
}
