/**
 * ListView — /list route body.
 *
 * Consumes T019's data layer (useListParams + listQueries.page). Route wiring
 * is T027. Layout follows AC-034: outer flex-col + overflow-hidden, sticky
 * thead inside a flex-1 min-h-0 scroll container, pagination pinned to bottom.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
  const { data, isPending, isError, refetch } = useQuery(
    listQueries.page(params),
  )
  const [creatingOpen, setCreatingOpen] = useState(false)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <FilterBar
        params={params}
        actions={actions}
        onCreateIssue={() => setCreatingOpen(true)}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {isPending ? (
          <SkeletonList rows={8} className="p-6" />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : data && data.list.length === 0 ? (
          <EmptyState title="没有匹配的 issue" description="试试调整筛选条件" />
        ) : data ? (
          <>
            <IssueTable
              className="hidden md:flex"
              issues={data.list}
              params={params}
              actions={actions}
            />
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 md:hidden">
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
          onPageSizeChange={(size) =>
            actions.setPageSize(size as 20 | 50 | 100)
          }
        />
      )}
      <CreateIssueModal
        open={creatingOpen}
        onOpenChange={setCreatingOpen}
        defaultProjectId={params.project_id}
      />
    </div>
  )
}
