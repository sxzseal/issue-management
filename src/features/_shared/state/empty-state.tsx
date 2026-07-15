/**
 * 空状态 — 无数据时的通用展示
 */
import * as React from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  className?: string
  children?: React.ReactNode
  title?: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({
  title = '暂无数据',
  description,
  action,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[200px] flex-col items-center justify-center gap-2 px-4 py-8 text-center',
        className,
      )}
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {children}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
