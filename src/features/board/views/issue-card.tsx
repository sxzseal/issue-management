/**
 * Board issue card — priority chip + title + meta row (project, labels, due, source).
 * Clicking title (or the priority chip) opens the status select sheet (AC-023).
 */
import { Calendar, MoreHorizontal, Webhook } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { Issue, IssuePriority } from '@/lib/api-types'

const PRIORITY_CHIP_CLASS: Record<IssuePriority, string> = {
  p0: 'border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400',
  p1: 'border-orange-500/50 bg-orange-500/10 text-orange-600 dark:text-orange-400',
  p2: 'border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400',
  p3: 'border-slate-400/50 bg-slate-400/10 text-slate-600 dark:text-slate-400',
}

const PRIORITY_LABEL: Record<IssuePriority, string> = {
  p0: '优先级 P0',
  p1: '优先级 P1',
  p2: '优先级 P2',
  p3: '优先级 P3',
}

const TODAY_ISO = (() => {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
})()

function isOverdue(due: string): boolean {
  return due < TODAY_ISO
}

function isToday(due: string): boolean {
  return due === TODAY_ISO
}

function formatDue(due: string): string {
  if (isToday(due)) return '今天'
  if (isOverdue(due)) return `逾期 ${due.slice(5)}`
  return due.slice(5)
}

interface IssueCardProps {
  issue: Issue
  onOpenStatus: (issue: Issue) => void
}

export function IssueCard({ issue, onOpenStatus }: IssueCardProps) {
  const labels = issue.labels ?? []
  const shownLabels = labels.slice(0, 3)
  const remaining = labels.length - shownLabels.length
  const overdue = issue.due_date ? isOverdue(issue.due_date) : false
  const today = issue.due_date ? isToday(issue.due_date) : false

  return (
    <div
      className={cn(
        'group relative flex flex-col gap-2 rounded-md border border-border bg-background p-3 min-w-0',
        'transition-shadow hover:bg-accent/50 hover:shadow-sm focus-within:ring-2 focus-within:ring-ring',
      )}
      role="article"
      aria-label={`issue: ${issue.title}`}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onOpenStatus(issue)
          }}
          className={cn(
            'inline-flex h-5 shrink-0 items-center rounded-full border px-1.5 text-[10px] font-mono font-semibold tabular-nums',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            PRIORITY_CHIP_CLASS[issue.priority],
          )}
          aria-label={PRIORITY_LABEL[issue.priority]}
          title={PRIORITY_LABEL[issue.priority]}
        >
          {issue.priority.toUpperCase()}
        </button>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
          aria-label="更多操作"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </div>

      <button
        type="button"
        onClick={() => onOpenStatus(issue)}
        className="text-left text-sm font-medium leading-snug line-clamp-2 break-words focus:outline-none focus-visible:underline"
      >
        {issue.title}
      </button>

      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground min-w-0 max-w-[8rem]">
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40"
          />
          <span className="truncate">{issue.project_id}</span>
        </span>

        {shownLabels.map((label) => (
          <span
            key={label.id}
            className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] max-w-[6rem]"
            style={{ backgroundColor: label.color, color: '#fff' }}
            title={label.name}
          >
            <span className="truncate">{label.name}</span>
          </span>
        ))}
        {remaining > 0 ? (
          <span className="text-[10px] text-muted-foreground">+{remaining}</span>
        ) : null}

        {issue.due_date ? (
          <Badge
            variant="outline"
            className={cn(
              'h-5 gap-1 px-1.5 text-[10px] tabular-nums font-normal',
              overdue && 'border-red-500/60 text-red-600 dark:text-red-400',
              today && 'border-orange-500/60 text-orange-600 dark:text-orange-400',
              !overdue && !today && 'text-muted-foreground',
            )}
          >
            <Calendar className="h-3 w-3" />
            {formatDue(issue.due_date)}
          </Badge>
        ) : null}

        {issue.source === 'webhook' ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground"
                  aria-label="来自 webhook"
                >
                  <Webhook className="h-3.5 w-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                来源：{issue.source_name ?? 'webhook'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>
    </div>
  )
}
