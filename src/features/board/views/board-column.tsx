/**
 * BoardColumn — kanban column (status header + scrollable issue card list).
 * Empty state shows a dashed placeholder (AC-025).
 */
import { Archive, CheckCircle2, Circle, PlayCircle, Plus, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Issue, IssueStatus } from '@/lib/api-types'
import type { BoardColumn as BoardColumnData } from '../types'
import { IssueCard } from './issue-card'

const STATUS_ICON: Record<IssueStatus, LucideIcon> = {
  todo: Circle,
  in_progress: PlayCircle,
  done: CheckCircle2,
  archived: Archive,
}

const STATUS_ICON_CLASS: Record<IssueStatus, string> = {
  todo: 'text-muted-foreground',
  in_progress: 'text-primary',
  done: 'text-emerald-600 dark:text-emerald-400',
  archived: 'text-muted-foreground/70',
}

interface BoardColumnProps {
  column: BoardColumnData
  onCreate: (status: IssueStatus) => void
  onOpenStatus: (issue: Issue) => void
}

export function BoardColumn({ column, onCreate, onOpenStatus }: BoardColumnProps) {
  const Icon = STATUS_ICON[column.status]
  return (
    <section
      aria-label={`${column.label} 列`}
      className="flex flex-col min-h-0 min-w-0 rounded-lg border border-border bg-card/40"
    >
      <header className="flex flex-none items-center gap-2 border-b border-border px-3 py-2">
        <Icon
          className={cn('h-4 w-4 shrink-0', STATUS_ICON_CLASS[column.status])}
          aria-hidden
        />
        <span className="text-sm font-medium">{column.label}</span>
        <Badge
          variant="secondary"
          className="h-5 min-w-[1.25rem] justify-center px-1 text-[10px] tabular-nums"
        >
          {column.count}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-6 w-6"
          aria-label={`在 ${column.label} 列新建`}
          onClick={() => onCreate(column.status)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2" role="list">
        {column.issues.length === 0 ? (
          <div className="grid h-32 place-items-center rounded-md border border-dashed border-input p-8 text-center text-xs text-muted-foreground">
            把卡片拖到这里
          </div>
        ) : (
          column.issues.map((issue) => (
            <div key={issue.id} role="listitem">
              <IssueCard issue={issue} onOpenStatus={onOpenStatus} />
            </div>
          ))
        )}
      </div>
    </section>
  )
}
