/**
 * SecretCard — Shared secret 脱敏展示 + 复制/轮换按钮（AC-072 / AC-073）
 *
 * v1 局限：服务端仅在轮换时一次性返回明文 secret；此后客户端只能拿到脱敏形式，
 * 所以「复制」按钮打开的是信息提示 modal，实际的明文复制入口在轮换 modal 结果阶段。
 */
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Copy, RefreshCw } from 'lucide-react'

import { CopySecretModal } from './dialogs/copy-secret.modal'
import { RotateSecretModal } from './dialogs/rotate-secret.modal'

interface SecretCardProps {
  maskedSecret: string
}

export function SecretCard({ maskedSecret }: SecretCardProps) {
  const [copyOpen, setCopyOpen] = useState<boolean>(false)
  const [rotateOpen, setRotateOpen] = useState<boolean>(false)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shared Secret</CardTitle>
          <CardDescription>用于 HMAC-SHA256 签名请求 body</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code
              className={cn(
                'min-w-0 flex-1 rounded-md border border-input bg-muted px-3 py-2',
                'overflow-x-auto whitespace-nowrap font-mono text-xs text-muted-foreground'
              )}
            >
              {maskedSecret}
            </code>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setCopyOpen(true)}
              >
                <Copy className="h-3.5 w-3.5" />
                复制
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="gap-1.5"
                onClick={() => setRotateOpen(true)}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                轮换 secret
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <CopySecretModal
        open={copyOpen}
        onOpenChange={setCopyOpen}
        onRotate={() => setRotateOpen(true)}
      />
      <RotateSecretModal open={rotateOpen} onOpenChange={setRotateOpen} />
    </>
  )
}
