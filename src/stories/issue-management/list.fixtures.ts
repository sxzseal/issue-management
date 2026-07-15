/**
 * List story 常量
 *
 * 供 list.stories.tsx 使用。分页默认值、优先级配色语义类、空态配置。
 */

import type { IssuePriority } from './_shared/domain'

export const PAGE_SIZE_OPTIONS = [20, 50, 100] as const

export interface ListFiltersState {
  project_id: string | null
  status: string[]
  priority: string[]
  q: string
  sort:
    'updated_at' | 'created_at' | 'due_date' | 'title' | 'priority' | 'status'
  order: 'asc' | 'desc'
  page: number
  page_size: number
}

export const DEFAULT_FILTERS: ListFiltersState = {
  project_id: null,
  status: [],
  priority: [],
  q: '',
  sort: 'updated_at',
  order: 'desc',
  page: 1,
  page_size: 20,
}

/**
 * 优先级语义类（Tailwind semantic tokens，禁用硬编码色值）。
 * 借 destructive/primary/muted/accent 表达强弱层次。
 */
export const PRIORITY_COLOR_CLASS: Record<IssuePriority, string> = {
  p0: 'border-destructive/60 text-destructive bg-destructive/10',
  p1: 'border-primary/60 text-primary bg-primary/10',
  p2: 'border-accent-foreground/40 text-accent-foreground bg-accent',
  p3: 'border-muted-foreground/30 text-muted-foreground bg-muted',
}

export const EMPTY_STATE_CONFIG = {
  icon: 'inbox' as const,
  title: '没有匹配的 issue',
  desc: '试试调整筛选条件或清除全部',
}

export const SORTABLE_COLUMNS = [
  { key: 'title', label: '标题' },
  { key: 'status', label: '状态' },
  { key: 'priority', label: '优先级' },
  { key: 'due_date', label: '到期' },
  { key: 'updated_at', label: '更新时间' },
] as const
