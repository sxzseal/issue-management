import type { Meta, StoryObj } from '@storybook/react'
import { useEffect, useState } from 'react'
import {
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  Inbox,
  Loader2,
  RefreshCw,
  Webhook,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

import { webhookSettingsHandlers } from '../../../mocks/handlers/webhook-settings'
import { AppShell } from './_shared/AppShell'
import {
  CURL_EXAMPLE,
  EMPTY_LOGS,
  NODE_EXAMPLE,
  PYTHON_EXAMPLE,
  SECRET_MASKED,
  WEBHOOK_ENDPOINT_URL,
  WEBHOOK_LOGS,
  WEBHOOK_MESSAGES,
  type WebhookLog,
} from './webhook-settings.fixtures'
import './_shared/theme.css'

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
    d.getUTCDate(),
  )} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

function shortenEventId(id: string): string {
  if (id.length <= 14) return id
  return `${id.slice(0, 8)}…${id.slice(-4)}`
}

function StatusBadge({ status }: { status: number }) {
  const isSuccess = status >= 200 && status < 300
  const is403 = status === 403
  const is429 = status === 429
  const is422 = status === 422

  const styles = cn(
    'font-mono text-[11px] tabular-nums',
    isSuccess &&
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-transparent',
    is403 &&
      'bg-destructive/15 text-destructive dark:bg-destructive/25 dark:text-destructive border-transparent',
    is429 &&
      'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 border-transparent',
    is422 &&
      'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 border-transparent',
  )

  return (
    <Badge variant="outline" className={styles}>
      {status}
    </Badge>
  )
}

interface CopyButtonProps {
  label?: string
  onConfirm?: () => void
  requireConfirm?: boolean
}

