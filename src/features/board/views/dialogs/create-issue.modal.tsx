/**
 * CreateIssueModal — quick-create form (AC-011..AC-016).
 *
 * Renders as a shadcn Dialog on md+ and a bottom Sheet on <640px (AC-016).
 * Uses react-hook-form + zodResolver(createIssueBodySchema).
 *
 * NOTE: inline queries for /api/projects and /api/labels are kept minimal here
 * because features/projects and features/labels modules are not planned in v1
 * scope. See sa-T023 receipt deviations.
 */
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import type { z } from 'zod'
import { request } from '@/lib/request'
import type { Label as LabelType, Project, IssuePriority, IssueStatus } from '@/lib/api-types'
import {
  createIssueBodySchema,
  type CreateIssueBody,
} from '@/lib/validators/issue'
import { useCreateIssueMutation } from '../../mutations'

// Use the schema's *input* type for the form (optional fields with defaults)
// while the mutation payload uses the resolved *output* type (CreateIssueBody).
type CreateIssueFormInput = z.input<typeof createIssueBodySchema>

const PRIORITY_LABEL: Record<IssuePriority, string> = {
  p0: 'P0 · 紧急',
  p1: 'P1 · 高',
  p2: 'P2 · 中',
  p3: 'P3 · 低',
}

const projectsQueryOptions = queryOptions({
  queryKey: ['projects', 'list'] as const,
  queryFn: () => request<Project[]>('/api/projects'),
  staleTime: 60_000,
})

const labelsQueryOptions = queryOptions({
  queryKey: ['labels', 'list'] as const,
  queryFn: () => request<LabelType[]>('/api/labels'),
  staleTime: 60_000,
})

interface CreateIssueModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultStatus?: IssueStatus
}

function useMatchesMobile(query = '(max-width: 639px)'): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(query).matches
}

export function CreateIssueModal({
  open,
  onOpenChange,
  defaultStatus,
}: CreateIssueModalProps) {
  const projects = useQuery(projectsQueryOptions)
  const labels = useQuery(labelsQueryOptions)
  const mutation = useCreateIssueMutation()

  const form = useForm<CreateIssueFormInput>({
    resolver: zodResolver(createIssueBodySchema),
    defaultValues: {
      project_id: 'proj_inbox',
      title: '',
      body: '',
      status: defaultStatus ?? 'todo',
      priority: 'p2',
      label_ids: [],
      due_date: null,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        project_id: 'proj_inbox',
        title: '',
        body: '',
        status: defaultStatus ?? 'todo',
        priority: 'p2',
        label_ids: [],
        due_date: null,
      })
    }
  }, [open, defaultStatus, form])

  const selectedLabels = form.watch('label_ids') ?? []

  const submitting = mutation.isPending

  const onSubmit = (values: CreateIssueFormInput) => {
    const parsed: CreateIssueBody = createIssueBodySchema.parse(values)
    const payload: CreateIssueBody = {
      ...parsed,
      body: parsed.body ? parsed.body : null,
      due_date: parsed.due_date ? parsed.due_date : null,
    }
    mutation.mutate(payload, {
      onSuccess: () => {
        form.reset()
        onOpenChange(false)
      },
    })
  }

  const isMobile = useMatchesMobile()

  const body = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                标题<span className="ml-0.5 text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="例如：重构 issue 详情页 API 类型"
                  autoFocus
                  maxLength={200}
                  aria-invalid={!!form.formState.errors.title}
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
                    {(projects.data ?? []).map((p) => (
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
                    {(['p0', 'p1', 'p2', 'p3'] as const).map((p) => (
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
                  value={field.value ?? ''}
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
                      {(labels.data ?? []).map((label) => {
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
                      {(labels.data ?? []).length === 0 ? (
                        <p className="px-2 py-1 text-xs text-muted-foreground">
                          暂无标签
                        </p>
                      ) : null}
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
                  <Input
                    type="date"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value ? e.target.value : null)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {isMobile ? (
          <SheetFooter className="sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  创建中…
                </>
              ) : (
                '创建 issue'
              )}
            </Button>
          </SheetFooter>
        ) : (
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
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  创建中…
                </>
              ) : (
                '创建 issue'
              )}
            </Button>
          </DialogFooter>
        )}
      </form>
    </Form>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>新建 issue</SheetTitle>
            <SheetDescription>
              快捷录入卡片。标题必填，其他字段稍后可在详情页补齐。
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">{body}</div>
        </SheetContent>
      </Sheet>
    )
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
        {body}
      </DialogContent>
    </Dialog>
  )
}
