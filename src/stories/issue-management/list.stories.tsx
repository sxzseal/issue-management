'use client'

/**
 * L3 · issue-management / 列表视图
 *
 * 4 stories:
 *  - v1 — 默认列表（30 条）
 *  - WithFilters — project=ai-forge + status=todo,in_progress 应用后
 *  - Empty — 筛选后 0 条
 *  - Loading — 首次加载 skeleton
 *
 * 布局：h-full + flex column + overflow-hidden；表格区 flex-1 min-h-0 overflow-auto。
 * 颜色全部走语义 Tailwind token，禁用硬编码色值。
 */

import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Inbox,
  MoreHorizontal,
  Search,
  X,
  Webhook as WebhookIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { AppShell } from './_shared/AppShell'
import {
  type Issue,
  type IssueStatus,
  type IssuePriority,
  STATUS_LABEL,
  PRIORITY_SHORT,
  MOCK_PROJECTS,
  MOCK_LABELS,
  projectById,
  labelsByIds,
} from './_shared/domain'
import { listHandlers } from '../../../mocks/handlers/list'
import { LIST_ISSUES } from '../../../mocks/fixtures/list'
import {
  DEFAULT_FILTERS,
  EMPTY_STATE_CONFIG,
  PAGE_SIZE_OPTIONS,
  PRIORITY_COLOR_CLASS,
  SORTABLE_COLUMNS,
  type ListFiltersState,
} from './list.fixtures'

// ────────────────────────────────────────────────────────────────
// Utilities
// ────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return iso.slice(0, 10)
}

function formatRelative(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, '/')
}

const PRIORITY_RANK: Record<IssuePriority, number> = { p0: 0, p1: 1, p2: 2, p3: 3 }
const STATUS_RANK: Record<IssueStatus, number> = {
  todo: 0,
  in_progress: 1,
  done: 2,
  archived: 3,
}

type SortKey = ListFiltersState['sort']

function sortIssues(list: Issue[], sort: SortKey, order: 'asc' | 'desc'): Issue[] {
  const copy = [...list]
  copy.sort((a, b) => {
    let cmp = 0
    if (sort === 'priority') cmp = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    else if (sort === 'status') cmp = STATUS_RANK[a.status] - STATUS_RANK[b.status]
    else {
      const av = a[sort]
      const bv = b[sort]
      const aNull = av == null
      const bNull = bv == null
      if (aNull && bNull) cmp = 0
      else if (aNull) cmp = 1
      else if (bNull) cmp = -1
      else if (typeof av === 'string' && typeof bv === 'string')
        cmp = av < bv ? -1 : av > bv ? 1 : 0
    }
    return order === 'asc' ? cmp : -cmp
  })
  return copy
}

function filterIssues(list: Issue[], f: ListFiltersState): Issue[] {
  const q = f.q.toLowerCase().trim()
  return list.filter((i) => {
    if (f.project_id && i.project_id !== f.project_id) return false
    if (f.status.length > 0 && !f.status.includes(i.status)) return false
    if (f.priority.length > 0 && !f.priority.includes(i.priority)) return false
    if (q && !i.title.toLowerCase().includes(q)) return false
    return true
  })
}

// ────────────────────────────────────────────────────────────────
// Cell components
// ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: IssueStatus }) {
  const tone: Record<IssueStatus, string> = {
    todo: 'border-muted-foreground/30 text-muted-foreground',
    in_progress: 'border-primary/60 text-primary bg-primary/10',
    done: 'border-accent-foreground/30 text-muted-foreground',
    archived: 'border-muted-foreground/20 text-muted-foreground/70',
  }
  return (
    <Badge variant="outline" className={cn('font-normal whitespace-nowrap', tone[status])}>
      {STATUS_LABEL[status]}
    </Badge>
  )
}

function PriorityBadge({ priority }: { priority: IssuePriority }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium tabular-nums whitespace-nowrap',
        PRIORITY_COLOR_CLASS[priority],
      )}
    >
      {PRIORITY_SHORT[priority]}
    </Badge>
  )
}

function ProjectCell({ projectId }: { projectId: string }) {
  const project = projectById(projectId)
  if (!project) return <span className="text-muted-foreground">—</span>
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span
        aria-hidden
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: project.color }}
      />
      <span className="truncate text-sm">{project.name}</span>
    </div>
  )
}

