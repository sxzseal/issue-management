/**
 * Status select sheet — bottom sheet with 4 large tap targets (todo / in_progress / done / archived).
 * Announces status transitions via aria-live (AC-024).
 */
import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { Issue, IssueStatus } from '@/lib/api-types'
import { BOARD_COLUMNS, BOARD_COLUMN_LABELS } from '../../types'
import { STATUS_ICON, STATUS_ICON_CLASS } from '../../status-visuals'
import { useUpdateIssueStatusMutation } from '../../mutations'

interface StatusSelectSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  issue?: Issue
}

export function StatusSelectSheet({
  open,
  onOpenChange,
  issue,
}: StatusSelectSheetProps) {
  const mutation = useUpdateIssueStatusMutation()
  const [announcement, setAnnouncement] = useState<string>('')

  useEffect(() => {
    if (!open) setAnnouncement('')
  }, [open])

  const handleSelect = (next: IssueStatus) => {
    if (!issue || next === issue.status) {
      onOpenChange(false)
      return
    }
    const fromLabel = BOARD_COLUMN_LABELS[issue.status]
    const toLabel = BOARD_COLUMN_LABELS[next]
    mutation.mutate({ id: issue.id, status: next })
    setAnnouncement(`issue #${issue.id} 已从 ${fromLabel} 移到 ${toLabel}`)
    onOpenChange(false)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[80vh]">
          <SheetHeader>
            <SheetTitle>选择新状态</SheetTitle>
            <SheetDescription>
              {issue ? issue.title : '选择一张卡片以变更状态'}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {BOARD_COLUMNS.map((status) => {
              const Icon = STATUS_ICON[status]
              const isCurrent = issue?.status === status
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleSelect(status)}
                  disabled={!issue}
                  aria-current={isCurrent ? 'true' : undefined}
                  className={cn(
                    'flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-md border border-border bg-card px-4 py-3 text-sm',
                    'transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    isCurrent && 'border-primary bg-primary/5',
                  )}
                >
                  <Icon
                    className={cn('h-5 w-5', STATUS_ICON_CLASS[status])}
                    aria-hidden
                  />
                  <span>{BOARD_COLUMN_LABELS[status]}</span>
                </button>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
    </>
  )
}
