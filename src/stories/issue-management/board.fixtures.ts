/**
 * board feature · story-level 展示常量
 *
 * 状态列图标 / 优先级配色（用 hardcoded semantic 语义色作高亮标记，story 层允许）
 */

import {
  Circle,
  PlayCircle,
  CheckCircle2,
  Archive,
  type LucideIcon,
} from 'lucide-react'
import type {
  IssueStatus,
  IssuePriority,
} from '@/stories/issue-management/_shared/domain'

export const STATUS_ICON: Record<IssueStatus, LucideIcon> = {
  todo: Circle,
  in_progress: PlayCircle,
  done: CheckCircle2,
  archived: Archive,
}

/**
 * 状态列头图标的着色 class（走 tailwind color token 中语义近的一档）。
 * 允许使用 tailwind palette 作为语义高亮标记（与主题的 border-input / text-muted-foreground 区分）。
 */
export const STATUS_ICON_CLASS: Record<IssueStatus, string> = {
  todo: 'text-muted-foreground',
  in_progress: 'text-primary',
  done: 'text-emerald-600 dark:text-emerald-400',
  archived: 'text-muted-foreground/70',
}

/**
 * 优先级 chip 样式：语义高亮标记，允许硬编码色调。
 */
export const PRIORITY_CHIP_CLASS: Record<IssuePriority, string> = {
  p0: 'border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400',
  p1: 'border-orange-500/50 bg-orange-500/10 text-orange-600 dark:text-orange-400',
  p2: 'border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400',
  p3: 'border-slate-400/50 bg-slate-400/10 text-slate-600 dark:text-slate-400',
}

/**
 * 页面顶部次级视图 tab（当前用于展示看板 / 列表切换意图，非路由）
 */
export const BOARD_VIEW_TABS = [
  { key: 'board', label: '看板' },
  { key: 'list', label: '列表' },
] as const
