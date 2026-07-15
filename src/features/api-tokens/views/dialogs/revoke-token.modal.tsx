/**
 * RevokeTokenModal — 撤销确认对话框
 *
 * 撤销是软删除（服务端置 revoked_at），列表里仍然可见但不可用。文案强调
 * 「所有用它调用的脚本会立即 401」。
 */
import { Loader2, Ban } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useRevokeApiTokenMutation } from '../../mutations'

interface RevokeTokenModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tokenId: string | null
  tokenName: string | null
}

export function RevokeTokenModal({ open, onOpenChange, tokenId, tokenName }: RevokeTokenModalProps) {
  const mutation = useRevokeApiTokenMutation()

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
          <DialogTitle>确定要撤销「{tokenName ?? '此 Token'}」？</DialogTitle>
          <DialogDescription>
            撤销后所有携带此 Token 的请求都会立即返回 401；操作不可撤回。
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
              <Ban className="h-3.5 w-3.5" />
            )}
            撤销
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
