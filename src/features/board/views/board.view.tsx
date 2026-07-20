/**
 * BoardView — root routable component for /board.
 * Composes header, 4 status columns, quick-create modal, and status select sheet.
 * Global `N` key opens the create modal (AC-011).
 */
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronDown, Plus } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ErrorState, Loading } from '@/features/_shared/state'
import { projectsQueryOptions } from '@/features/projects/queries'
import { cn } from '@/lib/utils'
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
  const [searchParams, setSearchParams] = useSearchParams()
  const projectId = searchParams.get('project_id') ?? undefined
  const { data, isPending, isError, refetch } = useQuery(
    boardQueries.overview({ project_id: projectId }),
  )
  const { data: projects } = useQuery(projectsQueryOptions)
  const activeProject = useMemo(
    () => projects?.find((p) => p.id === projectId),
    [projects, projectId],
  )
  const [creating, setCreating] = useState<CreatingState>({ open: false })
  const [statusSheet, setStatusSheet] = useState<StatusSheetState>({
    open: false,
  })

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
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
          target.isContentEditable)
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

  const setProject = (id: string | undefined) => {
    const next = new URLSearchParams(searchParams)
    if (id) next.set('project_id', id)
    else next.delete('project_id')
    setSearchParams(next, { replace: true })
  }

  const projectLabel = activeProject
    ? `项目：${activeProject.name}`
    : '全部项目'

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex flex-none items-center justify-between gap-3 border-b border-border px-6 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="text-lg font-semibold">issue总览</h1>
          {data ? (
            <Badge variant="outline" className="h-6 gap-1 font-normal">
              共 {data.total} 条
            </Badge>
          ) : null}
          {projects && projects.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-8 gap-1.5',
                    activeProject &&
                      'border-primary/60 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary',
                  )}
                  aria-label="按项目筛选"
                >
                  {activeProject ? (
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: activeProject.color }}
                    />
                  ) : null}
                  <span className="max-w-[10rem] truncate">{projectLabel}</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[12rem]">
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    setProject(undefined)
                  }}
                  className="justify-between"
                >
                  <span>全部项目</span>
                  {!activeProject ? (
                    <Check className="h-4 w-4 shrink-0" aria-hidden />
                  ) : null}
                </DropdownMenuItem>
                {projects.map((p) => {
                  const selected = projectId === p.id
                  return (
                    <DropdownMenuItem
                      key={p.id}
                      onSelect={(e) => {
                        e.preventDefault()
                        setProject(selected ? undefined : p.id)
                      }}
                      className="justify-between"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          aria-hidden
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        <span className="truncate">{p.name}</span>
                      </span>
                      {selected ? (
                        <Check className="h-4 w-4 shrink-0" aria-hidden />
                      ) : null}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
        <Button onClick={() => setCreating({ open: true })}>
          <Plus className="mr-1 h-4 w-4" />
          新建issue
        </Button>
      </header>

      {isPending ? (
        <div className="min-h-0 flex-1">
          <Loading />
        </div>
      ) : isError ? (
        <div className="min-h-0 flex-1">
          <ErrorState onRetry={() => void refetch()} />
        </div>
      ) : (
        <div
          className={
            'min-h-0 flex-1 overflow-x-auto overflow-y-hidden ' +
            'flex snap-x snap-mandatory gap-4 p-4' +
            'md:grid md:snap-none md:grid-cols-4 md:gap-4 md:overflow-x-hidden md:overflow-y-hidden md:p-6'
          }
        >
          {data.columns.map((column) => (
            <div
              key={column.status}
              className="flex min-h-0 min-w-[280px] flex-1 snap-start flex-col md:min-w-0"
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
