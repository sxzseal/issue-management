/**
 * 通用页头 — 顶部标题栏原语，供 feature 页面组合使用
 */
import * as React from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: React.ReactNode
  description?: React.ReactNode
  breadcrumb?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-none items-start justify-between gap-4 border-b border-border bg-background px-6 py-4',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        {breadcrumb ? (
          <div className="text-xs text-muted-foreground">{breadcrumb}</div>
        ) : null}
        <h1 className="truncate text-xl font-semibold text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-none items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}
