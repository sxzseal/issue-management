/**
 * issue-management / 看板视图（board）
 *
 * 覆盖 US-01 看板 + US-02 快速新建 弹层。
 */

import { useEffect, useMemo, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Toaster, toast } from 'sonner'
import {
  Plus,
  MoreHorizontal,
  KeyRound as KeyRoundIcon,
  Calendar as CalendarIcon,
  Archive,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { AppShell } from './_shared/AppShell'
import {
  type Issue,
  type IssueStatus,
  type IssuePriority,
  STATUS_LABEL,
  STATUS_ORDER,
  PRIORITY_LABEL,
  PRIORITY_SHORT,
  MOCK_PROJECTS,
  MOCK_LABELS,
  projectById,
  labelsByIds,
} from './_shared/domain'
import { boardHandlers } from '../../../mocks/handlers/board'
import { BOARD_ISSUES } from '../../../mocks/fixtures/board'
import {
  STATUS_ICON,
  STATUS_ICON_CLASS,
  PRIORITY_CHIP_CLASS,
  BOARD_VIEW_TABS,
} from './board.fixtures'

// ============================================================
// 工具函数
// ============================================================

const TODAY = '2026-07-13'

function isOverdue(due: string | null): boolean {
  if (!due) return false
  return due < TODAY
}
function isDueToday(due: string | null): boolean {
  return due === TODAY
}

function formatDue(due: string | null): string {
  if (!due) return ''
  if (isDueToday(due)) return '今天'
  if (isOverdue(due)) return `逾期 ${due.slice(5)}`
  return due.slice(5)
}

// ============================================================
// 卡片
// ============================================================

interface IssueCardProps {
  issue: Issue
  onCyclePriority?: (issue: Issue) => void
}

function IssueCard({ issue }: IssueCardProps) {
  const project = projectById(issue.project_id)
  const labels = labelsByIds(issue.label_ids)
  const shownLabels = labels.slice(0, 3)
  const remaining = labels.length - shownLabels.length
  const overdue = isOverdue(issue.due_date)
  const today = isDueToday(issue.due_date)

  return (
    <Card
      tabIndex={0}
      role="article"
      aria-label={`issue: ${issue.title}`}
      className={cn(
        'group relative cursor-pointer p-3 space-y-2 min-w-0',
        'transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus:outline-none',
      )}
    >
      {/* header: priority + menu */}
      <div className="flex items-start justify-between gap-2 min-w-0">
        <Badge
          variant="outline"
          className={cn(
            'h-5 px-1.5 text-[10px] font-mono font-semibold tabular-nums shrink-0',
            PRIORITY_CHIP_CLASS[issue.priority],
          )}
          aria-label={PRIORITY_LABEL[issue.priority]}
          title={PRIORITY_LABEL[issue.priority]}
        >
          {PRIORITY_SHORT[issue.priority]}
        </Badge>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          {issue.source === 'api' ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground"
                    aria-label="通过 API Token 创建"
                  >
                    <KeyRoundIcon className="h-3.5 w-3.5" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  来源：API Token{issue.source_name ? ` · ${issue.source_name}` : ''}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                aria-label="卡片操作"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem>复制链接</DropdownMenuItem>
              <DropdownMenuItem>
                <Archive className="mr-2 h-3.5 w-3.5" />
                归档
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* title */}
      <p className="text-sm font-medium leading-snug line-clamp-2 break-words">
        {issue.title}
      </p>

      {/* bottom row */}
      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
        {project ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground min-w-0 max-w-[8rem]">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <span className="truncate">{project.name}</span>
          </span>
        ) : null}

        {shownLabels.map((label) => (
          <span
            key={label.id}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground max-w-[6rem]"
            title={label.name}
          >
            <span
              aria-hidden
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: label.color }}
            />
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
            <CalendarIcon className="h-3 w-3" />
            {formatDue(issue.due_date)}
          </Badge>
        ) : null}
      </div>
    </Card>
  )
}

// ============================================================
// 列
// ============================================================

interface ColumnProps {
  status: IssueStatus
  issues: Issue[]
  onNewInColumn: (status: IssueStatus) => void
}