function LabelChips({ labelIds }: { labelIds: string[] }) {
  const labels = labelsByIds(labelIds)
  if (labels.length === 0) return <span className="text-muted-foreground text-xs">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {labels.slice(0, 2).map((l) => (
        <span
          key={l.id}
          className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-1.5 py-0.5 text-[11px]"
        >
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: l.color }}
          />
          {l.name}
        </span>
      ))}
      {labels.length > 2 ? (
        <span className="text-[11px] text-muted-foreground">+{labels.length - 2}</span>
      ) : null}
    </div>
  )
}

function RowActions() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          aria-label="更多操作"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem>复制链接</DropdownMenuItem>
        <DropdownMenuItem>移动到项目…</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>归档</DropdownMenuItem>
        <DropdownMenuItem className="text-destructive focus:text-destructive">
          删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ────────────────────────────────────────────────────────────────
// Filter bar
// ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: IssueStatus[] = ['todo', 'in_progress', 'done', 'archived']
const PRIORITY_OPTIONS: IssuePriority[] = ['p0', 'p1', 'p2', 'p3']

function MultiSelectPopover({
  label,
  options,
  values,
  onToggle,
  renderLabel,
}: {
  label: string
  options: readonly string[]
  values: string[]
  onToggle: (v: string) => void
  renderLabel: (v: string) => string
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 border-dashed',
            values.length > 0 && 'border-primary/50 bg-primary/5',
          )}
        >
          {label}
          {values.length > 0 ? (
            <Badge
              variant="secondary"
              className="ml-1.5 h-4 rounded px-1 text-[10px] font-medium"
            >
              {values.length}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-2">
        <div className="flex flex-col gap-0.5">
          {options.map((opt) => {
            const checked = values.includes(opt)
            return (
              <label
                key={opt}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => onToggle(opt)}
                  aria-label={renderLabel(opt)}
                />
                <span>{renderLabel(opt)}</span>
              </label>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function ProjectSelect({
  value,
  onChange,
}: {
  value: string | null
  onChange: (v: string | null) => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('h-8 border-dashed', value && 'border-primary/50 bg-primary/5')}
        >
          项目
          {value ? (
            <>
              <span
                aria-hidden
                className="mx-1.5 h-2 w-2 rounded-full"
                style={{ backgroundColor: projectById(value)?.color }}
              />
              <span className="max-w-[8rem] truncate text-xs">
                {projectById(value)?.name}
              </span>
            </>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-2">
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => onChange(null)}
            className={cn(
              'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent',
              value === null && 'bg-accent',
            )}
          >
            全部项目
          </button>
          {MOCK_PROJECTS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.id)}
              className={cn(
                'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent',
                value === p.id && 'bg-accent',
              )}
            >
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              <span className="truncate">{p.name}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function ActiveFilterChip({
  label,
  onRemove,
}: {
  label: string
  onRemove: () => void
}) {
  return (
    <Badge
      variant="secondary"
      className="gap-1 pl-2 pr-1 font-normal"
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="rounded p-0.5 hover:bg-background/50"
        aria-label={`移除 ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  )
}

function FilterBar({
  filters,
  setFilters,
  activeCount,
}: {
  filters: ListFiltersState
  setFilters: React.Dispatch<React.SetStateAction<ListFiltersState>>
  activeCount: number
}) {
  const toggleIn = (arr: string[], v: string): string[] =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]

  return (
    <div className="shrink-0 border-b border-border p-3 flex flex-col gap-2 bg-card/30">
      <div className="flex flex-wrap items-center gap-2">
        <ProjectSelect
          value={filters.project_id}
          onChange={(v) => setFilters((f) => ({ ...f, project_id: v, page: 1 }))}
        />
        <MultiSelectPopover
          label="状态"
          options={STATUS_OPTIONS}
          values={filters.status}
          onToggle={(v) =>
            setFilters((f) => ({ ...f, status: toggleIn(f.status, v), page: 1 }))
          }
          renderLabel={(v) => STATUS_LABEL[v as IssueStatus]}
        />
        <MultiSelectPopover
          label="优先级"
          options={PRIORITY_OPTIONS}
          values={filters.priority}
          onToggle={(v) =>
            setFilters((f) => ({ ...f, priority: toggleIn(f.priority, v), page: 1 }))
          }
          renderLabel={(v) => PRIORITY_SHORT[v as IssuePriority]}
        />

        <div className="relative ml-auto flex-1 min-w-0 max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            value={filters.q}
            onChange={(e) =>
              setFilters((f) => ({ ...f, q: e.target.value, page: 1 }))
            }
            placeholder="搜索标题…"
            className="pl-8 h-8"
            aria-label="搜索 issue 标题"
          />
        </div>

        {activeCount > 0 ? (
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            清除全部
          </button>
        ) : null}
      </div>

      {activeCount > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {filters.project_id ? (
            <ActiveFilterChip
              label={`项目：${projectById(filters.project_id)?.name}`}
              onRemove={() =>
                setFilters((f) => ({ ...f, project_id: null, page: 1 }))
              }
            />
          ) : null}
          {filters.status.map((s) => (
            <ActiveFilterChip
              key={s}
              label={`状态：${STATUS_LABEL[s as IssueStatus]}`}
              onRemove={() =>
                setFilters((f) => ({
                  ...f,
                  status: f.status.filter((x) => x !== s),
                  page: 1,
                }))
              }
            />
          ))}
          {filters.priority.map((p) => (
            <ActiveFilterChip
              key={p}
              label={`优先级：${PRIORITY_SHORT[p as IssuePriority]}`}
              onRemove={() =>
                setFilters((f) => ({
                  ...f,
                  priority: f.priority.filter((x) => x !== p),
                  page: 1,
                }))
              }
            />
          ))}
          {filters.q ? (
            <ActiveFilterChip
              label={`关键词：${filters.q}`}
              onRemove={() => setFilters((f) => ({ ...f, q: '', page: 1 }))}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// Table
// ────────────────────────────────────────────────────────────────

function SortableHeader({
  columnKey,
  label,
  sort,
  order,
  onSortClick,
  className,
}: {
  columnKey: SortKey
  label: string
  sort: SortKey
  order: 'asc' | 'desc'
  onSortClick: (k: SortKey) => void
  className?: string
}) {
  const active = sort === columnKey
  const ariaSort: React.AriaAttributes['aria-sort'] = active
    ? order === 'asc'
      ? 'ascending'
      : 'descending'
    : 'none'
  const Icon = active ? (order === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <TableHead className={className} aria-sort={ariaSort}>
      <button
        type="button"
        onClick={() => onSortClick(columnKey)}
        className={cn(
          'inline-flex items-center gap-1 text-xs font-medium hover:text-foreground transition-colors',
          active ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {label}
        <Icon className="h-3 w-3" />
      </button>
    </TableHead>
  )
}

function IssueTable({
  rows,
  filters,
  setFilters,
}: {
  rows: Issue[]
  filters: ListFiltersState
  setFilters: React.Dispatch<React.SetStateAction<ListFiltersState>>
}) {
  const onSortClick = (k: SortKey) => {
    setFilters((f) => {
      if (f.sort !== k) return { ...f, sort: k, order: 'asc', page: 1 }
      if (f.order === 'asc') return { ...f, order: 'desc', page: 1 }
      // 三态：desc → 回到默认（updated_at desc）
      return { ...f, sort: 'updated_at', order: 'desc', page: 1 }
    })
  }

  return (
    <>
      {/* desktop / tablet table */}
      <Table className="hidden md:table table-fixed">
        <TableHeader className="sticky top-0 z-20 bg-background shadow-[0_1px_0_0_hsl(var(--border))]">
          <TableRow>
            <SortableHeader
              columnKey="title"
              label="标题"
              sort={filters.sort}
              order={filters.order}
              onSortClick={onSortClick}
              className="w-[36%]"
            />
            <TableHead className="w-[12%] text-xs font-medium text-muted-foreground">
              项目
            </TableHead>
            <SortableHeader
              columnKey="status"
              label="状态"
              sort={filters.sort}
              order={filters.order}
              onSortClick={onSortClick}
              className="w-[10%]"
            />
            <SortableHeader
              columnKey="priority"
              label="优先级"
              sort={filters.sort}
              order={filters.order}
              onSortClick={onSortClick}
              className="w-[9%]"
            />
            <TableHead className="w-[15%] text-xs font-medium text-muted-foreground">
              标签
            </TableHead>
            <SortableHeader
              columnKey="due_date"
              label="到期"
              sort={filters.sort}
              order={filters.order}
              onSortClick={onSortClick}
              className="w-[9%]"
            />
            <SortableHeader
              columnKey="updated_at"
              label="更新时间"
              sort={filters.sort}
              order={filters.order}
              onSortClick={onSortClick}
              className="hidden lg:table-cell w-[9%]"
            />
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((issue) => (
            <TableRow key={issue.id} className="group">
              <TableCell className="min-w-0">
                <div className="flex items-start gap-2 min-w-0">
                  {issue.source === 'webhook' ? (
                    <WebhookIcon
                      className="h-3.5 w-3.5 shrink-0 mt-1 text-muted-foreground"
                      aria-label="webhook 来源"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{issue.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground md:hidden">
                      {labelsByIds(issue.label_ids).map((l) => l.name).join(' · ')}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <ProjectCell projectId={issue.project_id} />
              </TableCell>
              <TableCell>
                <StatusBadge status={issue.status} />
              </TableCell>
              <TableCell>
                <PriorityBadge priority={issue.priority} />
              </TableCell>
              <TableCell>
                <LabelChips labelIds={issue.label_ids} />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                {formatDate(issue.due_date)}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                {formatRelative(issue.updated_at)}
              </TableCell>
              <TableCell className="text-right">
                <RowActions />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* mobile card list */}
      <ul className="md:hidden flex flex-col divide-y divide-border">
        {rows.map((issue) => (
          <li key={issue.id} className="px-3 py-3 flex flex-col gap-1.5 group">
            <div className="flex items-start gap-2 min-w-0">
              {issue.source === 'webhook' ? (
                <WebhookIcon className="h-3.5 w-3.5 shrink-0 mt-1 text-muted-foreground" />
              ) : null}
              <p className="flex-1 min-w-0 text-sm font-medium line-clamp-2">
                {issue.title}
              </p>
              <RowActions />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status={issue.status} />
              <PriorityBadge priority={issue.priority} />
              <ProjectCell projectId={issue.project_id} />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <LabelChips labelIds={issue.label_ids} />
              <span className="tabular-nums">{formatDate(issue.due_date)}</span>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

// ────────────────────────────────────────────────────────────────
// Empty & Loading
// ────────────────────────────────────────────────────────────────

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Inbox className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{EMPTY_STATE_CONFIG.title}</p>
        <p className="text-xs text-muted-foreground">{EMPTY_STATE_CONFIG.desc}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onReset}>
        清除全部筛选
      </Button>
    </div>
  )
}

function LoadingRows({ count = 8 }: { count?: number }) {
  return (
    <Table className="hidden md:table table-fixed">
      <TableHeader className="sticky top-0 z-20 bg-background shadow-[0_1px_0_0_hsl(var(--border))]">
        <TableRow>
          <TableHead className="w-[36%] text-xs font-medium text-muted-foreground">
            标题
          </TableHead>
          <TableHead className="w-[12%] text-xs font-medium text-muted-foreground">
            项目
          </TableHead>
          <TableHead className="w-[10%] text-xs font-medium text-muted-foreground">
            状态
          </TableHead>
          <TableHead className="w-[9%] text-xs font-medium text-muted-foreground">
            优先级
          </TableHead>
          <TableHead className="w-[15%] text-xs font-medium text-muted-foreground">
            标签
          </TableHead>
          <TableHead className="w-[9%] text-xs font-medium text-muted-foreground">
            到期
          </TableHead>
          <TableHead className="hidden lg:table-cell w-[9%] text-xs font-medium text-muted-foreground">
            更新时间
          </TableHead>
          <TableHead className="w-8" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: count }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton className="h-4 w-3/4" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-20" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-14 rounded-full" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-10 rounded-full" />
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Skeleton className="h-5 w-14 rounded-md" />
                <Skeleton className="h-5 w-10 rounded-md" />
              </div>
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-16" />
            </TableCell>
            <TableCell className="hidden lg:table-cell">
              <Skeleton className="h-4 w-16" />
            </TableCell>
            <TableCell />
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// ────────────────────────────────────────────────────────────────
// Pagination
// ────────────────────────────────────────────────────────────────

function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  total: number
  page: number
  pageSize: number
  onPageChange: (p: number) => void
  onPageSizeChange: (s: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const canPrev = page > 1
  const canNext = page < totalPages
  return (
    <div className="shrink-0 border-t border-border p-3 flex flex-wrap items-center justify-between gap-2 bg-card/30">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>
          共 <span className="tabular-nums text-foreground font-medium">{total}</span> 条
        </span>
        <div className="flex items-center gap-1.5">
          <span>每页</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger className="h-7 w-[4.5rem]" aria-label="每页条数">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={!canPrev}
          onClick={() => onPageChange(1)}
          aria-label="首页"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
          aria-label="上一页"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-2 text-xs tabular-nums">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
          aria-label="下一页"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={!canNext}
          onClick={() => onPageChange(totalPages)}
          aria-label="末页"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────

interface ListPageProps {
  initialFilters?: Partial<ListFiltersState>
  loading?: boolean
  emptyOverride?: boolean
}

function ListPage({ initialFilters, loading = false, emptyOverride = false }: ListPageProps) {
  const [filters, setFilters] = React.useState<ListFiltersState>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  })

  const filtered = React.useMemo(
    () => (emptyOverride ? [] : filterIssues(LIST_ISSUES, filters)),
    [filters, emptyOverride],
  )
  const sorted = React.useMemo(
    () => sortIssues(filtered, filters.sort, filters.order),
    [filtered, filters.sort, filters.order],
  )
  const total = sorted.length
  const start = (filters.page - 1) * filters.page_size
  const rows = sorted.slice(start, start + filters.page_size)

  const activeCount =
    (filters.project_id ? 1 : 0) +
    filters.status.length +
    filters.priority.length +
    (filters.q ? 1 : 0)

  return (
    <AppShell activeNav="list" breadcrumb="全部项目">
      <section className="flex h-full flex-col overflow-hidden">
        <FilterBar filters={filters} setFilters={setFilters} activeCount={activeCount} />

        <div className="flex-1 min-h-0 overflow-hidden [&>div]:h-full [&>div]:min-h-0 [&>ul]:h-full [&>ul]:overflow-y-auto">
          {loading ? (
            <LoadingRows />
          ) : rows.length === 0 ? (
            <EmptyState onReset={() => setFilters(DEFAULT_FILTERS)} />
          ) : (
            <IssueTable rows={rows} filters={filters} setFilters={setFilters} />
          )}
        </div>

        {!loading && rows.length > 0 ? (
          <Pagination
            total={total}
            page={filters.page}
            pageSize={filters.page_size}
            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
            onPageSizeChange={(s) =>
              setFilters((f) => ({ ...f, page_size: s, page: 1 }))
            }
          />
        ) : null}
      </section>
    </AppShell>
  )
}

// ────────────────────────────────────────────────────────────────
// Storybook meta + stories
// ────────────────────────────────────────────────────────────────

const meta: Meta<typeof ListPage> = {
  title: 'issue-management / 列表',
  component: ListPage,
  parameters: {
    layout: 'fullscreen',
    msw: { handlers: listHandlers },
    viewport: { defaultViewport: 'laptop' },
  },
  tags: ['draft'],
}

export default meta
type Story = StoryObj<typeof ListPage>

// void: 引用未消费的常量以避免 tree-shake warning（labels 常量供后续 story 扩展用）。
void MOCK_LABELS
void SORTABLE_COLUMNS

export const v1: Story = {
  name: 'v1',
  args: {},
  tags: ['draft'],
}

export const WithFilters: Story = {
  name: 'WithFilters',
  args: {
    initialFilters: {
      project_id: 'proj_forge',
      status: ['todo', 'in_progress'],
    },
  },
  tags: ['draft'],
}

export const Empty: Story = {
  name: 'Empty',
  args: {
    initialFilters: {
      q: '不存在的关键词_xyz',
    },
    emptyOverride: true,
  },
  tags: ['draft'],
}

export const Loading: Story = {
  name: 'Loading',
  args: {
    loading: true,
  },
  tags: ['draft'],
}
