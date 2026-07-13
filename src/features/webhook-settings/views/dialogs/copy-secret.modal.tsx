/**
 * CopySecretModal — 「复制 secret」二次确认对话框（AC-072 变体）
 *
 * 由于 v1 服务端仅在轮换时一次性返回明文，客户端后续只能拿到脱敏形式；
 * 「复制」按钮点击后弹出的这个 modal 只作信息提示：如需明文，请轮换 secret。
 * 用户可从此 modal 直接进入轮换流程（`onRotate` 回调）。
 */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

interface CopySecretModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRotate: () => void
}

export function CopySecretModal({ open, onOpenChange, onRotate }: CopySecretModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>复制 Secret</DialogTitle>
          <DialogDescription>
            出于安全考虑，Secret 明文仅在轮换时一次性可见。要复制新的明文
            Secret，请点击「轮换 secret」。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="destructive"
            className="gap-1.5"
            onClick={() => {
              onOpenChange(false)
              onRotate()
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            轮换 secret
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
