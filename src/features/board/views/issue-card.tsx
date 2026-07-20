/**
 * Board issue card — priority chip + title + meta row (project, labels, due, source).
 * Priority chip opens the status select sheet (AC-023). Whole card navigates to
 * /issue/:id; the priority chip stops propagation so its click doesn't navigate.
 */
import { useLocation, useNavigate } from 'react-router'
import { Calendar, KeyRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { Issue, IssuePriority } from '@/lib/api-types'
import { useProjectsById } from '@/features/projects/queries'
import { makeIssueDetailLocationState } from '@/features/issue-detail/lib/return-target'

// Priority chips consume the `--priority-p0..p3` HSL tokens from globals.css
// so light/dark/theme changes flow through one source of truth rather than
// hand-tuned Tailwind palettes in each view.
const PRIORITY_CHIP_CLASS: Record<IssuePriority, string> = {
  p0: 'border-[hsl(var(--priority-p0)/0.5)] bg-[hsl(var(--priority-p0)/0.1)] text-[hsl(var(--priority-p0))]',
  p1: 'border-[hsl(var(--priority-p1)/0.5)] bg-[hsl(var(--priority-p1)/0.1)] text-[hsl(var(--priority-p1))]',
  p2: 'border-[hsl(var(--priority-p2)/0.5)] bg-[hsl(var(--priority-p2)/0.1)] text-[hsl(var(--priority-p2))]',
  p3: 'border-[hsl(var(--priority-p3)/0.5)] bg-[hsl(var(--priority-p3)/0.1)] text-[hsl(var(--priority-p3))]',
}

const PRIORITY_ARIA_LABEL: Record<IssuePriority, string> = {
  p0: '优先级 P0',
  p1: '优先级 P1',
  p2: '优先级 P2',
  p3: '优先级 P3',
}

/**
 * Local calendar date (YYYY-MM-DD) for "today". `due_date` is a calendar-local
 * value in the model, so we compare against local parts here. Called once per
 * IssueCard render (see IssueCard below) — do NOT inline this into isOverdue/
 * isToday/formatDue, that path spends O(cards × 3) `new Date()` allocations on
 * every Board re-render.
 */
function todayIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isOverdue(due: string, today: string): boolean {
  return due < today
}

function isToday(due: string, today: string): boolean {
  return due === today
}

function formatDue(due: string, today: string): string {
  if (isToday(due, today)) return '今天'
  if (isOverdue(due, today)) return `逾期 ${due.slice(5)}`
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
  const today = todayIso()
  const overdue = issue.due_date ? isOverdue(issue.due_date, today) : false
  const isDueToday = issue.due_date ? isToday(issue.due_date, today) : false
  const projects = useProjectsById()
  const project = projects.get(issue.project_id)
  const navigate = useNavigate()
  const location = useLocation()

  const openDetail = () => {
    void navigate(`/issue/${issue.id}`, {
      state: makeIssueDetailLocationState({
        pathname: '/board',
        search: location.search,
        label: '看板',
      }),
    })
  }

  return (
    <div
      className={cn(
        'group relative flex min-w-0 cursor-pointer flex-col gap-2 rounded-md border border-border bg-background p-3',
        'transition-colors duration-200 ease-out hover:bg-accent/50',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
      role="button"
      tabIndex={0}
      aria-label={`issue: ${issue.title}`}
      onClick={openDetail}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          openDetail()
        }
      }}
    >
      {issue.source === 'api' ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  'absolute right-2 top-2 z-10 inline-flex h-5 w-5 items-center justify-center',
                  'rounded-full bg-primary text-primary-foreground shadow-sm',
                  'ring-2 ring-background',
                )}
                aria-label={`通过 API Token 创建：${issue.source_name ?? 'API'}`}
              >
                <KeyRound className="h-3 w-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              来源：API Token
              {issue.source_name ? ` · ${issue.source_name}` : ''}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null}

      <div className="flex min-w-0 items-start justify-between gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onOpenStatus(issue)
          }}
          className={cn(
            'inline-flex h-5 shrink-0 items-center rounded-full border px-1.5 font-mono text-[10px] font-semibold tabular-nums',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            PRIORITY_CHIP_CLASS[issue.priority],
          )}
          aria-label={PRIORITY_ARIA_LABEL[issue.priority]}
          title={PRIORITY_ARIA_LABEL[issue.priority]}
        >
          {issue.priority.toUpperCase()}
        </button>
      </div>

      <div className="line-clamp-2 break-words text-left text-sm font-medium leading-snug">
        {issue.title}
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="inline-flex min-w-0 max-w-[8rem] items-center gap-1 text-[11px] text-muted-foreground">
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full"
            style={{
              backgroundColor:
                project?.color ?? 'hsl(var(--muted-foreground) / 0.4)',
            }}
          />
          <span className="truncate">{project?.name ?? issue.project_id}</span>
        </span>

        {shownLabels.map((label) => (
          <span
            key={label.id}
            className="inline-flex max-w-[6rem] items-center gap-1 rounded-full border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] text-foreground"
            title={label.name}
          >
            <span
              aria-hidden
              className="h-1.5 w-1.5 flex-none rounded-full"
              style={{ backgroundColor: label.color }}
            />
            <span className="truncate">{label.name}</span>
          </span>
        ))}
        {remaining > 0 ? (
          <span className="text-[10px] text-muted-foreground">
            +{remaining}
          </span>
        ) : null}

        {issue.due_date ? (
          <Badge
            variant="outline"
            className={cn(
              'h-5 gap-1 px-1.5 text-[10px] font-normal tabular-nums',
              overdue && 'border-destructive/60 text-destructive',
              isDueToday &&
                'border-[hsl(var(--feedback-warning)/0.6)] text-[hsl(var(--feedback-warning))]',
              !overdue && !isDueToday && 'text-muted-foreground',
            )}
          >
            <Calendar className="h-3 w-3" />
            {formatDue(issue.due_date, today)}
          </Badge>
        ) : null}
      </div>
    </div>
  )
}
