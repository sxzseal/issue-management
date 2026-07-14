/**
 * IssueTableRow — desktop / tablet row body cells. Row activation navigates
 * to /issue/:id (click on non-interactive cells, or Enter/Space when the row
 * has keyboard focus). Delete lives under a hover-revealed dropdown; a small
 * inline dialog confirms before firing the mutation.
 */
import { useState, type MouseEvent, type KeyboardEvent } from 'react'
import { MoreHorizontal, Webhook as WebhookIcon } from 'lucide-react'
import type { Issue, Label } from '@/lib/api-types'
import { TableCell, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useDeleteIssueMutation } from '../mutations'
import {
  PRIORITY_CLASS,
  PRIORITY_LABEL,
  STATUS_CLASS,
  STATUS_LABEL,
} from '../status-visuals'

interface IssueTableRowProps {
  issue: Issue
  onActivate: (id: string) => void
}

/** Cheap relative formatter — no date-fns dependency. */
function formatRelative(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return iso.slice(0, 10)
  const diffSec = Math.max(0, Math.round((now - then) / 1000))
  if (diffSec < 60) return '刚刚'
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin} 分钟前`
  const diffHour = Math.round(diffMin / 60)
  if (diffHour < 24) return `${diffHour} 小时前`
  const diffDay = Math.round(diffHour / 24)
  if (diffDay < 7) return `${diffDay} 天前`
  return iso.slice(0, 10)
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return iso.slice(0, 10)
}

function LabelChips({ labels }: { labels: Label[] }) {
  if (labels.length === 0) return <span className="text-xs text-muted-foreground">—</span>
  const visible = labels.slice(0, 3)
  const extra = labels.length - visible.length
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((l) => (
        <span
          key={l.id}
          className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-1.5 py-0.5 text-[11px]"
        >
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: l.color }}
          />
          <span className="max-w-[6rem] truncate">{l.name}</span>
        </span>
      ))}
      {extra > 0 && <span className="text-[11px] text-muted-foreground">+{extra}</span>}
    </div>
  )
}

export function IssueTableRow({ issue, onActivate }: IssueTableRowProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const deleteMutation = useDeleteIssueMutation()

  const handleRowClick = (e: MouseEvent<HTMLTableRowElement>) => {
    // Ignore clicks that originated in an interactive descendant.
    const target = e.target as HTMLElement
    if (target.closest('button, a, [role="menu"], [data-no-row-activate]')) return
    onActivate(issue.id)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onActivate(issue.id)
    }
  }

  const handleDeleteConfirm = () => {
    deleteMutation.mutate(issue.id, {
      onSettled: () => setConfirmOpen(false),
    })
  }

  return (
    <>
      <TableRow
        role="link"
        tabIndex={0}
        aria-label={`打开 issue ${issue.title}`}
        className="group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={handleRowClick}
        onKeyDown={handleKeyDown}
      >
        <TableCell className="min-w-0">
          <div className="flex items-start gap-2 min-w-0">
            {issue.source === 'webhook' && (
              <WebhookIcon
                className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                aria-label="webhook 来源"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{issue.title}</p>
              {/* 768-1023: labels 合并到标题下方 */}
              <p className="mt-0.5 truncate text-xs text-muted-foreground lg:hidden">
                {issue.labels.map((l) => l.name).join(' · ') || '—'}
              </p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/60"
            />
            <span className="truncate text-xs text-muted-foreground">
              {issue.project_id}
            </span>
          </div>
        </TableCell>
        <TableCell>
          <Badge
            variant="outline"
            className={cn('whitespace-nowrap font-normal', STATUS_CLASS[issue.status])}
          >
            {STATUS_LABEL[issue.status]}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge
            variant="outline"
            className={cn(
              'whitespace-nowrap font-medium tabular-nums',
              PRIORITY_CLASS[issue.priority]
            )}
          >
            {PRIORITY_LABEL[issue.priority]}
          </Badge>
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          <LabelChips labels={issue.labels} />
        </TableCell>
        <TableCell className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
          {formatDate(issue.due_date)}
        </TableCell>
        <TableCell className="hidden lg:table-cell whitespace-nowrap text-xs text-muted-foreground tabular-nums">
          {formatRelative(issue.updated_at)}
        </TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-no-row-activate
                className="h-7 w-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                aria-label="更多操作"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={(e) => {
                  e.preventDefault()
                  setConfirmOpen(true)
                }}
              >
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          className="sm:max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>删除 issue?</DialogTitle>
            <DialogDescription>
              「{issue.title}」将被删除，此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={deleteMutation.isPending}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? '删除中…' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
