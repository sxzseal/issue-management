/**
 * IssueCardMobile — <768 stacked card, keeps status/priority/project/due
 * signals visible in one glance. Wraps the whole card in a Link to /issue/:id.
 */
import { Link } from 'react-router'
import type { Issue } from '@/lib/api-types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  PRIORITY_CLASS,
  PRIORITY_LABEL,
  STATUS_CLASS,
  STATUS_LABEL,
} from '../status-visuals'

interface IssueCardMobileProps {
  issue: Issue
}

export function IssueCardMobile({ issue }: IssueCardMobileProps) {
  return (
    <Link
      to={`/issue/${issue.id}`}
      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="flex flex-col gap-2 p-3 transition-colors hover:bg-muted/40">
        <div className="line-clamp-2 text-sm font-medium">{issue.title}</div>
        <div className="flex flex-wrap items-center gap-1 text-xs">
          <Badge
            variant="outline"
            className={cn(
              'whitespace-nowrap font-normal',
              STATUS_CLASS[issue.status],
            )}
          >
            {STATUS_LABEL[issue.status]}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              'whitespace-nowrap font-medium tabular-nums',
              PRIORITY_CLASS[issue.priority],
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
