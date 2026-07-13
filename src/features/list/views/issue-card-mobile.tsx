/**
 * IssueCardMobile — <768 stacked card, keeps status/priority/project/due
 * signals visible in one glance. Wraps the whole card in a Link to /issue/:id.
 */
import { Link } from 'react-router'
import type { Issue, IssueStatus, IssuePriority } from '@/lib/api-types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STATUS_LABEL: Record<IssueStatus, string> = {
  todo: '待办',
  in_progress: '进行中',
  done: '已完成',
  archived: '已归档',
}

const PRIORITY_LABEL: Record<IssuePriority, string> = {
  p0: 'P0',
  p1: 'P1',
  p2: 'P2',
  p3: 'P3',
}

const STATUS_CLASS: Record<IssueStatus, string> = {
  todo: 'border-muted-foreground/30 text-muted-foreground',
  in_progress: 'border-primary/60 text-primary bg-primary/10',
  done: 'border-accent-foreground/30 text-muted-foreground',
  archived: 'border-muted-foreground/20 text-muted-foreground/70',
}

const PRIORITY_CLASS: Record<IssuePriority, string> = {
  p0: 'border-destructive/60 text-destructive bg-destructive/10',
  p1: 'border-primary/60 text-primary bg-primary/10',
  p2: 'border-accent-foreground/40 text-accent-foreground bg-accent',
  p3: 'border-muted-foreground/30 text-muted-foreground bg-muted',
}

interface IssueCardMobileProps {
  issue: Issue
}

export function IssueCardMobile({ issue }: IssueCardMobileProps) {
  return (
    <Link
      to={`/issue/${issue.id}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
    >
      <Card className="flex flex-col gap-2 p-3 hover:bg-muted/40 transition-colors">
        <div className="text-sm font-medium line-clamp-2">{issue.title}</div>
        <div className="flex flex-wrap items-center gap-1 text-xs">
          <Badge
            variant="outline"
            className={cn('whitespace-nowrap font-normal', STATUS_CLASS[issue.status])}
          >
            {STATUS_LABEL[issue.status]}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              'whitespace-nowrap font-medium tabular-nums',
              PRIORITY_CLASS[issue.priority]
            )}
          >
            {PRIORITY_LABEL[issue.priority]}
          </Badge>
          {issue.due_date && (
            <Badge variant="outline" className="whitespace-nowrap font-normal">
              {issue.due_date}
            </Badge>
          )}
        </div>
        {issue.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
            {issue.labels.slice(0, 3).map((l) => (
              <span key={l.id} className="inline-flex items-center gap-1">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: l.color }}
                />
                {l.name}
              </span>
            ))}
            {issue.labels.length > 3 && <span>+{issue.labels.length - 3}</span>}
          </div>
        )}
      </Card>
    </Link>
  )
}
