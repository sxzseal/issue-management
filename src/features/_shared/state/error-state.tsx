/**
 * 错误态 — 异常兜底 + 可选重试按钮
 */
import * as React from 'react'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  className?: string
  children?: React.ReactNode
  title?: string
  description?: string
  onRetry?: () => void
}

export function ErrorState({
  title = '出错了',
  description = '请稍后重试或联系管理员',
  onRetry,
  className,
  children,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[200px] flex-col items-center justify-center gap-2 px-4 py-8 text-center',
        className,
      )}
      role="alert"
    >
      <p className="text-sm font-medium text-destructive">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
      {children}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-md border border-input bg-background px-3 py-1 text-xs hover:bg-accent"
        >
          重试
        </button>
      )}
    </div>
  )
}
