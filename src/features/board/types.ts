import type { Issue, IssueStatus } from '@/lib/api-types'

export const BOARD_COLUMNS: readonly IssueStatus[] = ['todo', 'in_progress', 'done', 'archived'] as const
export const BOARD_COLUMN_LABELS: Record<IssueStatus, string> = {
  todo: '待办',
  in_progress: '进行中',
  done: '已完成',
  archived: '归档',
}

export interface BoardColumn {
  status: IssueStatus
  label: string
  issues: Issue[]
  count: number
}

export interface BoardData {
  columns: BoardColumn[]
  total: number
}

export interface BoardParams {
  project_id?: string
}
