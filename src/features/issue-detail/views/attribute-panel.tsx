/**
 * AttributePanel — right column (AC-057 / AC-058).
 *
 * Cards: Status / Priority / Project / Labels / DueDate / Activity (v1 stub) +
 * an attachment v1 placeholder (AC-062). Each editable card fires
 * `useUpdateIssueMutation` (which is optimistic + rollback + toast).
 */
import { useEffect, useState } from 'react'
import { useQuery, queryOptions } from '@tanstack/react-query'
import { Calendar, Paperclip } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { request } from '@/lib/request'
import type {
  IssueDetail,
  IssuePriority,
  IssueStatus,
  Label,
} from '@/lib/api-types'
import { projectsQueryOptions } from '@/features/projects/queries'

import { useUpdateIssueMutation } from '../mutations'

const STATUS_ORDER: IssueStatus[] = ['todo', 'in_progress', 'done', 'archived']
const STATUS_LABEL: Record<IssueStatus, string> = {
  todo: '待办',
  in_progress: '进行中',
  done: '完成',
  archived: '已归档',
}
const STATUS_DOT: Record<IssueStatus, string> = {
  todo: 'bg-[hsl(var(--status-todo))]',
  in_progress: 'bg-[hsl(var(--status-in-progress))]',
  done: 'bg-[hsl(var(--status-done))]',
  archived: 'bg-[hsl(var(--status-archived))]',
}

const PRIORITY_ORDER: IssuePriority[] = ['p0', 'p1', 'p2', 'p3']
const PRIORITY_LABEL: Record<IssuePriority, string> = {
  p0: 'P0 · 紧急',
  p1: 'P1 · 高',
  p2: 'P2 · 中',
  p3: 'P3 · 低',
}
const PRIORITY_TONE: Record<IssuePriority, string> = {
  p0: 'bg-[hsl(var(--priority-p0)/0.15)] text-[hsl(var(--priority-p0))]',
  p1: 'bg-[hsl(var(--priority-p1)/0.15)] text-[hsl(var(--priority-p1))]',
  p2: 'bg-[hsl(var(--priority-p2)/0.15)] text-[hsl(var(--priority-p2))]',
  p3: 'bg-[hsl(var(--priority-p3)/0.15)] text-[hsl(var(--priority-p3))]',
}

const labelsListQuery = queryOptions({
  queryKey: ['labels', 'list'] as const,
  queryFn: () => request<Label[]>('/api/labels'),
  staleTime: 60_000,
})

interface SideCardProps {
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}

function SideCard({ title, children, action }: SideCardProps) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
          {action}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

interface AttributePanelProps {
  issue: IssueDetail
}

