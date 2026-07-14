/**
 * RotateSecretModal — 轮换 webhook secret 两阶段对话框（AC-073）
 *
 * Phase 1 (confirm): 危险色确认，说明轮换后旧 secret 失效
 * Phase 2 (result): mutation 成功后一次性显示新 secret 明文 + 复制按钮
 *
 * 关闭时重置内部状态：新 secret 不缓存到组件外部。
 */
import { useEffect, useState } from 'react'
import { Check, Copy, Loader2, RefreshCw } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { useRotateWebhookSecretMutation } from '../../mutations'

interface RotateSecretModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Phase = 'confirm' | 'result'

export function RotateSecretModal({ open, onOpenChange }: RotateSecretModalProps) {
  const [phase, setPhase] = useState<Phase>('confirm')
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const { copied, copy } = useCopyToClipboard()
  const mutation = useRotateWebhookSecretMutation()

  useEffect(() => {
    if (!open) {
      setPhase('confirm')
      setNewSecret(null)
    }
  }, [open])

  const handleConfirm = async (): Promise<void> => {
    try {
      const res = await mutation.mutateAsync()
      setNewSecret(res.secret)
      setPhase('result')
    } catch {
      // toast 已由 mutation.onError 弹出；保持在 confirm 阶段允许重试
    }
  }

  const handleCopy = (): void => {
    if (!newSecret) return
    void copy(newSecret, '已复制 Secret')
  }

  const handleClose = (): void => onOpenChange(false)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // 轮换进行中不允许关闭；已进入 result 阶段允许关闭
        if (mutation.isPending) return
        onOpenChange(next)
      }}
    >
      <DialogContent>
        {phase === 'confirm' ? (
          <>
            <DialogHeader>
              <DialogTitle>确定要轮换 secret？</DialogTitle>
              <DialogDescription>
                轮换后旧 Secret 立即失效，所有对接系统需要更新配置。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={handleClose}
                disabled={mutation.isPending}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                className="gap-1.5"
                onClick={handleConfirm}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                立即轮换
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>新 Secret 已生成</DialogTitle>
              <DialogDescription>
                <span className="text-destructive">
                  此 Secret 只显示一次，请立即保存到你的密钥管理系统。
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <code
                className={cn(
                  'min-w-0 flex-1 rounded-md border border-input bg-muted px-3 py-2',
                  'overflow-x-auto whitespace-nowrap font-mono text-xs text-foreground'
                )}
              >
                {newSecret}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-1.5"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? '已复制' : '复制'}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>已保存</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
