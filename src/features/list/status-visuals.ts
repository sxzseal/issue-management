/**
 * Shared visual maps for list-view rows (mobile card + desktop table row).
 * Consolidates the four Record<IssueStatus | IssuePriority, string> tables
 * previously duplicated in `issue-card-mobile.tsx` and `issue-table-row.tsx`.
 * Labels feed off `STATUS_LABELS` from the board feature so status wording
 * stays consistent across board / list / detail.
 */
import type { IssuePriority, IssueStatus } from '@/lib/api-types'
import { STATUS_LABELS } from '@/features/board/types'

export const STATUS_LABEL: Record<IssueStatus, string> = STATUS_LABELS

export const PRIORITY_LABEL: Record<IssuePriority, string> = {
  p0: 'P0',
  p1: 'P1',
  p2: 'P2',
  p3: 'P3',
}

export const STATUS_CLASS: Record<IssueStatus, string> = {
  todo: 'border-[hsl(var(--status-todo)/0.5)] bg-[hsl(var(--status-todo)/0.1)] text-[hsl(var(--status-todo))]',
  in_progress:
    'border-[hsl(var(--status-in-progress)/0.5)] bg-[hsl(var(--status-in-progress)/0.1)] text-[hsl(var(--status-in-progress))]',
  done: 'border-[hsl(var(--status-done)/0.5)] bg-[hsl(var(--status-done)/0.1)] text-[hsl(var(--status-done))]',
  archived:
    'border-[hsl(var(--status-archived)/0.5)] bg-[hsl(var(--status-archived)/0.1)] text-[hsl(var(--status-archived))]',
}

export const PRIORITY_CLASS: Record<IssuePriority, string> = {
  p0: 'border-destructive/60 text-destructive bg-destructive/10',
  p1: 'border-primary/60 text-primary bg-primary/10',
  p2: 'border-accent-foreground/40 text-accent-foreground bg-accent',
  p3: 'border-muted-foreground/30 text-muted-foreground bg-muted',
}