export function AttributePanel({ issue }: AttributePanelProps) {
  const update = useUpdateIssueMutation()
  const { data: projects } = useQuery(projectsQueryOptions)
  const { data: labels } = useQuery(labelsListQuery)

  const patch = (body: Parameters<typeof update.mutate>[0]['body']) => {
    update.mutate({ id: issue.id, body })
  }

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <SideCard title="状态">
          <Select
            value={issue.status}
            onValueChange={(v) => patch({ status: v as IssueStatus })}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden className={cn('h-2 w-2 rounded-full', STATUS_DOT[s])} />
                    {STATUS_LABEL[s]}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SideCard>

        <SideCard title="优先级">
          <Select
            value={issue.priority}
            onValueChange={(v) => patch({ priority: v as IssuePriority })}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_ORDER.map((p) => (
                <SelectItem key={p} value={p}>
                  <span className="inline-flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={cn('h-4 px-1 text-[10px] tabular-nums', PRIORITY_TONE[p])}
                    >
                      {p.toUpperCase()}
                    </Badge>
                    {PRIORITY_LABEL[p]}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SideCard>

        <SideCard title="项目">
          <Select
            value={issue.project_id}
            onValueChange={(v) => patch({ project_id: v })}
            disabled={!projects}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="选择项目" />
            </SelectTrigger>
            <SelectContent>
              {projects?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    {p.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SideCard>

        <LabelsCard issue={issue} allLabels={labels ?? []} onSave={(ids) => patch({ label_ids: ids })} />

        <DueDateCard
          value={issue.due_date}
          onSave={(next) => patch({ due_date: next })}
        />

        <SideCard title="活动日志">
          <p className="text-xs text-muted-foreground">v1 暂不追踪活动</p>
        </SideCard>

        <SideCard title="附件">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Paperclip className="h-3.5 w-3.5" />
                <span>v1 暂不支持附件</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">v1 暂不支持附件</TooltipContent>
          </Tooltip>
        </SideCard>
      </div>
    </TooltipProvider>
  )
}

interface LabelsCardProps {
  issue: IssueDetail
  allLabels: Label[]
  onSave: (labelIds: string[]) => void
}

function LabelsCard({ issue, allLabels, onSave }: LabelsCardProps) {
  const [open, setOpen] = useState<boolean>(false)
  const currentIds = issue.labels.map((l) => l.id)
  // Buffer selection while the popover is open so rapid clicks compose locally
  // instead of firing one PATCH per Checkbox (and racing on stale server state).
  // Committed once on popover close.
  const [pendingIds, setPendingIds] = useState<string[] | null>(null)
  const displayIds = pendingIds ?? currentIds

  const toggle = (id: string) => {
    const base = pendingIds ?? currentIds
    const next = base.includes(id) ? base.filter((x) => x !== id) : [...base, id]
    setPendingIds(next)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      if (pendingIds !== null) {
        // Only PATCH when the selection actually changed.
        const changed =
          pendingIds.length !== currentIds.length ||
          pendingIds.some((id) => !currentIds.includes(id))
        if (changed) onSave(pendingIds)
      }
      setPendingIds(null)
    }
  }

  return (
    <SideCard
      title="标签"
      action={
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs text-muted-foreground">
              + 添加
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-2">
            {allLabels.length === 0 ? (
              <p className="p-2 text-xs text-muted-foreground">暂无标签</p>
            ) : (
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {allLabels.map((l) => {
                  const checked = displayIds.includes(l.id)
                  return (
                    <label
                      key={l.id}
                      className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle(l.id)}
                      />
                      <span
                        aria-hidden
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: l.color }}
                      />
                      <span className="truncate text-sm">{l.name}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </PopoverContent>
        </Popover>
      }
    >
      <div className="flex flex-wrap gap-1.5">
        {issue.labels.length === 0 ? (
          <span className="text-xs text-muted-foreground">未设置</span>
        ) : (
          issue.labels.map((l) => (
            <Badge
              key={l.id}
              variant="outline"
              className="h-5 gap-1 px-1.5 text-[11px] font-normal"
            >
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: l.color }}
              />
              {l.name}
            </Badge>
          ))
        )}
      </div>
    </SideCard>
  )
}

interface DueDateCardProps {
  value: string | null
  onSave: (value: string | null) => void
}

/**
 * Small hook to sync the local input value to the server prop when it changes
 * (e.g. after an optimistic rollback). Kept as a named hook so we don't have a
 * bare useEffect in the component body.
 */
function useSyncedDate(external: string | null): [string, (v: string) => void] {
  const [value, setValue] = useState<string>(external ?? '')
  useEffect(() => {
    setValue(external ?? '')
  }, [external])
  return [value, setValue]
}

function DueDateCard({ value, onSave }: DueDateCardProps) {
  const [local, setLocal] = useSyncedDate(value)

  const commit = () => {
    const next = local || null
    if (next === value) return
    onSave(next)
  }

  return (
    <SideCard title="截止日期">
      <div className="relative">
        <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="date"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commit}
          className="h-9 pl-8"
        />
      </div>
      {!local ? (
        <p className="mt-1 text-xs text-muted-foreground">未设置</p>
      ) : null}
    </SideCard>
  )
}
