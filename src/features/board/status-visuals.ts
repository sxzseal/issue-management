/**
 * Shared status visuals for the board feature — icon + tone. Consumed by both
 * BoardColumn header and the status-select sheet so a design change lands in
 * one place instead of two.
 *
 * Icon tone uses semantic tokens from `globals.css`.
 */
import {
  Archive,
  CheckCircle2,
  Circle,
  PlayCircle,
  type LucideIcon,
} from 'lucide-react'
import type { IssueStatus } from '@/lib/api-types'

export const STATUS_ICON: Record<IssueStatus, LucideIcon> = {
  todo: Circle,
  in_progress: PlayCircle,
  done: CheckCircle2,
  archived: Archive,
}

export const STATUS_ICON_CLASS: Record<IssueStatus, string> = {
  todo: 'text-[hsl(var(--status-todo))]',
  in_progress: 'text-[hsl(var(--status-in-progress))]',
  done: 'text-[hsl(var(--status-done))]',
  archived: 'text-[hsl(var(--status-archived))]',
}
