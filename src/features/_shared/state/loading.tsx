/**
 * 通用加载态 — 旋转指示器 + 可选自定义文案
 */
import * as React from 'react'
import { cn } from '@/lib/utils'

interface LoadingProps {
  className?: string
  children?: React.ReactNode
}

export function Loading({ className, children }: LoadingProps) {
  return (
    <div
      className={cn(
        'flex min-h-[200px] flex-col items-center justify-center gap-3 text-muted-foreground',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
      {children ?? <span className="text-sm">加载中…</span>}
    </div>
  )
}
