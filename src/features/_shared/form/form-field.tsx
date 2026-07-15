/**
 * 通用表单字段布局 — Label / 必填星号 / 错误文案
 *
 * 与 TanStack Form 或原生表单都兼容：
 *   - 配合 TanStack Form 时，用 formErrorText(field.state.meta) 获取错误
 *   - 配合原生表单时，直接传 error: string 即可
 */
import * as React from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  label: React.ReactNode
  required?: boolean
  error?: string | null
  hint?: React.ReactNode
  htmlFor?: string
  className?: string
  children: React.ReactNode
}

export function FormField({
  label,
  required,
  error,
  hint,
  htmlFor,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor} className="text-sm">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}
