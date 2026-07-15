import type { Issue, IssueStatus } from '@/lib/api-types'

/**
 * Canonical status labels used across board / list / detail views. Keep this
 * table as the single source of truth — features that want a different
 * shortening should build off these strings instead of re-defining the map.
 */
export const STATUS_LABELS: Record<IssueStatus, string> = {
  todo: '待办',
  in_progress: '进行中',
  done: '已完成',
  archived: '已归档',
}

export const BOARD_COLUMNS: readonly IssueStatus[] = [
  'todo',
  'in_progress',
  'done',
  'archived',
] as const
/** @deprecated Import STATUS_LABELS instead. */
export const BOARD_COLUMN_LABELS: Record<IssueStatus, string> = STATUS_LABELS

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
