/**
 * IssueTable — desktop / tablet table with sticky sortable headers and
 * fixed-width columns (AC-032/033/034). Rows navigate to /issue/:id via
 * click + keyboard (Enter/Space) to satisfy list<>link semantics without
 * putting an <a> inside a <tr>.
 */
import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import type { Issue } from '@/lib/api-types'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { ListParams, SortField } from '../types'
import type { ListParamActions } from '../use-list-params'
import { IssueTableRow } from './issue-table-row'

interface IssueTableProps {
  className?: string
  issues: Issue[]
  params: ListParams
  actions: ListParamActions
}

interface SortHeaderProps {
  field: SortField
  label: string
  params: ListParams
  onSortClick: (field: SortField) => void
  className?: string
}

function SortHeader({
  field,
  label,
  params,
  onSortClick,
  className,
}: SortHeaderProps) {
  const isActive = params.sort === field
  const ariaSort: 'ascending' | 'descending' | 'none' = isActive
    ? params.order === 'asc'
      ? 'ascending'
      : 'descending'
    : 'none'
  const Icon = !isActive
    ? ChevronsUpDown
    : params.order === 'asc'
      ? ChevronUp
      : ChevronDown
  return (
    <TableHead className={className} aria-sort={ariaSort}>
      <button
        type="button"
        onClick={() => onSortClick(field)}
        className={cn(
          'inline-flex items-center gap-1 text-xs font-medium transition-colors hover:text-foreground',
          isActive ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {label}
        <Icon className="h-3 w-3" aria-hidden />
      </button>
    </TableHead>
  )
}

export function IssueTable({
  className,
  issues,
  params,
  actions,
}: IssueTableProps) {
  const navigate = useNavigate()
  // Stable identity so memoized IssueTableRow doesn't re-render on unrelated
  // ListView state churn (search debounce, modal open/close).
  const handleRowActivate = useCallback(
    (id: string) => {
      void navigate(`/issue/${id}`)
    },
    [navigate],
  )

  return (
    <div
      className={cn('flex min-h-0 flex-1 flex-col overflow-hidden', className)}
    >
      <div className="flex-1 overflow-auto">
        <Table className="table-fixed">
          <TableHeader className="sticky top-0 z-20 bg-muted/50 shadow-[0_1px_0_0_hsl(var(--border))] [&_tr]:hover:bg-transparent">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[38%] text-xs font-medium text-muted-foreground">
                标题
              </TableHead>
              <TableHead className="w-[10%] text-xs font-medium text-muted-foreground">
                项目
              </TableHead>
              <TableHead className="w-[10%] text-xs font-medium text-muted-foreground">
                状态
              </TableHead>
              <SortHeader
                field="priority"
                label="优先级"
                params={params}
                onSortClick={actions.setSort}
                className="w-[8%]"
              />
              <TableHead className="hidden w-[16%] text-xs font-medium text-muted-foreground lg:table-cell">
                标签
              </TableHead>
              <SortHeader
                field="due_date"
                label="到期"
                params={params}
                onSortClick={actions.setSort}
                className="w-[10%]"
              />
              <SortHeader
                field="updated_at"
                label="更新时间"
                params={params}
                onSortClick={actions.setSort}
                className="hidden w-[12%] lg:table-cell"
              />
              <TableHead className="sticky right-0 z-30 w-[88px] bg-muted/50 pr-4 text-center text-xs font-medium text-muted-foreground shadow-[inset_1px_0_0_0_hsl(var(--border))]">
                操作
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {issues.map((issue) => (
              <IssueTableRow
                key={issue.id}
                issue={issue}
                onActivate={handleRowActivate}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
