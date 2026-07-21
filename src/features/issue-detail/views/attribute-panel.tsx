/**
 * AttributePanel — right column of /issue/:id.
 *
 * All editable widgets (Status / Priority / Project / Labels / DueDate) read
 * from `useIssueDraft()`. In view mode they render read-only chips; in edit
 * mode they render the interactive controls and write straight into the
 * draft. No PATCH fires here — the page-level Save button commits the whole
 * draft in one round-trip.
 *
 * Activity + Attachments cards remain v1 stubs.
 */
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
import type { IssuePriority, IssueStatus, Label } from '@/lib/api-types'
import { projectsQueryOptions } from '@/features/projects/queries'

import { useIssueDraft } from '../lib/issue-draft'

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

export function AttributePanel() {
  const draft = useIssueDraft()
  const editing = draft.mode === 'edit'
  const { data: projects } = useQuery(projectsQueryOptions)
  const { data: allLabels } = useQuery(labelsListQuery)

  const activeProject = projects?.find((p) => p.id === draft.projectId)

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <SideCard title="状态">
          {editing ? (
            <Select
              value={draft.status}
              onValueChange={(v) => draft.patchStatus(v as IssueStatus)}
              disabled={draft.saving}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    <span className="inline-flex items-center gap-2">
                      <span
                        aria-hidden
                        className={cn('h-2 w-2 rounded-full', STATUS_DOT[s])}
                      />
                      {STATUS_LABEL[s]}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="inline-flex items-center gap-2 text-sm">
              <span
                aria-hidden
                className={cn('h-2 w-2 rounded-full', STATUS_DOT[draft.status])}
              />
              {STATUS_LABEL[draft.status]}
            </div>
          )}
        </SideCard>

        <SideCard title="优先级">
          {editing ? (
            <Select
              value={draft.priority}
              onValueChange={(v) => draft.patchPriority(v as IssuePriority)}
              disabled={draft.saving}
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
                        className={cn(
                          'h-4 px-1 text-[10px] tabular-nums',
                          PRIORITY_TONE[p],
                        )}
                      >
                        {p.toUpperCase()}
                      </Badge>
                      {PRIORITY_LABEL[p]}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="inline-flex items-center gap-2 text-sm">
              <Badge
                variant="secondary"
                className={cn(
                  'h-4 px-1 text-[10px] tabular-nums',
                  PRIORITY_TONE[draft.priority],
                )}
              >
                {draft.priority.toUpperCase()}
              </Badge>
              {PRIORITY_LABEL[draft.priority]}
            </div>
          )}
        </SideCard>

        <SideCard title="项目">
          {editing ? (
            <Select
              value={draft.projectId}
              onValueChange={(v) => draft.patchProject(v)}
              disabled={draft.saving || !projects}
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
          ) : (
            <div className="inline-flex items-center gap-2 text-sm">
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: activeProject?.color ?? '#94a3b8' }}
              />
              {activeProject?.name ?? draft.projectId}
            </div>
          )}
        </SideCard>

        <LabelsCard
          editing={editing}
          allLabels={allLabels ?? []}
          value={draft.labels}
          valueIds={draft.labelIds}
          onChange={draft.patchLabels}
          saving={draft.saving}
        />

        <DueDateCard
          editing={editing}
          value={draft.dueDate}
          onChange={draft.patchDueDate}
          saving={draft.saving}
        />

        {/* <SideCard title="活动日志">
          <p className="text-xs text-muted-foreground">v1 暂不追踪活动</p>
        </SideCard>

        <SideCard title="附件">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Paperclip className="h-3.5 w-3.5" />
                <span>v1 暂不支持独立附件</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">
              请通过正文的粘贴 / 拖拽 / 回形针上传附件
            </TooltipContent>
          </Tooltip>
        </SideCard> */}
      </div>
    </TooltipProvider>
  )
}

interface LabelsCardProps {
  editing: boolean
  allLabels: Label[]
  value: Label[]
  valueIds: string[]
  onChange: (ids: string[]) => void
  saving: boolean
}

function LabelsCard({
  editing,
  allLabels,
  value,
  valueIds,
  onChange,
  saving,
}: LabelsCardProps) {
  const toggle = (id: string) => {
    const next = valueIds.includes(id)
      ? valueIds.filter((x) => x !== id)
      : [...valueIds, id]
    onChange(next)
  }

  return (
    <SideCard
      title="标签"
      action={
        editing ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-xs text-muted-foreground"
                disabled={saving}
              >
                + 添加
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2">
              {allLabels.length === 0 ? (
                <p className="p-2 text-xs text-muted-foreground">暂无标签</p>
              ) : (
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  {allLabels.map((l) => {
                    const checked = valueIds.includes(l.id)
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
        ) : null
      }
    >
      <div className="flex flex-wrap gap-1.5">
        {value.length === 0 ? (
          <span className="text-xs text-muted-foreground">未设置</span>
        ) : (
          value.map((l) => (
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
  editing: boolean
  value: string | null
  onChange: (next: string | null) => void
  saving: boolean
}

function DueDateCard({ editing, value, onChange, saving }: DueDateCardProps) {
  if (!editing) {
    return (
      <SideCard title="截止日期">
        {value ? (
          <div className="inline-flex items-center gap-1.5 text-sm">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            {value}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">未设置</p>
        )}
      </SideCard>
    )
  }

  return (
    <SideCard title="截止日期">
      <div className="relative">
        <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="date"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          className="h-9 pl-8"
          disabled={saving}
        />
      </div>
      {!value ? (
        <p className="mt-1 text-xs text-muted-foreground">未设置</p>
      ) : null}
    </SideCard>
  )
}
