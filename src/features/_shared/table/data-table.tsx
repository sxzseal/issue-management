/**
 * DataTable — 基于 @tanstack/react-table 的通用表格封装
 * - 服务端排序（manualSorting: true）
 * - sticky 表头
 * - 支持 loading / empty 状态、行点击、列级截断
 */
import * as React from 'react'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState, SkeletonList } from '@/features/_shared/state'
import { cn } from '@/lib/utils'

export type SortableColumnMeta = { truncate?: boolean }

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  sorting?: SortingState
  onSortingChange?: (
    updater: SortingState | ((prev: SortingState) => SortingState),
  ) => void
  emptyState?: React.ReactNode
  loading?: boolean
  className?: string
  onRowClick?: (row: TData) => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  sorting,
  onSortingChange,
  emptyState,
  loading,
  className,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable<TData>({
    data,
    columns,
    state: sorting ? { sorting } : undefined,
    onSortingChange: onSortingChange
      ? (updater) => {
          const next =
            typeof updater === 'function'
              ? (updater as (prev: SortingState) => SortingState)(sorting ?? [])
              : updater
          onSortingChange(next)
        }
      : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true,
  })

  const rowModel = table.getRowModel()
  const hasRows = rowModel.rows.length > 0

  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background',
        className,
      )}
    >
      <div className="min-h-0 flex-1 overflow-auto">
        <Table className="table-fixed">
          <TableHeader className="sticky top-0 z-20 bg-background">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sortDir = header.column.getIsSorted()
                  const ariaSort: 'ascending' | 'descending' | 'none' =
                    sortDir === 'asc'
                      ? 'ascending'
                      : sortDir === 'desc'
                        ? 'descending'
                        : 'none'
                  const SortIcon =
                    sortDir === 'asc'
                      ? ChevronUp
                      : sortDir === 'desc'
                        ? ChevronDown
                        : ChevronsUpDown

                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={canSort ? ariaSort : undefined}
                      style={{
                        width:
                          header.getSize() !== 150
                            ? header.getSize()
                            : undefined,
                      }}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            'inline-flex items-center gap-1 rounded text-left font-medium text-muted-foreground transition-colors hover:text-foreground',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          )}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          <SortIcon
                            className="h-3.5 w-3.5 opacity-70"
                            aria-hidden
                          />
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-4">
                  <SkeletonList rows={8} />
                </TableCell>
              </TableRow>
            ) : !hasRows ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-0">
                  {emptyState ?? <EmptyState />}
                </TableCell>
              </TableRow>
            ) : (
              rowModel.rows.map((row) => {
                const clickable = Boolean(onRowClick)
                const handleClick = clickable
                  ? () => onRowClick?.(row.original)
                  : undefined
                const handleKeyDown = clickable
                  ? (event: React.KeyboardEvent<HTMLTableRowElement>) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onRowClick?.(row.original)
                      }
                    }
                  : undefined

                return (
                  <TableRow
                    key={row.id}
                    role={clickable ? 'button' : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    onClick={handleClick}
                    onKeyDown={handleKeyDown}
                    className={cn(
                      clickable && 'cursor-pointer hover:bg-muted/50',
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta as
                        SortableColumnMeta | undefined
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            'min-w-0',
                            meta?.truncate && 'truncate',
                          )}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
