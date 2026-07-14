/**
 * 分页控件 — 显示总数、每页大小切换与页码导航
 */
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface PaginationProps {
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
  className?: string
}

const DEFAULT_PAGE_SIZE_OPTIONS = [20, 50, 100]

export function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  className,
}: PaginationProps) {
  const lastPage = Math.max(1, Math.ceil(total / Math.max(1, pageSize)))
  // Clamp the incoming page so a stale value (e.g. filter shrank `total`) can't
  // leave Prev/Next in an inconsistent state or show "第 5 / 1 页".
  const safePage = Math.min(Math.max(1, page), lastPage)
  const isFirst = safePage <= 1
  const isLast = safePage >= lastPage

  return (
    <div
      className={cn(
        'flex flex-none items-center justify-between gap-2 border-t border-border bg-background px-6 py-3 text-sm text-foreground',
        className
      )}
    >
      <div className="text-muted-foreground">共 {total} 条</div>
      <div className="flex items-center gap-3">
        {onPageSizeChange ? (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">每页</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => onPageSizeChange(Number(v))}
            >
              <SelectTrigger className="h-9 w-[80px]" aria-label="每页数量">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label="首页"
            disabled={isFirst}
            onClick={() => onPageChange(1)}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="上一页"
            disabled={isFirst}
            onClick={() => onPageChange(safePage - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="mx-2 whitespace-nowrap text-muted-foreground">
            第 {safePage} / {lastPage} 页
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label="下一页"
            disabled={isLast}
            onClick={() => onPageChange(safePage + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="末页"
            disabled={isLast}
            onClick={() => onPageChange(lastPage)}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
