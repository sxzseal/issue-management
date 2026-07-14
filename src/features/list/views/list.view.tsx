/**
 * ListView — /list route body.
 *
 * Consumes T019's data layer (useListParams + listQueries.page). Route wiring
 * is T027. Layout follows AC-034: outer flex-col + overflow-hidden, sticky
 * thead inside a flex-1 min-h-0 scroll container, pagination pinned to bottom.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, SkeletonList } from '@/features/_shared/state'
import { Pagination } from '@/features/_shared/page'
import { CreateIssueModal } from '@/features/board/views/dialogs/create-issue.modal'
import { listQueries } from '../queries'
import { useListParams } from '../use-list-params'
import { FilterBar } from './filter-bar'
import { IssueTable } from './issue-table'
import { IssueCardMobile } from './issue-card-mobile'

export function ListView() {
  const [params, actions] = useListParams()
  const { data, isPending, isError, refetch } = useQuery(listQueries.page(params))
  const [creatingOpen, setCreatingOpen] = useState(false)

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <FilterBar params={params} actions={actions} onCreateIssue={() => setCreatingOpen(true)} />
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {isPending ? (
          <SkeletonList rows={8} className="p-6" />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : data && data.list.length === 0 ? (
          <EmptyState
            title="没有匹配的 issue"
            description="试试调整筛选条件或清除全部"
            action={
              <Button variant="outline" size="sm" onClick={actions.clear}>
                清除全部筛选
              </Button>
            }
          />
        ) : data ? (
          <>
            <IssueTable
              className="hidden md:flex"
              issues={data.list}
              params={params}
              actions={actions}
            />
            <div className="md:hidden flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
              {data.list.map((issue) => (
                <IssueCardMobile key={issue.id} issue={issue} />
              ))}
            </div>
          </>
        ) : null}
      </div>
      {data && data.total > 0 && (
        <Pagination
          total={data.total}
          page={data.page}
          pageSize={data.page_size}
          onPageChange={actions.setPage}
          onPageSizeChange={(size) => actions.setPageSize(size as 20 | 50 | 100)}
        />
      )}
      <CreateIssueModal open={creatingOpen} onOpenChange={setCreatingOpen} />
    </div>
  )
}