function BoardColumn({ status, issues, onNewInColumn }: ColumnProps) {
  const Icon = STATUS_ICON[status]
  return (
    <section
      aria-label={`${STATUS_LABEL[status]} 列`}
      className="flex flex-col min-h-0 min-w-0 rounded-lg border border-border bg-card/40"
    >
      <header className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Icon className={cn('h-4 w-4 shrink-0', STATUS_ICON_CLASS[status])} aria-hidden />
        <span className="text-sm font-medium">{STATUS_LABEL[status]}</span>
        <Badge
          variant="secondary"
          className="h-5 min-w-[1.25rem] justify-center px-1 text-[10px] tabular-nums"
        >
          {issues.length}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-6 w-6"
          aria-label={`在 ${STATUS_LABEL[status]} 列新建`}
          onClick={() => onNewInColumn(status)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </header>

      <div
        role="list"
        className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2"
      >
        {issues.length === 0 ? (
          <div className="grid h-32 place-items-center rounded-md border border-dashed border-border/60 text-xs text-muted-foreground text-center px-4">
            把卡片拖到这里
          </div>
        ) : (
          issues.map((issue) => (
            <div role="listitem" key={issue.id}>
              <IssueCard issue={issue} />
            </div>
          ))
        )}
      </div>
    </section>
  )
}

// ============================================================
// 新建 issue 弹层
// ============================================================

const newIssueSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, '请输入标题')
    .max(200, '标题最多 200 字符'),
  project_id: z.string().min(1),
  priority: z.enum(['p0', 'p1', 'p2', 'p3']),
  body: z.string().max(100_000).optional(),
  label_ids: z.array(z.string()).optional(),
  due_date: z.string().optional(),
})

type NewIssueForm = z.infer<typeof newIssueSchema>

interface NewIssueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultStatus?: IssueStatus
  defaultProjectId?: string
  onCreated?: () => void
}

