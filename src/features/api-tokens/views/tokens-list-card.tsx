/**
 * TokensListCard — 已发放 Token 列表
 *
 * 桌面端 Table：名称 / 前缀 / 创建时间 / 上次使用 / 状态 / 操作
 * 移动端（<md）：卡片流
 * 删除：硬删除，行从库中移除，Token 立即失效。
 */
import { useState } from 'react'
import { Trash2 } from 'lucide-react'

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { ApiToken } from '@/lib/api-types'
import { DeleteTokenModal } from './dialogs/delete-token.modal'

const NEVER = '从未使用'

function formatDateTime(iso: string | null): string {
  if (!iso) return NEVER
  const d = new Date(iso)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
  )
}

function StatusBadge({ revoked }: { revoked: boolean }) {
  return revoked ? (
    <Badge
      variant="outline"
      className="whitespace-nowrap border-transparent bg-muted text-muted-foreground"
    >
      已撤销
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="whitespace-nowrap border-transparent bg-[hsl(var(--feedback-success)/0.15)] text-[hsl(var(--feedback-success))]"
    >
      有效
    </Badge>
  )
}

interface TokensListCardProps {
  tokens: ApiToken[]
}

export function TokensListCard({ tokens }: TokensListCardProps) {
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    name: string
  } | null>(null)
  const isEmpty = tokens.length === 0

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">已发放的 Token</CardTitle>
          <CardDescription>删除后 Token 立即失效，操作不可撤回</CardDescription>
        </CardHeader>
        <CardContent>
          {isEmpty ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              还没有 Token —— 在上方创建一个
            </p>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名称</TableHead>
                      <TableHead className="w-[200px]">前缀</TableHead>
                      <TableHead className="w-[160px]">创建</TableHead>
                      <TableHead className="w-[160px]">上次使用</TableHead>
                      <TableHead className="w-[92px]">状态</TableHead>
                      <TableHead className="w-[100px] text-right">
                        操作
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tokens.map((t) => {
                      const revoked = t.revoked_at !== null
                      return (
                        <TableRow
                          key={t.id}
                          className={cn(revoked && 'opacity-60')}
                        >
                          <TableCell className="max-w-[240px] truncate font-medium">
                            {t.name}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {t.prefix}
                            <span className="text-muted-foreground/60">
                              •••
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground">
                            {formatDateTime(t.created_at)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground">
                            {formatDateTime(t.last_used_at)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge revoked={revoked} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() =>
                                setDeleteTarget({ id: t.id, name: t.name })
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              删除
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile */}
              <div className="flex flex-col gap-2 md:hidden">
                {tokens.map((t) => {
                  const revoked = t.revoked_at !== null
                  return (
                    <div
                      key={t.id}
                      className={cn(
                        'space-y-1.5 rounded-md border border-border bg-card p-3',
                        revoked && 'opacity-60',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-sm font-medium">
                          {t.name}
                        </span>
                        <StatusBadge revoked={revoked} />
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {t.prefix}
                        <span className="text-muted-foreground/60">•••</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                        <div>创建 {formatDateTime(t.created_at)}</div>
                        <div>上次 {formatDateTime(t.last_used_at)}</div>
                      </div>
                      <div className="pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full gap-1.5 text-destructive"
                          onClick={() =>
                            setDeleteTarget({ id: t.id, name: t.name })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          删除
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <DeleteTokenModal
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        tokenId={deleteTarget?.id ?? null}
        tokenName={deleteTarget?.name ?? null}
      />
    </>
  )
}
