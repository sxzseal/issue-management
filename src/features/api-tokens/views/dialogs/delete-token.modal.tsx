/**
 * DeleteTokenModal — 永久删除确认对话框
 *
 * 删除是硬删除（服务端 DELETE FROM）。行会从列表中彻底消失，token 立即失效
 * (auth-guard 找不到行 → 401)。相较撤销，此操作丢弃审计记录。
 */
import { Loader2, Trash2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useDeleteApiTokenMutation } from '../../mutations'

interface DeleteTokenModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tokenId: string | null
  tokenName: string | null
}

export function DeleteTokenModal({
  open,
  onOpenChange,
  tokenId,
  tokenName,
}: DeleteTokenModalProps) {
  const mutation = useDeleteApiTokenMutation()

  const handleConfirm = async (): Promise<void> => {
    if (!tokenId) return
    try {
      await mutation.mutateAsync(tokenId)
      onOpenChange(false)
    } catch {
      // toast handled in mutation.onError
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (mutation.isPending) return
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确定要删除「{tokenName ?? '此 Token'}」？</DialogTitle>
          <DialogDescription>
            删除后 Token 将立即失效，所有携带此 Token 的请求都会返回
            401；操作不可撤回。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            取消
          </Button>
          <Button
            variant="destructive"
            className="gap-1.5"
            onClick={handleConfirm}
            disabled={mutation.isPending || !tokenId}
          >
            {mutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
