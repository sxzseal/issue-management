import type { Meta, StoryObj } from '@storybook/react'
import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  FileText,
  Globe,
  Link as LinkIcon,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Send,
  Trash2,
  KeyRound,
  X,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { AppShell } from './_shared/AppShell'
import {
  PRIORITY_LABEL,
  PRIORITY_ORDER,
  PRIORITY_SHORT,
  SOURCE_LABEL,
  STATUS_LABEL,
  STATUS_ORDER,
  labelsByIds,
  projectById,
  type Comment,
  type Issue,
  type IssuePriority,
  type IssueStatus,
} from './_shared/domain'
import {
  ACTIVITY_ICON,
  ACTIVITY_LOG,
  ACTIVITY_VERB,
  ATTACHMENT_STUB_TEXT,
  COMMENT_PLACEHOLDER,
  COMMENT_TABS,
  COMMENT_TAB_LABEL,
  DETAIL_ACTIONS,
  DETAIL_COMMENTS,
  DETAIL_ISSUE,
  NOT_FOUND_COPY,
  NOT_FOUND_ID,
  SIDE_LABELS,
  formatDate,
  relativeTime,
  renderMarkdown,
} from './issue-detail.fixtures'
import { issueDetailHandlers } from '../../../mocks/handlers/issue-detail'

/* -----------------------------------------------------------------------------
 * 状态色调（与 board / list 保持一致）
 * -------------------------------------------------------------------------- */

const STATUS_TONE: Record<IssueStatus, string> = {
  todo: 'bg-muted text-muted-foreground',
  in_progress: 'bg-primary/10 text-primary',
  done: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  archived: 'bg-muted/60 text-muted-foreground',
}

const PRIORITY_TONE: Record<IssuePriority, string> = {
  p0: 'bg-destructive/10 text-destructive',
  p1: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  p2: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  p3: 'bg-muted text-muted-foreground',
}

/* -----------------------------------------------------------------------------
 * 顶部 action bar
 * -------------------------------------------------------------------------- */

interface ActionBarProps {
  issueId: string
  archived: boolean
}

function ActionBar({ issueId, archived }: ActionBarProps) {
  const [copied, setCopied] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const onCopy = () => {
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card/40 px-4">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 h-8 gap-1 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">返回列表</span>
      </Button>
      <Separator orientation="vertical" className="h-5" />
      <span className="truncate font-mono text-xs text-muted-foreground">
        #{issueId}
      </span>

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5"
          onClick={onCopy}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              {DETAIL_ACTIONS.copyLinkDone}
            </>
          ) : (
            <>
              <LinkIcon className="h-3.5 w-3.5" />
              {DETAIL_ACTIONS.copyLink}
            </>
          )}
        </Button>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5">
          <Paperclip className="h-3.5 w-3.5" />
          {archived ? DETAIL_ACTIONS.unarchive : DETAIL_ACTIONS.archive}
        </Button>
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {DETAIL_ACTIONS.delete}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{DETAIL_ACTIONS.deleteConfirmTitle}</DialogTitle>
              <DialogDescription>
                {DETAIL_ACTIONS.deleteConfirmBody}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                {DETAIL_ACTIONS.deleteConfirmCancel}
              </Button>
              <Button
                variant="destructive"
                onClick={() => setDeleteOpen(false)}
              >
                {DETAIL_ACTIONS.deleteConfirmOk}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

/* -----------------------------------------------------------------------------
 * 标题（点击编辑）
 * -------------------------------------------------------------------------- */

interface EditableTitleProps {
  value: string
}

function EditableTitle({ value }: EditableTitleProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (!editing) {
    return (
      <div className="group flex items-start gap-2">
        <h1 className="min-w-0 flex-1 text-2xl font-semibold leading-tight tracking-tight">
          {value}
        </h1>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => setEditing(true)}
              aria-label={DETAIL_ACTIONS.editTitleTooltip}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {DETAIL_ACTIONS.editTitleTooltip}
          </TooltipContent>
        </Tooltip>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2">
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="h-10 flex-1 text-lg font-semibold"
      />
      <Button
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={() => setEditing(false)}
      >
        <Check className="h-4 w-4" />
        <span className="sr-only">{DETAIL_ACTIONS.saveTitle}</span>
      </Button>
      <Button
        size="icon"
        variant="outline"
        className="h-9 w-9 shrink-0"
        onClick={() => {
          setDraft(value)
          setEditing(false)
        }}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">{DETAIL_ACTIONS.cancelTitle}</span>
      </Button>
    </div>
  )
}

