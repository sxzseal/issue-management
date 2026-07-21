/**
 * EditModeActions — right-side header button trio for the draft workflow.
 *
 * view mode: [编辑]
 * edit mode: [取消] [保存]
 *
 * Cancel with a dirty draft opens the same nav-guard dialog (reuse via
 * IssueDraftProvider), so users can never lose keystrokes by an accidental
 * click. Save is disabled when the draft has no diff vs remote.
 */
import { useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { useIssueDraft } from '../lib/issue-draft'

export function EditModeActions() {
  const { mode, dirty, saving, enterEdit, cancel, commit } = useIssueDraft()
  const [confirmCancel, setConfirmCancel] = useState<boolean>(false)

  if (mode === 'view') {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5"
        onClick={enterEdit}
      >
        <Pencil className="h-3.5 w-3.5" />
        <span>编辑</span>
      </Button>
    )
  }

  const handleCancelClick = () => {
    if (dirty) setConfirmCancel(true)
    else cancel()
  }
  const handleConfirmDiscard = () => {
    setConfirmCancel(false)
    cancel()
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5"
        onClick={handleCancelClick}
        disabled={saving}
      >
        <X className="h-3.5 w-3.5" />
        <span>取消</span>
      </Button>
      <Button
        size="sm"
        className="h-8 gap-1.5"
        onClick={() => void commit()}
        disabled={!dirty || saving}
      >
        <Check className="h-3.5 w-3.5" />
        <span>{saving ? '保存中…' : '保存'}</span>
      </Button>

      <Dialog
        open={confirmCancel}
        onOpenChange={(next) => {
          if (!next) setConfirmCancel(false)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>丢弃未保存的修改?</DialogTitle>
            <DialogDescription>
              你有尚未保存的改动,取消后无法恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCancel(false)}>
              继续编辑
            </Button>
            <Button variant="destructive" onClick={handleConfirmDiscard}>
              丢弃改动
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
