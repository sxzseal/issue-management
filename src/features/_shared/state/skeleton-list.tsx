/**
 * 骨架列表 — 用于列表数据加载中的占位
 */
import { cn } from '@/lib/utils'

interface SkeletonListProps {
  rows?: number
  className?: string
}

export function SkeletonList({ rows = 5, className }: SkeletonListProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  )
}