function CopyButton({
  label = WEBHOOK_MESSAGES.copy,
  onConfirm,
  requireConfirm = false,
}: CopyButtonProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const doCopy = () => {
    setCopied(true)
    onConfirm?.()
    window.setTimeout(() => setCopied(false), 1400)
  }

  if (!requireConfirm) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={doCopy}
        className="gap-1.5"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        {copied ? '已复制' : label}
      </Button>
    )
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        {copied ? '已复制' : label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{WEBHOOK_MESSAGES.copyConfirmTitle}</DialogTitle>
            <DialogDescription>
              {WEBHOOK_MESSAGES.copyConfirmDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {WEBHOOK_MESSAGES.cancel}
            </Button>
            <Button
              onClick={() => {
                setOpen(false)
                doCopy()
              }}
            >
              {WEBHOOK_MESSAGES.copyConfirmAction}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function RotateSecretButton() {
  const [open, setOpen] = useState(false)
  const [rotating, setRotating] = useState(false)

  const doRotate = async () => {
    setRotating(true)
    try {
      await fetch('/api/settings/webhooks/rotate-secret', { method: 'POST' })
    } catch {
      // 原型无需处理
    } finally {
      setRotating(false)
      setOpen(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <RefreshCw className="h-3.5 w-3.5" />
        {WEBHOOK_MESSAGES.rotate}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{WEBHOOK_MESSAGES.rotateConfirmTitle}</DialogTitle>
            <DialogDescription>
              {WEBHOOK_MESSAGES.rotateConfirmDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={rotating}
            >
              {WEBHOOK_MESSAGES.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={doRotate}
              disabled={rotating}
              className="gap-1.5"
            >
              {rotating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {WEBHOOK_MESSAGES.rotateConfirmAction}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function IntroCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            <Webhook className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">
              {WEBHOOK_MESSAGES.pageTitle}
            </CardTitle>
            <CardDescription className="mt-1">
              {WEBHOOK_MESSAGES.pageDescription}
            </CardDescription>
          </div>
          <a
            href="#docs"
            className={cn(
              'inline-flex items-center gap-1 text-sm text-primary hover:underline shrink-0',
            )}
          >
            {WEBHOOK_MESSAGES.viewDocs}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </CardHeader>
    </Card>
  )
}

function EndpointCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {WEBHOOK_MESSAGES.endpointTitle}
        </CardTitle>
        <CardDescription>
          {WEBHOOK_MESSAGES.endpointDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <code
            className={cn(
              'flex-1 min-w-0 rounded-md border border-input bg-muted px-3 py-2',
              'font-mono text-xs text-muted-foreground overflow-x-auto whitespace-nowrap',
            )}
          >
            {WEBHOOK_ENDPOINT_URL}
          </code>
          <CopyButton />
        </div>
      </CardContent>
    </Card>
  )
}

function SecretCard({ secretMasked }: { secretMasked: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {WEBHOOK_MESSAGES.secretTitle}
        </CardTitle>
        <CardDescription>{WEBHOOK_MESSAGES.secretDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <code
            className={cn(
              'flex-1 min-w-0 rounded-md border border-input bg-muted px-3 py-2',
              'font-mono text-xs text-muted-foreground overflow-x-auto whitespace-nowrap',
            )}
          >
            {secretMasked}
          </code>
          <div className="flex items-center gap-2">
            <CopyButton requireConfirm />
            <RotateSecretButton />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ExamplesCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {WEBHOOK_MESSAGES.examplesTitle}
        </CardTitle>
        <CardDescription>
          {WEBHOOK_MESSAGES.examplesDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="curl">
          <TabsList>
            <TabsTrigger value="curl">curl</TabsTrigger>
            <TabsTrigger value="node">Node.js</TabsTrigger>
            <TabsTrigger value="python">Python</TabsTrigger>
          </TabsList>
          <TabsContent value="curl">
            <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto">
              {CURL_EXAMPLE}
            </pre>
          </TabsContent>
          <TabsContent value="node">
            <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto">
              {NODE_EXAMPLE}
            </pre>
          </TabsContent>
          <TabsContent value="python">
            <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto">
              {PYTHON_EXAMPLE}
            </pre>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function LogsSkeletonRow({ mono = false }: { mono?: boolean }) {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-4 w-32" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-20 rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className={cn('h-4 w-28', mono && 'font-mono')} />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-10" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-40" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-48" />
      </TableCell>
    </TableRow>
  )
}

interface LogsCardProps {
  logs: WebhookLog[]
  loading?: boolean
}

function LogsCardTable({ logs, loading = false }: LogsCardProps) {
  return (
    <div className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[160px]">
              {WEBHOOK_MESSAGES.colReceivedAt}
            </TableHead>
            <TableHead className="w-[130px]">
              {WEBHOOK_MESSAGES.colSource}
            </TableHead>
            <TableHead className="w-[160px]">
              {WEBHOOK_MESSAGES.colEventId}
            </TableHead>
            <TableHead className="w-[72px]">
              {WEBHOOK_MESSAGES.colStatus}
            </TableHead>
            <TableHead>{WEBHOOK_MESSAGES.colError}</TableHead>
            <TableHead>{WEBHOOK_MESSAGES.colIssue}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <LogsSkeletonRow key={i} mono />
              ))
            : logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                    {formatDateTime(log.received_at)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {log.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {shortenEventId(log.event_id)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={log.http_status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.error_message ? (
                      <span className="inline-flex items-center gap-1 text-destructive">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {log.error_message}
                      </span>
                    ) : (
                      WEBHOOK_MESSAGES.none
                    )}
                  </TableCell>
                  <TableCell>
                    {log.issue_id && log.issue_title ? (
                      <a
                        href={`#/issues/${log.issue_id}`}
                        className="text-sm text-primary hover:underline truncate inline-block max-w-[280px]"
                        title={log.issue_title}
                      >
                        {log.issue_title}
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {WEBHOOK_MESSAGES.none}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  )
}

function LogsCardMobile({ logs, loading = false }: LogsCardProps) {
  return (
    <div className="md:hidden flex flex-col gap-2">
      {loading
        ? Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-md border border-border bg-card p-3 space-y-2"
            >
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))
        : logs.map((log) => (
            <div
              key={log.id}
              className="rounded-md border border-border bg-card p-3 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {formatDateTime(log.received_at)}
                </span>
                <StatusBadge status={log.http_status} />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="secondary" className="font-normal">
                  {log.source}
                </Badge>
                <span className="font-mono text-muted-foreground truncate">
                  {shortenEventId(log.event_id)}
                </span>
              </div>
              {log.error_message ? (
                <div className="inline-flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {log.error_message}
                </div>
              ) : log.issue_id && log.issue_title ? (
                <a
                  href={`#/issues/${log.issue_id}`}
                  className="block text-sm text-primary hover:underline truncate"
                >
                  {log.issue_title}
                </a>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {WEBHOOK_MESSAGES.none}
                </span>
              )}
            </div>
          ))}
    </div>
  )
}

function LogsCard({ logs, loading = false }: LogsCardProps) {
  const isEmpty = !loading && logs.length === 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {WEBHOOK_MESSAGES.logsTitle}
        </CardTitle>
        <CardDescription>{WEBHOOK_MESSAGES.logsDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <Inbox className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">
                {WEBHOOK_MESSAGES.logsEmpty}
              </p>
              <p className="text-xs text-muted-foreground">
                {WEBHOOK_MESSAGES.logsEmptyHint}
              </p>
            </div>
            <a
              href="#docs"
              className="text-sm text-primary hover:underline"
            >
              {WEBHOOK_MESSAGES.viewDocsArrow}
            </a>
          </div>
        ) : (
          <>
            <LogsCardTable logs={logs} loading={loading} />
            <LogsCardMobile logs={logs} loading={loading} />
          </>
        )}
      </CardContent>
    </Card>
  )
}

interface WebhookSettingsPageProps {
  /** 强制显示空态（EmptyLogs story） */
  emptyLogs?: boolean
  /** 强制显示 loading 骨架（Loading story） */
  loadingLogs?: boolean
}

function WebhookSettingsPage({
  emptyLogs = false,
  loadingLogs = false,
}: WebhookSettingsPageProps) {
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [secretMasked, setSecretMasked] = useState<string>(SECRET_MASKED)
  const [loading, setLoading] = useState<boolean>(!loadingLogs)

  useEffect(() => {
    if (loadingLogs) {
      // 保持 loading 状态：什么都不做（Loading story）
      setLoading(true)
      return
    }

    if (emptyLogs) {
      setLogs(EMPTY_LOGS)
      setSecretMasked(SECRET_MASKED)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch('/api/settings/webhooks/recent?limit=20')
        const json = (await res.json()) as {
          status_code: number
          data: { list: WebhookLog[]; secret_masked: string } | null
        }
        if (cancelled) return
        if (json.status_code === 0 && json.data) {
          setLogs(json.data.list)
          setSecretMasked(json.data.secret_masked)
        } else {
          setLogs(WEBHOOK_LOGS)
        }
      } catch {
        if (!cancelled) setLogs(WEBHOOK_LOGS)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [emptyLogs, loadingLogs])

  return (
    <AppShell activeNav="webhook" breadcrumb="设置 / Webhook">
      <div className="h-full overflow-hidden flex flex-col">
        <div
          className={cn(
            'flex-1 min-h-0 overflow-y-auto p-6 space-y-6',
            'max-w-4xl mx-auto w-full',
          )}
        >
          <IntroCard />
          <EndpointCard />
          <SecretCard secretMasked={secretMasked} />
          <ExamplesCard />
          <LogsCard logs={logs} loading={loading} />
        </div>
      </div>
    </AppShell>
  )
}

const meta: Meta<typeof WebhookSettingsPage> = {
  title: 'issue-management / Webhook 设置',
  component: WebhookSettingsPage,
  parameters: {
    layout: 'fullscreen',
    msw: { handlers: webhookSettingsHandlers },
    viewport: { defaultViewport: 'laptop' },
  },
}

export default meta

type Story = StoryObj<typeof WebhookSettingsPage>

export const v1: Story = {
  name: 'v1',
  tags: ['draft'],
  args: {},
}

export const EmptyLogs: Story = {
  name: 'EmptyLogs',
  tags: ['draft'],
  args: {
    emptyLogs: true,
  },
}

export const Loading: Story = {
  name: 'Loading',
  tags: ['draft'],
  args: {
    loadingLogs: true,
  },
}
