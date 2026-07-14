/**
 * BoardView — root routable component for /board.
 * Composes header, 4 status columns, quick-create modal, and status select sheet.
 * Global `N` key opens the create modal (AC-011).
 */
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorState, Loading } from '@/features/_shared/state'
import type { Issue, IssueStatus } from '@/lib/api-types'

import { boardQueries } from '../queries'
import { BoardColumn } from './board-column'
import { CreateIssueModal } from './dialogs/create-issue.modal'
import { StatusSelectSheet } from './dialogs/status-select.sheet'

interface CreatingState {
  open: boolean
  defaultStatus?: IssueStatus
}

interface StatusSheetState {
  open: boolean
  issue?: Issue
}

export function BoardView() {
  const { data, isPending, isError, refetch } = useQuery(boardQueries.overview())
  const [searchParams, setSearchParams] = useSearchParams()
  const [creating, setCreating] = useState<CreatingState>({ open: false })
  const [statusSheet, setStatusSheet] = useState<StatusSheetState>({ open: false })

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setCreating({ open: true })
      const next = new URLSearchParams(searchParams)
      next.delete('new')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== 'n') return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (
        target &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
      ) {
        return
      }
      event.preventDefault()
      setCreating({ open: true })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleColumnCreate = (status: IssueStatus) => {
    setCreating({ open: true, defaultStatus: status })
  }

  const handleOpenStatus = (issue: Issue) => {
    setStatusSheet({ open: true, issue })
  }

  const handleCreatingOpenChange = (open: boolean) => {
    setCreating((prev) => (open ? { ...prev, open: true } : { open: false }))
  }

  const handleStatusOpenChange = (open: boolean) => {
    setStatusSheet((prev) => (open ? { ...prev, open: true } : { open: false }))
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <header className="flex flex-none items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">issue总览</h1>
          {data ? (
            <Badge variant="outline" className="h-6 gap-1 font-normal">
              共 {data.total} 条
            </Badge>
          ) : null}
        </div>
        <Button onClick={() => setCreating({ open: true })}>
          <Plus className="mr-1 h-4 w-4" />
          新建issue
        </Button>
      </header>

      {isPending ? (
        <div className="flex-1 min-h-0">
          <Loading />
        </div>
      ) : isError ? (
        <div className="flex-1 min-h-0">
          <ErrorState onRetry={() => void refetch()} />
        </div>
      ) : (
        <div
          className={
            'flex-1 min-h-0 overflow-x-auto overflow-y-hidden ' +
            'flex snap-x snap-mandatory gap-4 p-4 ' +
            'md:grid md:grid-cols-4 md:gap-4 md:overflow-x-hidden md:overflow-y-hidden md:p-6 md:snap-none'
          }
        >
          {data.columns.map((column) => (
            <div
              key={column.status}
              className="flex min-w-[280px] flex-1 snap-start flex-col min-h-0 md:min-w-0"
            >
              <BoardColumn
                column={column}
                onCreate={handleColumnCreate}
                onOpenStatus={handleOpenStatus}
              />
            </div>
          ))}
        </div>
      )}

      <CreateIssueModal
        open={creating.open}
        onOpenChange={handleCreatingOpenChange}
        defaultStatus={creating.defaultStatus}
      />
      <StatusSelectSheet
        open={statusSheet.open}
        onOpenChange={handleStatusOpenChange}
        issue={statusSheet.issue}
      />
    </div>
  )
}