function NewIssueDialog({
  open,
  onOpenChange,
  defaultStatus,
  defaultProjectId = 'proj_inbox',
  onCreated,
}: NewIssueDialogProps) {
  const form = useForm<NewIssueForm>({
    resolver: zodResolver(newIssueSchema),
    defaultValues: {
      title: '',
      project_id: defaultProjectId,
      priority: 'p2',
      body: '',
      label_ids: [],
      due_date: '',
    },
  })

  const [submitting, setSubmitting] = useState(false)
  const selectedLabels = form.watch('label_ids') ?? []

  const onSubmit = async (values: NewIssueForm) => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          status: defaultStatus ?? 'todo',
          due_date: values.due_date ? values.due_date : null,
        }),
      })
      const json = (await res.json()) as { status_code: number; message?: string }
      if (json.status_code === 0) {
        toast.success('已创建 issue')
        form.reset()
        onOpenChange(false)
        onCreated?.()
      } else {
        toast.error(json.message ?? '创建失败')
      }
    } catch {
      toast.error('网络异常，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>新建 issue</DialogTitle>
          <DialogDescription>
            快捷录入卡片。标题必填，其他字段稍后可在详情页补齐。
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>标题</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：重构 issue 详情页 API 类型" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>项目</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择项目" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MOCK_PROJECTS.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="inline-flex items-center gap-2">
                              <span
                                aria-hidden
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: p.color }}
                              />
                              {p.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>优先级</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(['p0', 'p1', 'p2', 'p3'] as IssuePriority[]).map((p) => (
                          <SelectItem key={p} value={p}>
                            {PRIORITY_LABEL[p]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>描述（可选，Markdown）</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="补充上下文、验收条件、链接…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="label_ids"
                render={() => (
                  <FormItem>
                    <FormLabel>标签</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between font-normal"
                          type="button"
                        >
                          {selectedLabels.length === 0
                            ? '选择标签'
                            : `${selectedLabels.length} 个已选`}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2" align="start">
                        <div className="space-y-1">
                          {MOCK_LABELS.map((label) => {
                            const checked = selectedLabels.includes(label.id)
                            return (
                              <label
                                key={label.id}
                                className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent cursor-pointer"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) => {
                                    const next = v
                                      ? [...selectedLabels, label.id]
                                      : selectedLabels.filter((id) => id !== label.id)
                                    form.setValue('label_ids', next, { shouldDirty: true })
                                  }}
                                />
                                <span
                                  aria-hidden
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: label.color }}
                                />
                                <span>{label.name}</span>
                              </label>
                            )
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>截止日期</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? '创建中…' : '创建 issue'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// 看板视图
// ============================================================

interface BoardViewProps {
  /** 初始就打开新建弹层（用于 story 展示） */
  initialDialogOpen?: boolean
  /** 演示"已完成"列为空 —— 过滤掉 done 数据 */
  hideDone?: boolean
}

function BoardView({ initialDialogOpen = false, hideDone = false }: BoardViewProps) {
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(initialDialogOpen)
  const [dialogStatus, setDialogStatus] = useState<IssueStatus | undefined>(undefined)

  const fetchIssues = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/issues')
      const json = (await res.json()) as {
        status_code: number
        data: { list: Issue[] }
      }
      if (json.status_code === 0) {
        const list = hideDone ? json.data.list.filter((i) => i.status !== 'done') : json.data.list
        setIssues(list)
      }
    } catch {
      // ignore in prototype
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIssues()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hideDone])

  const grouped = useMemo(() => {
    const map: Record<IssueStatus, Issue[]> = {
      todo: [],
      in_progress: [],
      done: [],
      archived: [],
    }
    for (const issue of issues) {
      map[issue.status].push(issue)
    }
    return map
  }, [issues])

  const openDialog = (status?: IssueStatus) => {
    setDialogStatus(status)
    setDialogOpen(true)
  }

  return (
    <AppShell
      activeNav="board"
      activeProjectId="proj_forge"
      breadcrumb="ai-forge"
      onNewIssue={() => openDialog()}
    >
      <div className="flex h-full flex-col overflow-hidden">
        {/* 顶部 toolbar */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-2.5 shrink-0">
          <Tabs defaultValue="board">
            <TabsList className="h-8">
              {BOARD_VIEW_TABS.map((t) => (
                <TabsTrigger key={t.key} value={t.key} className="h-7 text-xs">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="h-6 gap-1 font-normal">
              项目：ai-forge
            </Badge>
            <Badge variant="outline" className="h-6 gap-1 font-normal">
              标签：全部
            </Badge>
          </div>

          <div className="ml-auto text-xs text-muted-foreground tabular-nums">
            共 {issues.length} 条
          </div>
        </div>

        {/* 4 列看板 */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="grid h-full grid-cols-1 gap-3 p-4 md:grid-cols-2 lg:grid-cols-4">
            {STATUS_ORDER.map((status) => (
              <BoardColumn
                key={status}
                status={status}
                issues={grouped[status]}
                onNewInColumn={(s) => openDialog(s)}
              />
            ))}
          </div>
        </div>

        {loading ? null : null}
      </div>

      <NewIssueDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultStatus={dialogStatus}
        onCreated={fetchIssues}
      />

      <Toaster position="bottom-right" richColors />
    </AppShell>
  )
}

// ============================================================
// Stories
// ============================================================

const meta: Meta<typeof BoardView> = {
  title: 'issue-management / 看板',
  component: BoardView,
  parameters: {
    layout: 'fullscreen',
    msw: { handlers: boardHandlers },
    viewport: { defaultViewport: 'laptop' },
  },
}

export default meta
type Story = StoryObj<typeof BoardView>

/** 默认看板：4 列均有数据，覆盖 US-01 完整视觉。 */
export const v1: Story = {
  tags: ['draft'],
  args: {},
}

/** 打开新建弹层：覆盖 US-02 快速录入。 */
export const WithCreateDialog: Story = {
  tags: ['draft'],
  args: {
    initialDialogOpen: true,
  },
}

/** 已完成列为空：验证列空态"把卡片拖到这里"提示。 */
export const EmptyDone: Story = {
  tags: ['draft'],
  args: {
    hideDone: true,
  },
}

// 保留 BOARD_ISSUES 引用避免 unused warning（fixture 由 msw handler 提供数据）
void BOARD_ISSUES