/* -----------------------------------------------------------------------------
 * Meta 行
 * -------------------------------------------------------------------------- */

function MetaRow({ issue }: { issue: Issue }) {
  const SourceIcon = issue.source === 'api' ? KeyRound : Globe
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
      <span className="font-mono text-xs">#{issue.id}</span>
      <span aria-hidden>·</span>
      <span>创建于 {formatDate(issue.created_at)}</span>
      <span aria-hidden>·</span>
      <span>更新 {relativeTime(issue.updated_at)}</span>
      <span aria-hidden>·</span>
      <span className="inline-flex items-center gap-1">
        <SourceIcon className="h-3.5 w-3.5" />
        {SOURCE_LABEL[issue.source]}
      </span>
      {issue.source_name ? (
        <>
          <span aria-hidden>·</span>
          <span className="truncate font-mono text-xs">
            {issue.source_name}
          </span>
        </>
      ) : null}
    </div>
  )
}

/* -----------------------------------------------------------------------------
 * Body Markdown 区
 * -------------------------------------------------------------------------- */

function BodyMarkdown({ md }: { md: string }) {
  const html = useMemo(() => renderMarkdown(md), [md])
  return (
    <article
      className={cn(
        'prose prose-sm dark:prose-invert mt-6 max-w-none',
        '[&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight',
        '[&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold',
        '[&_p]:my-3 [&_p]:leading-relaxed [&_p]:text-foreground/90',
        '[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6',
        '[&_li]:my-1 [&_li]:leading-relaxed',
        '[&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:bg-muted/30 [&_blockquote]:px-4 [&_blockquote]:py-2 [&_blockquote]:text-muted-foreground',
        '[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm',
        '[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-1.5',
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

/* -----------------------------------------------------------------------------
 * 评论列表 + 单条
 * -------------------------------------------------------------------------- */

function CommentItem({ comment }: { comment: Comment }) {
  return (
    <div className="group relative rounded-lg border border-l-4 border-border border-l-primary/60 bg-primary/[0.03] p-4 dark:bg-primary/[0.06]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <div className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
            我
          </div>
          <span className="font-medium">me</span>
          <Badge
            variant="secondary"
            className="h-4 px-1.5 text-[10px] font-normal text-muted-foreground"
          >
            作者
          </Badge>
          <span className="text-muted-foreground">·</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground">
                {relativeTime(comment.created_at)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              {comment.created_at.replace('T', ' ').slice(0, 16)}
            </TooltipContent>
          </Tooltip>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="更多"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              编辑
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
        {comment.body}
      </div>
    </div>
  )
}

function CommentsList({ comments }: { comments: Comment[] }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-semibold">评论 · {comments.length}</h2>
        <Separator className="flex-1" />
      </div>
      <div className="flex flex-col gap-3">
        {comments.map((c) => (
          <CommentItem key={c.id} comment={c} />
        ))}
      </div>
    </section>
  )
}

/* -----------------------------------------------------------------------------
 * 评论输入区（Tabs 编辑 / 预览 + Cmd/Ctrl+Enter 提交）
 * -------------------------------------------------------------------------- */

function CommentComposer() {
  const [tab, setTab] = useState<string>(COMMENT_TABS.edit)
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const previewHtml = useMemo(() => {
    if (!draft.trim())
      return '<p class="text-muted-foreground">还没有内容可预览。</p>'
    return renderMarkdown(draft)
  }, [draft])

  const submit = () => {
    if (!draft.trim() || submitting) return
    setSubmitting(true)
    window.setTimeout(() => {
      setDraft('')
      setSubmitting(false)
      setTab(COMMENT_TABS.edit)
    }, 400)
  }

  return (
    <div className="shrink-0 border-t border-border bg-background px-6 py-4">
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between gap-2">
          <TabsList className="h-8">
            <TabsTrigger value={COMMENT_TABS.edit} className="h-6 px-3 text-xs">
              {COMMENT_TAB_LABEL.edit}
            </TabsTrigger>
            <TabsTrigger
              value={COMMENT_TABS.preview}
              className="h-6 px-3 text-xs"
            >
              {COMMENT_TAB_LABEL.preview}
            </TabsTrigger>
          </TabsList>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                  aria-label={SIDE_LABELS.attachmentTitle}
                >
                  <Paperclip className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{ATTACHMENT_STUB_TEXT}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <TabsContent value={COMMENT_TABS.edit} className="mt-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                submit()
              }
            }}
            placeholder={COMMENT_PLACEHOLDER}
            className="min-h-24 resize-none"
          />
        </TabsContent>
        <TabsContent value={COMMENT_TABS.preview} className="mt-2">
          <article
            className={cn(
              'prose prose-sm dark:prose-invert min-h-24 max-w-none rounded-md border border-border bg-card p-3',
              '[&_p]:my-2 [&_p]:leading-relaxed',
              '[&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6',
            )}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </TabsContent>
      </Tabs>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          Cmd/Ctrl + Enter 提交 · 支持 Markdown
        </span>
        <Button
          size="sm"
          className="h-8 gap-1.5"
          disabled={!draft.trim() || submitting}
          onClick={submit}
        >
          <Send className="h-3.5 w-3.5" />
          {submitting ? DETAIL_ACTIONS.publishing : DETAIL_ACTIONS.publish}
        </Button>
      </div>
    </div>
  )
}

/* -----------------------------------------------------------------------------
 * 右栏属性卡
 * -------------------------------------------------------------------------- */

function SideCard({
  title,
  children,
  action,
}: {
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
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

function StatusCard({ status }: { status: IssueStatus }) {
  const [value, setValue] = useState<IssueStatus>(status)
  return (
    <SideCard title={SIDE_LABELS.status}>
      <Select value={value} onValueChange={(v) => setValue(v as IssueStatus)}>
        <SelectTrigger className="h-9 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_ORDER.map((s) => (
            <SelectItem key={s} value={s}>
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden
                  className={cn(
                    'h-2 w-2 rounded-full',
                    STATUS_TONE[s].split(' ')[0],
                  )}
                />
                {STATUS_LABEL[s]}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SideCard>
  )
}

function PriorityCard({ priority }: { priority: IssuePriority }) {
  const [value, setValue] = useState<IssuePriority>(priority)
  return (
    <SideCard title={SIDE_LABELS.priority}>
      <Select value={value} onValueChange={(v) => setValue(v as IssuePriority)}>
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
                  {PRIORITY_SHORT[p]}
                </Badge>
                {PRIORITY_LABEL[p]}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SideCard>
  )
}

function ProjectCard({ projectId }: { projectId: string }) {
  const proj = projectById(projectId)
  return (
    <SideCard
      title={SIDE_LABELS.project}
      action={
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-xs text-muted-foreground"
        >
          {SIDE_LABELS.change}
        </Button>
      }
    >
      <div className="flex items-center gap-2">
        {proj ? (
          <>
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: proj.color }}
            />
            <span className="text-sm">{proj.name}</span>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">未指定</span>
        )}
      </div>
    </SideCard>
  )
}

function LabelsCard({ labelIds }: { labelIds: string[] }) {
  const labels = labelsByIds(labelIds)
  return (
    <SideCard
      title={SIDE_LABELS.labels}
      action={
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-xs text-muted-foreground"
        >
          {SIDE_LABELS.addLabel}
        </Button>
      }
    >
      <div className="flex flex-wrap gap-1.5">
        {labels.length === 0 ? (
          <span className="text-xs text-muted-foreground">未设置</span>
        ) : (
          labels.map((l) => (
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

function DueDateCard({ dueDate }: { dueDate: string | null }) {
  const [value, setValue] = useState(dueDate ?? '')
  return (
    <SideCard title={SIDE_LABELS.dueDate}>
      <div className="relative">
        <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-9 pl-8"
        />
      </div>
      {!value ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {SIDE_LABELS.noDueDate}
        </p>
      ) : null}
    </SideCard>
  )
}

function ActivityCard() {
  return (
    <SideCard title={SIDE_LABELS.activity}>
      <ol className="relative ml-2 border-l border-border pl-4">
        {ACTIVITY_LOG.map((entry) => {
          const Icon = ACTIVITY_ICON[entry.kind]
          return (
            <li key={entry.id} className="relative mb-3 last:mb-0">
              <span
                aria-hidden
                className="absolute -left-[1.35rem] top-0.5 grid h-4 w-4 place-items-center rounded-full border border-border bg-background"
              >
                <Icon className="h-2.5 w-2.5 text-muted-foreground" />
              </span>
              <div className="text-xs leading-relaxed text-foreground/90">
                <span className="font-medium">{ACTIVITY_VERB[entry.kind]}</span>{' '}
                <span className="text-muted-foreground">
                  {entry.from} → {entry.to}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-2.5 w-2.5" />
                {relativeTime(entry.at)}
              </div>
            </li>
          )
        })}
      </ol>
    </SideCard>
  )
}

/* -----------------------------------------------------------------------------
 * 页面容器
 * -------------------------------------------------------------------------- */

function DetailPage({
  issue,
  comments,
}: {
  issue: Issue & { body_full: string }
  comments: Comment[]
}) {
  return (
    <TooltipProvider>
      <div className="flex h-full flex-col overflow-hidden">
        <ActionBar issueId={issue.id} archived={issue.status === 'archived'} />
        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4 pt-6">
              <EditableTitle value={issue.title} />
              <MetaRow issue={issue} />
              <BodyMarkdown md={issue.body_full} />
              <CommentsList comments={comments} />
            </div>
            <CommentComposer />
          </div>
          <aside className="hidden shrink-0 overflow-y-auto border-l border-border bg-card/30 p-4 lg:block lg:w-80">
            <div className="space-y-3">
              <StatusCard status={issue.status} />
              <PriorityCard priority={issue.priority} />
              <ProjectCard projectId={issue.project_id} />
              <LabelsCard labelIds={issue.label_ids} />
              <DueDateCard dueDate={issue.due_date} />
              <ActivityCard />
            </div>
          </aside>
        </div>
      </div>
    </TooltipProvider>
  )
}

/* -----------------------------------------------------------------------------
 * Loading 骨架
 * -------------------------------------------------------------------------- */

function LoadingPage() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card/40 px-4">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="ml-auto h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 space-y-4 overflow-y-auto p-6">
          <Skeleton className="h-8 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="space-y-2 pt-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
          <div className="space-y-3 pt-6">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        </div>
        <aside className="hidden shrink-0 space-y-3 overflow-y-auto border-l border-border bg-card/30 p-4 lg:block lg:w-80">
          <Skeleton className="h-20 w-full rounded-md" />
          <Skeleton className="h-20 w-full rounded-md" />
          <Skeleton className="h-20 w-full rounded-md" />
          <Skeleton className="h-32 w-full rounded-md" />
        </aside>
      </div>
    </div>
  )
}

/* -----------------------------------------------------------------------------
 * NotFound 空态
 * -------------------------------------------------------------------------- */

function NotFoundPage() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card/40 px-4">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 h-8 gap-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-muted text-muted-foreground">
            <FileText className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">{NOT_FOUND_COPY.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {NOT_FOUND_COPY.hint}
          </p>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            id: {NOT_FOUND_ID}
          </p>
          <Button className="mt-5 gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            {NOT_FOUND_COPY.backToList}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* -----------------------------------------------------------------------------
 * Storybook meta
 * -------------------------------------------------------------------------- */

// 仅供 stories 内部使用，避免未使用 import 告警
const meta: Meta = {
  title: 'issue-management / 详情',
  parameters: {
    layout: 'fullscreen',
    msw: { handlers: issueDetailHandlers },
    viewport: { defaultViewport: 'laptop' },
  },
}

export default meta

type Story = StoryObj

export const v1: Story = {
  name: 'v1',
  tags: ['draft'],
  render: () => (
    <AppShell
      activeNav="board"
      activeProjectId="proj_forge"
      breadcrumb="ai-forge / issue #42"
    >
      <DetailPage issue={DETAIL_ISSUE} comments={DETAIL_COMMENTS} />
    </AppShell>
  ),
}

export const Loading: Story = {
  name: 'Loading',
  tags: ['draft'],
  render: () => (
    <AppShell
      activeNav="board"
      activeProjectId="proj_forge"
      breadcrumb="ai-forge / issue #42"
    >
      <LoadingPage />
    </AppShell>
  ),
}

export const NotFound: Story = {
  name: 'NotFound',
  tags: ['draft'],
  render: () => (
    <AppShell
      activeNav="board"
      activeProjectId="proj_forge"
      breadcrumb="ai-forge / 未找到"
    >
      <NotFoundPage />
    </AppShell>
  ),
}
