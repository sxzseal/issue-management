/**
 * LogsCard — 最近入站 webhook 请求日志（AC-075 / AC-076 / AC-078）
 *
 * 桌面端 Table：接收时间 / 来源 / 事件 ID (mono) / HTTP 状态 (Badge) / 错误摘要 / 关联 issue
 * 移动端（<md）：转为卡片流
 * 空态：图标 + 「暂无入站记录」+ 「查看文档 →」链接
 */
import { AlertCircle, Inbox } from 'lucide-react'
import { Link } from 'react-router'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { WebhookLog } from '@/lib/api-types'

interface LogsCardProps {
  logs: WebhookLog[]
}

const NONE = '—'
const EVENT_ID_MAX = 14

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
  )
}

function shortenEventId(id: string): string {
  if (id.length <= EVENT_ID_MAX) return id
  return `${id.slice(0, 8)}…${id.slice(-4)}`
}

interface StatusBadgeProps {
  status: number
}

function StatusBadge({ status }: StatusBadgeProps) {
  const kind: 'success' | 'client' | 'ratelimit' | 'validation' | 'server' | 'other' = (() => {
    if (status >= 200 && status < 300) return 'success'
    if (status === 429) return 'ratelimit'
    if (status === 422) return 'validation'
    if (status >= 400 && status < 500) return 'client'
    if (status >= 500) return 'server'
    return 'other'
  })()

  return (
    <Badge
      variant="outline"
      className={cn(
        'border-transparent font-mono text-[11px] tabular-nums',
        kind === 'success' &&
          'bg-[hsl(var(--feedback-success)/0.15)] text-[hsl(var(--feedback-success))]',
        kind === 'client' && 'bg-destructive/15 text-destructive dark:bg-destructive/25',
        kind === 'ratelimit' &&
          'bg-[hsl(var(--feedback-ratelimit)/0.15)] text-[hsl(var(--feedback-ratelimit))]',
        kind === 'validation' &&
          'bg-[hsl(var(--feedback-warning)/0.15)] text-[hsl(var(--feedback-warning))]',
        kind === 'server' &&
          'bg-destructive/20 text-destructive dark:bg-destructive/30',
        kind === 'other' && 'bg-muted text-muted-foreground'
      )}
    >
      {status}
    </Badge>
  )
}

interface LogsEmptyProps {
  className?: string
}

function LogsEmpty({ className }: LogsEmptyProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-12 text-center',
        className
      )}
    >
      <div className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Inbox className="h-5 w-5" />
      </div>
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">暂无入站记录</p>
        <p className="text-xs text-muted-foreground">
          外部 POST 一次即可在这里看到日志
        </p>
      </div>
      <a href="#docs" className="text-sm text-primary hover:underline">
        查看文档 →
      </a>
    </div>
  )
}

function LogsCardTable({ logs }: LogsCardProps) {
  return (
    <div className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[160px]">接收时间</TableHead>
            <TableHead className="w-[130px]">来源</TableHead>
            <TableHead className="w-[160px]">事件 ID</TableHead>
            <TableHead className="w-[72px]">HTTP</TableHead>
            <TableHead>错误摘要</TableHead>
            <TableHead>关联 issue</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground">
                {formatDateTime(log.received_at)}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="font-normal">
                  {log.source}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[8rem] truncate font-mono text-xs text-muted-foreground">
                {shortenEventId(log.event_id)}
              </TableCell>
              <TableCell>
                <StatusBadge status={log.http_status} />
              </TableCell>
              <TableCell className="max-w-[16rem] truncate text-sm text-muted-foreground">
                {log.error_summary ? (
                  <span className="inline-flex items-center gap-1 text-destructive">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{log.error_summary}</span>
                  </span>
                ) : (
                  NONE
                )}
              </TableCell>
              <TableCell>
                {log.issue_id ? (
                  <Link
                    to={`/issue/${log.issue_id}`}
                    className="inline-block max-w-[280px] truncate text-sm text-primary hover:underline"
                    title={log.issue_id}
                  >
                    #{log.issue_id.slice(0, 8)}
                  </Link>
                ) : (
                  <span className="text-sm text-muted-foreground">{NONE}</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function LogsCardMobile({ logs }: LogsCardProps) {
  return (
    <div className="flex flex-col gap-2 md:hidden">
      {logs.map((log) => (
        <div
          key={log.id}
          className="space-y-1.5 rounded-md border border-border bg-card p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {formatDateTime(log.received_at)}
            </span>
            <StatusBadge status={log.http_status} />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="secondary" className="font-normal">
              {log.source}
            </Badge>
            <span className="truncate font-mono text-muted-foreground">
              {shortenEventId(log.event_id)}
            </span>
          </div>
          {log.error_summary ? (
            <div className="inline-flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{log.error_summary}</span>
            </div>
          ) : log.issue_id ? (
            <Link
              to={`/issue/${log.issue_id}`}
              className="block truncate text-sm text-primary hover:underline"
            >
              #{log.issue_id.slice(0, 8)}
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground">{NONE}</span>
          )}
        </div>
      ))}
    </div>
  )
}

export function LogsCard({ logs }: LogsCardProps) {
  const isEmpty = logs.length === 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">最近入站</CardTitle>
        <CardDescription>最近 20 条 webhook 请求</CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <LogsEmpty />
        ) : (
          <>
            <LogsCardTable logs={logs} />
            <LogsCardMobile logs={logs} />
          </>
        )}
      </CardContent>
    </Card>
  )
}
