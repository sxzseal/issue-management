/**
 * DeleteIssueModal — twice-confirm delete dialog (AC-059).
 *
 * v1 undo toast (5s) is deferred to /dev-review — declared as a deviation in
 * this task's receipt.
 */
import { useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import type { IssueDetailReturnTarget } from '../../lib/return-target'
import { useDeleteIssueMutation } from '../../mutations'

interface DeleteIssueModalProps {
  issueId: string
  returnTo: IssueDetailReturnTarget
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteIssueModal({
  issueId,
  returnTo,
  open,
  onOpenChange,
}: DeleteIssueModalProps) {
  const navigate = useNavigate()
  const del = useDeleteIssueMutation()

  const confirm = () => {
    del.mutate(issueId, {
      onSuccess: () => {
        onOpenChange(false)
        void navigate(
          { pathname: returnTo.pathname, search: returnTo.search },
          { replace: true },
        )
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认删除吗？</DialogTitle>
          <DialogDescription>此操作不可撤销</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={del.isPending}
          >
            取消
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={confirm}
            disabled={del.isPending}
          >
            {del.isPending ? '删除中…' : '删除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
